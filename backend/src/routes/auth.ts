import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { getAuth } from '../config/firebase';
import { getStripe } from '../config/stripe';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface RegisterRequest {
  idToken: string;
  email: string;
  name?: string;
  phone?: string;
}

interface LoginRequest {
  idToken: string;
}

router.post('/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken, email, name, phone } = req.body as RegisterRequest;

    if (!idToken || !email) {
      res.status(400).json({ error: 'idToken and email are required' });
      return;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const existingUser = await query('SELECT id FROM users WHERE firebase_uid = $1', [uid]);

    if (existingUser.rows.length > 0) {
      res.status(409).json({ error: 'User already registered' });
      return;
    }

    const stripe = getStripe();
    const stripeCustomer = await stripe.customers.create({
      email: email,
      name: name,
      metadata: {
        firebase_uid: uid,
      },
    });

    const userId = uuidv4();

    await query(
      `INSERT INTO users (id, firebase_uid, email, name, phone, stripe_customer_id)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, uid, email, name || null, phone || null, stripeCustomer.id]
    );

    res.status(201).json({
      userId: userId,
      email: email,
      name: name || null,
      phone: phone || null,
      stripeCustomerId: stripeCustomer.id,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

router.post('/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { idToken } = req.body as LoginRequest;

    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    const result = await query(
      `SELECT id, email, name, phone, stripe_customer_id, created_at, updated_at
       FROM users WHERE firebase_uid = $1`,
      [uid]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    res.status(200).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
});

// Alias usato dal frontend (POST /api/auth/social)
router.post('/social', async (req: Request, res: Response): Promise<void> => {
  return socialLoginHandler(req, res);
});

// Retrocompatibilità
router.post('/social-login', async (req: Request, res: Response): Promise<void> => {
  return socialLoginHandler(req, res);
});

async function socialLoginHandler(req: Request, res: Response): Promise<void> {
  try {
    const { idToken } = req.body as LoginRequest;

    if (!idToken) {
      res.status(400).json({ error: 'idToken is required' });
      return;
    }

    const auth = getAuth();
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const email = decodedToken.email;
    const name = decodedToken.name;

    let result = await query(
      `SELECT id, email, name, phone, stripe_customer_id, created_at, updated_at
       FROM users WHERE firebase_uid = $1`,
      [uid]
    );

    let user = result.rows[0];

    if (!user) {
      const stripe = getStripe();
      const stripeCustomer = await stripe.customers.create({
        email: email,
        name: name,
        metadata: {
          firebase_uid: uid,
        },
      });

      const userId = uuidv4();

      await query(
        `INSERT INTO users (id, firebase_uid, email, name, stripe_customer_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, uid, email, name || null, stripeCustomer.id]
      );

      user = {
        id: userId,
        email: email,
        name: name || null,
        phone: null,
        stripe_customer_id: stripeCustomer.id,
        created_at: new Date(),
        updated_at: new Date(),
      };
    }

    res.status(200).json({
      userId: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      isNewUser: !result.rows[0],
    });
  } catch (error) {
    console.error('Social login error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
}

export default router;
