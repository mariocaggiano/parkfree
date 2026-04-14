import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query, getClient } from '../config/database';
import { getStripe } from '../config/stripe';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── Configurazione taglie ricarica ─────────────────────────────────────────

const MIN_TOPUP = parseFloat(process.env.WALLET_MIN_TOPUP || '5.00');
const MAX_TOPUP = parseFloat(process.env.WALLET_MAX_TOPUP || '500.00');
const BONUS_THRESHOLD = parseFloat(process.env.WALLET_BONUS_THRESHOLD || '20.00');
const BONUS_PCT_STANDARD = parseFloat(process.env.WALLET_BONUS_PERCENTAGE_STANDARD || '5') / 100;
const BONUS_THRESHOLD_HIGH = parseFloat(process.env.WALLET_BONUS_THRESHOLD_HIGH || '50.00');
const BONUS_PCT_HIGH = parseFloat(process.env.WALLET_BONUS_PERCENTAGE_HIGH || '7') / 100;

/** Calcola il bonus per una determinata ricarica */
function calculateBonus(amount: number): number {
  if (amount >= BONUS_THRESHOLD_HIGH) {
    return Math.round(amount * BONUS_PCT_HIGH * 100) / 100;
  }
  if (amount >= BONUS_THRESHOLD) {
    return Math.round(amount * BONUS_PCT_STANDARD * 100) / 100;
  }
  return 0;
}

// ─── GET /api/wallet/balance ─────────────────────────────────────────────────
// Restituisce saldo corrente + ultime 5 transazioni per il widget home

router.get('/balance', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const userResult = await query(
      'SELECT id, wallet_balance FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );
    if (userResult.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

    const { id: userId, wallet_balance } = userResult.rows[0];

    const txResult = await query(
      `SELECT id, type, amount, balance_after, description, session_id, created_at
       FROM wallet_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 5`,
      [userId]
    );

    res.status(200).json({
      balance: parseFloat(wallet_balance),
      recentTransactions: txResult.rows.map(mapTx),
    });
  } catch (err) {
    console.error('wallet balance error:', err);
    res.status(500).json({ error: 'Failed to fetch wallet balance' });
  }
});

// ─── GET /api/wallet/transactions ────────────────────────────────────────────
// Storico completo (paginato)

router.get('/transactions', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const page = Math.max(1, parseInt((req.query.page as string) || '1'));
    const limit = Math.min(50, Math.max(1, parseInt((req.query.limit as string) || '20')));
    const offset = (page - 1) * limit;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);
    if (userResult.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }
    const userId = userResult.rows[0].id;

    const [countResult, txResult] = await Promise.all([
      query('SELECT COUNT(*) as count FROM wallet_transactions WHERE user_id = $1', [userId]),
      query(
        `SELECT id, type, amount, balance_after, description, session_id, created_at
         FROM wallet_transactions
         WHERE user_id = $1
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [userId, limit, offset]
      ),
    ]);

    res.status(200).json({
      transactions: txResult.rows.map(mapTx),
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].count),
        pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
      },
    });
  } catch (err) {
    console.error('wallet transactions error:', err);
    res.status(500).json({ error: 'Failed to fetch transactions' });
  }
});

// ─── POST /api/wallet/topup ───────────────────────────────────────────────────
// Crea un PaymentIntent Stripe per ricaricare il wallet.
// Il saldo viene accreditato SOLO dopo conferma via webhook.

router.post('/topup', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) { res.status(401).json({ error: 'Unauthorized' }); return; }

    const amount = parseFloat(req.body.amount);
    if (!amount || isNaN(amount) || amount < MIN_TOPUP) {
      res.status(400).json({ error: `Il minimo di ricarica è €${MIN_TOPUP.toFixed(2)}` });
      return;
    }

    if (amount > MAX_TOPUP) {
      res.status(400).json({ error: `Il massimo di ricarica è €${MAX_TOPUP.toFixed(2)}` });
      return;
    }

    const amountRounded = Math.round(amount * 100) / 100;
    const bonus = calculateBonus(amountRounded);

    const userResult = await query(
      'SELECT id, stripe_customer_id FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );
    if (userResult.rows.length === 0) { res.status(404).json({ error: 'User not found' }); return; }

    const { id: userId, stripe_customer_id: stripeCustomerId } = userResult.rows[0];

    const stripe = getStripe();
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amountRounded * 100), // in centesimi
      currency: 'eur',
      customer: stripeCustomerId,
      payment_method_types: ['card'],
      metadata: {
        type: 'wallet_topup',
        userId,
        topupAmount: amountRounded.toString(),
        bonusAmount: bonus.toString(),
      },
      description: `ParkFree ricarica wallet €${amountRounded.toFixed(2)}`,
    });

    res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: amountRounded,
      bonus,
      totalCredit: Math.round((amountRounded + bonus) * 100) / 100,
    });
  } catch (err) {
    console.error('wallet topup error:', err);
    res.status(500).json({ error: 'Failed to create top-up' });
  }
});

// ─── POST /api/wallet/topup/confirm ──────────────────────────────────────────
// Chiamato dal webhook Stripe (payment_intent.succeeded) — NON esposto al client.
// Esportato come funzione per essere usato da payments/webhook.ts

export async function confirmWalletTopup(
  paymentIntentId: string,
  userId: string,
  topupAmount: number,
  bonusAmount: number
): Promise<void> {
  const totalCredit = Math.round((topupAmount + bonusAmount) * 100) / 100;

  // Usa una connessione dedicata dal pool per garantire atomicità BEGIN/COMMIT
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Aggiorna il saldo utente
    const updateResult = await client.query(
      `UPDATE users
       SET wallet_balance = wallet_balance + $1, updated_at = NOW()
       WHERE id = $2
       RETURNING wallet_balance`,
      [totalCredit, userId]
    );
    const newBalance = parseFloat(updateResult.rows[0].wallet_balance);

    // balance_after per la tx topup = saldo dopo il topup ma PRIMA del bonus
    const balanceAfterTopup = bonusAmount > 0
      ? Math.round((newBalance - bonusAmount) * 100) / 100
      : newBalance;

    // Registra la tx di ricarica
    await client.query(
      `INSERT INTO wallet_transactions
         (id, user_id, type, amount, balance_after, description, stripe_payment_intent_id)
       VALUES ($1, $2, 'topup', $3, $4, $5, $6)`,
      [
        uuidv4(), userId,
        topupAmount,
        balanceAfterTopup,
        `Ricarica wallet €${topupAmount.toFixed(2)}`,
        paymentIntentId,
      ]
    );

    // Registra eventuale tx bonus (balance_after = saldo finale con bonus incluso)
    if (bonusAmount > 0) {
      await client.query(
        `INSERT INTO wallet_transactions
           (id, user_id, type, amount, balance_after, description)
         VALUES ($1, $2, 'topup_bonus', $3, $4, $5)`,
        [
          uuidv4(), userId,
          bonusAmount,
          newBalance,
          `Bonus ricarica +${bonusAmount >= BONUS_THRESHOLD_HIGH
            ? (BONUS_PCT_HIGH * 100).toFixed(0)
            : (BONUS_PCT_STANDARD * 100).toFixed(0)}%`,
        ]
      );
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function mapTx(row: Record<string, unknown>) {
  return {
    id: row.id,
    type: row.type,
    amount: parseFloat(row.amount as string),
    balanceAfter: parseFloat(row.balance_after as string),
    description: row.description,
    sessionId: row.session_id,
    createdAt: row.created_at,
  };
}

export default router;
