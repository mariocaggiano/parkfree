import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

interface UpdateUserRequest {
  name?: string;
  phone?: string;
  email?: string;
}

router.get('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const result = await query(
      `SELECT id, email, name, phone, stripe_customer_id, created_at, updated_at
       FROM users WHERE firebase_uid = $1`,
      [req.user.uid]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

router.put('/me', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { name, phone, email } = req.body as UpdateUserRequest;

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramCount}`);
      values.push(email);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    values.push(req.user.uid);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE firebase_uid = $${paramCount}
       RETURNING id, email, name, phone, stripe_customer_id, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const user = result.rows[0];

    res.status(200).json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      stripeCustomerId: user.stripe_customer_id,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
