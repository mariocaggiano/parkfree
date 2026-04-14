import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query, getClient } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Genera un codice referral univoco dal nome utente + random
const generateReferralCode = (name: string): string => {
  const prefix = 'PARK';
  const namePart = (name || 'USER').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 5);
  const randomPart = Math.floor(Math.random() * 90 + 10).toString();
  return `${prefix}-${namePart}${randomPart}`;
};

// GET /api/referral/code  — restituisce il codice dell'utente (o lo crea)
router.get('/code', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;

    // Cerca codice esistente
    const existing = await query(
      `SELECT code FROM referral_codes WHERE user_id = (SELECT id FROM users WHERE firebase_uid = $1)`,
      [userId]
    );

    if (existing.rows.length > 0) {
      res.json({ code: existing.rows[0].code });
      return;
    }

    // Crea nuovo codice
    const userName = req.user!.name || 'USER';
    let code = generateReferralCode(userName);

    // Assicura unicità
    let attempts = 0;
    while (attempts < 5) {
      const clash = await query('SELECT id FROM referral_codes WHERE code = $1', [code]);
      if (clash.rows.length === 0) break;
      code = generateReferralCode(userName);
      attempts++;
    }

    await query(
      `INSERT INTO referral_codes (id, user_id, code)
       VALUES ($1, (SELECT id FROM users WHERE firebase_uid = $2), $3)`,
      [uuidv4(), userId, code]
    );

    res.json({ code });
  } catch (error) {
    console.error('Get referral code error:', error);
    res.status(500).json({ error: 'Failed to get referral code' });
  }
});

// GET /api/referral/stats  — statistiche complete
router.get('/stats', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = req.user!.uid;

    // Codice
    const codeRes = await query(
      `SELECT rc.code FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE u.firebase_uid = $1`,
      [userId]
    );

    if (codeRes.rows.length === 0) {
      // Auto-crea
      const createRes = await query(
        `SELECT id, name FROM users WHERE firebase_uid = $1`,
        [userId]
      );
      if (createRes.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }
      const code = generateReferralCode(createRes.rows[0].name || 'USER');
      await query(
        `INSERT INTO referral_codes (id, user_id, code) VALUES ($1, $2, $3)`,
        [uuidv4(), createRes.rows[0].id, code]
      );
    }

    const code = codeRes.rows[0]?.code || 'PARK-USER01';

    // Statistiche inviti
    const statsRes = await query(
      `SELECT
         COUNT(*) FILTER (WHERE status IN ('pending','completed')) AS invites_sent,
         COUNT(*) FILTER (WHERE status = 'completed') AS invites_accepted,
         COALESCE(SUM(referrer_credit) FILTER (WHERE status = 'completed'), 0) AS credits_earned
       FROM referrals r
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       JOIN users u ON u.id = rc.user_id
       WHERE u.firebase_uid = $1`,
      [userId]
    );

    // Crediti disponibili (non ancora usati in sessioni)
    const creditsRes = await query(
      `SELECT COALESCE(SUM(amount), 0) AS available
       FROM user_credits
       JOIN users ON users.id = user_credits.user_id
       WHERE users.firebase_uid = $1 AND used = false`,
      [userId]
    );

    // Storico
    const historyRes = await query(
      `SELECT
         r.id,
         u_invitee.name AS invitee_name,
         r.accepted_at,
         r.referrer_credit,
         r.status
       FROM referrals r
       JOIN referral_codes rc ON rc.id = r.referral_code_id
       JOIN users u_ref ON u_ref.id = rc.user_id
       JOIN users u_invitee ON u_invitee.id = r.invitee_user_id
       WHERE u_ref.firebase_uid = $1
       ORDER BY r.created_at DESC
       LIMIT 20`,
      [userId]
    );

    const s = statsRes.rows[0];
    res.json({
      code,
      invitesSent: parseInt(s.invites_sent),
      invitesAccepted: parseInt(s.invites_accepted),
      creditsEarned: parseFloat(s.credits_earned),
      creditsAvailable: parseFloat(creditsRes.rows[0].available),
      referralHistory: historyRes.rows.map((r) => ({
        id: r.id,
        inviteeName: r.invitee_name || 'Utente',
        acceptedAt: r.accepted_at,
        creditEarned: parseFloat(r.referrer_credit),
        status: r.status,
      })),
    });
  } catch (error) {
    console.error('Get referral stats error:', error);
    res.status(500).json({ error: 'Failed to get referral stats' });
  }
});

// POST /api/referral/apply  — applica un codice durante la registrazione
router.post('/apply', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  const client = await getClient();
  try {
    const { code } = req.body as { code: string };
    const inviteeFirebaseUid = req.user!.uid;

    if (!code || typeof code !== 'string') {
      res.status(400).json({ error: 'Codice referral mancante' });
      return;
    }

    const normalizedCode = code.trim().toUpperCase();

    // SEC-006: tutta la logica in una transazione atomica per prevenire race condition
    await client.query('BEGIN');

    // Trova il codice
    const codeRes = await client.query(
      `SELECT rc.id, rc.user_id, u.firebase_uid AS referrer_uid
       FROM referral_codes rc
       JOIN users u ON u.id = rc.user_id
       WHERE rc.code = $1`,
      [normalizedCode]
    );

    if (codeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Codice referral non valido' });
      return;
    }

    const { id: codeId, referrer_uid } = codeRes.rows[0];

    // Non si può usare il proprio codice
    if (referrer_uid === inviteeFirebaseUid) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Non puoi usare il tuo stesso codice referral' });
      return;
    }

    // Ottieni l'ID utente invitato
    const inviteeRes = await client.query(
      `SELECT id FROM users WHERE firebase_uid = $1`,
      [inviteeFirebaseUid]
    );

    if (inviteeRes.rows.length === 0) {
      await client.query('ROLLBACK');
      res.status(404).json({ error: 'Utente non trovato' });
      return;
    }

    const inviteeUserId = inviteeRes.rows[0].id;

    // Blocca la riga utente per prevenire race condition (FOR UPDATE)
    // e controlla che l'invitato non abbia già usato un codice
    const alreadyUsed = await client.query(
      `SELECT id FROM referrals WHERE invitee_user_id = $1 FOR UPDATE`,
      [inviteeUserId]
    );

    if (alreadyUsed.rows.length > 0) {
      await client.query('ROLLBACK');
      res.status(400).json({ error: 'Hai già usato un codice referral' });
      return;
    }

    // Crea il referral (stato pending — diventa completed alla prima sessione)
    await client.query(
      `INSERT INTO referrals (id, referral_code_id, invitee_user_id, referrer_credit, invitee_credit, status)
       VALUES ($1, $2, $3, 1.00, 1.00, 'pending')`,
      [uuidv4(), codeId, inviteeUserId]
    );

    // Credito immediato per l'invitato (sconto prima sessione)
    await client.query(
      `INSERT INTO user_credits (id, user_id, amount, reason, used)
       VALUES ($1, $2, 1.00, 'referral_invitee', false)`,
      [uuidv4(), inviteeUserId]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Codice applicato! Hai guadagnato 1,00 € di credito sulla prima sessione.',
      creditGranted: 1.00,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Apply referral code error:', error);
    res.status(500).json({ error: 'Failed to apply referral code' });
  } finally {
    client.release();
  }
});

export default router;
