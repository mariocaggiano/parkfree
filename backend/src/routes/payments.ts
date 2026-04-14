import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query } from '../config/database';
import { getStripe } from '../config/stripe';
import { confirmWalletTopup } from './wallet';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// ─── Stripe Webhook ───────────────────────────────────────────────────────────
// Nota: questo endpoint deve ricevere il body RAW (non JSON parsato).
// In index.ts, registralo PRIMA del middleware express.json().

router.post(
  '/webhook',
  async (req: Request, res: Response): Promise<void> => {
    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      // SEC-002: in produzione il secret è obbligatorio — fallire in modo sicuro
      if (process.env.NODE_ENV === 'production') {
        console.error('CRITICAL: STRIPE_WEBHOOK_SECRET not set in production — rejecting webhook');
        res.status(500).json({ error: 'Webhook not configured' });
        return;
      }
      // In sviluppo, accetta senza verifica (solo per testing locale)
      console.warn('STRIPE_WEBHOOK_SECRET not set — skipping webhook verification (dev only)');
      res.status(200).json({ received: true });
      return;
    }

    let event;
    try {
      const stripe = getStripe();
      // req.body è un Buffer grazie a express.raw() registrato in index.ts
      event = stripe.webhooks.constructEvent(req.body as Buffer, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      res.status(400).json({ error: 'Webhook signature invalid' });
      return;
    }

    try {
      if (event.type === 'payment_intent.succeeded') {
        const pi = event.data.object as { id: string; metadata: Record<string, string> };
        if (pi.metadata.type === 'wallet_topup') {
          // Idempotency check: se la tx esiste già, non riaccreditare
          const existing = await query(
            'SELECT id FROM wallet_transactions WHERE stripe_payment_intent_id = $1',
            [pi.id]
          );
          if (existing.rows.length === 0) {
            await confirmWalletTopup(
              pi.id,
              pi.metadata.userId,
              parseFloat(pi.metadata.topupAmount),
              parseFloat(pi.metadata.bonusAmount || '0')
            );
            console.log(`Wallet topped up for user ${pi.metadata.userId}: +€${pi.metadata.topupAmount}`);
          } else {
            console.log(`Webhook idempotency: topup ${pi.id} already processed, skipping`);
          }
        }
      }
      res.status(200).json({ received: true });
    } catch (err) {
      console.error('Webhook handler error:', err);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

interface CreatePaymentMethodRequest {
  paymentMethodId: string;
  isDefault?: boolean;
}

router.get('/methods', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      `SELECT id, stripe_pm_id, type, last_four, brand, is_default, created_at, updated_at
       FROM payment_methods
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at DESC`,
      [userId]
    );

    const paymentMethods = result.rows.map((pm) => ({
      id: pm.id,
      stripePmId: pm.stripe_pm_id,
      type: pm.type,
      lastFour: pm.last_four,
      brand: pm.brand,
      isDefault: pm.is_default,
      createdAt: pm.created_at,
      updatedAt: pm.updated_at,
    }));

    res.status(200).json(paymentMethods);
  } catch (error) {
    console.error('Get payment methods error:', error);
    res.status(500).json({ error: 'Failed to fetch payment methods' });
  }
});

router.post('/methods', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { paymentMethodId, isDefault } = req.body as CreatePaymentMethodRequest;

    if (!paymentMethodId) {
      res.status(400).json({ error: 'paymentMethodId is required' });
      return;
    }

    const userResult = await query(
      'SELECT id, stripe_customer_id FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;
    const stripeCustomerId = userResult.rows[0].stripe_customer_id;

    const stripe = getStripe();

    const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);

    if (paymentMethod.customer !== stripeCustomerId) {
      res.status(403).json({ error: 'Payment method does not belong to this customer' });
      return;
    }

    const existingPm = await query(
      'SELECT id FROM payment_methods WHERE user_id = $1 AND stripe_pm_id = $2',
      [userId, paymentMethodId]
    );

    if (existingPm.rows.length > 0) {
      res.status(409).json({ error: 'Payment method already added' });
      return;
    }

    if (isDefault) {
      await query('UPDATE payment_methods SET is_default = false WHERE user_id = $1', [userId]);
    }

    const pmId = uuidv4();
    const type = paymentMethod.type;
    const lastFour = paymentMethod.card?.last4 || paymentMethod.us_bank_account?.last4 || null;
    const brand = paymentMethod.card?.brand || null;

    const result = await query(
      `INSERT INTO payment_methods (id, user_id, stripe_pm_id, type, last_four, brand, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, stripe_pm_id, type, last_four, brand, is_default, created_at, updated_at`,
      [pmId, userId, paymentMethodId, type, lastFour, brand, isDefault || false]
    );

    const pm = result.rows[0];

    res.status(201).json({
      id: pm.id,
      stripePmId: pm.stripe_pm_id,
      type: pm.type,
      lastFour: pm.last_four,
      brand: pm.brand,
      isDefault: pm.is_default,
      createdAt: pm.created_at,
      updatedAt: pm.updated_at,
    });
  } catch (error) {
    console.error('Create payment method error:', error);
    res.status(500).json({ error: 'Failed to add payment method' });
  }
});

router.delete('/methods/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const pmResult = await query(
      'SELECT stripe_pm_id FROM payment_methods WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (pmResult.rows.length === 0) {
      res.status(404).json({ error: 'Payment method not found' });
      return;
    }

    const stripe = getStripe();
    await stripe.paymentMethods.detach(pmResult.rows[0].stripe_pm_id);

    await query('DELETE FROM payment_methods WHERE id = $1 AND user_id = $2', [id, userId]);

    res.status(204).send();
  } catch (error) {
    console.error('Delete payment method error:', error);
    res.status(500).json({ error: 'Failed to delete payment method' });
  }
});

router.post('/setup-intent', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userResult = await query(
      'SELECT id, stripe_customer_id FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const stripeCustomerId = userResult.rows[0].stripe_customer_id;

    const stripe = getStripe();

    const setupIntent = await stripe.setupIntents.create({
      customer: stripeCustomerId,
      payment_method_types: ['card'],
    });

    res.status(200).json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id,
    });
  } catch (error) {
    console.error('Setup intent error:', error);
    res.status(500).json({ error: 'Failed to create setup intent' });
  }
});

export default router;
