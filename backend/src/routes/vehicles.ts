import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

interface CreateVehicleRequest {
  plate: string;
  name?: string;
  isDefault?: boolean;
}

interface UpdateVehicleRequest {
  name?: string;
  isDefault?: boolean;
  plate?: string;
}

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [
      req.user.uid,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      `SELECT id, user_id, plate, name, is_default, created_at, updated_at
       FROM vehicles WHERE user_id = $1 ORDER BY created_at DESC`,
      [userId]
    );

    const vehicles = result.rows.map((v) => ({
      id: v.id,
      userId: v.user_id,
      plate: v.plate,
      name: v.name,
      isDefault: v.is_default,
      createdAt: v.created_at,
      updatedAt: v.updated_at,
    }));

    res.status(200).json(vehicles);
  } catch (error) {
    console.error('Get vehicles error:', error);
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { plate, name, isDefault } = req.body as CreateVehicleRequest;

    if (!plate) {
      res.status(400).json({ error: 'Plate is required' });
      return;
    }

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [
      req.user.uid,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const existingVehicle = await query(
      'SELECT id FROM vehicles WHERE user_id = $1 AND plate = $2',
      [userId, plate]
    );

    if (existingVehicle.rows.length > 0) {
      res.status(409).json({ error: 'Vehicle with this plate already exists' });
      return;
    }

    if (isDefault) {
      await query('UPDATE vehicles SET is_default = false WHERE user_id = $1', [userId]);
    }

    const vehicleId = uuidv4();

    const result = await query(
      `INSERT INTO vehicles (id, user_id, plate, name, is_default)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, user_id, plate, name, is_default, created_at, updated_at`,
      [vehicleId, userId, plate, name || null, isDefault || false]
    );

    const vehicle = result.rows[0];

    res.status(201).json({
      id: vehicle.id,
      userId: vehicle.user_id,
      plate: vehicle.plate,
      name: vehicle.name,
      isDefault: vehicle.is_default,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
    });
  } catch (error) {
    console.error('Create vehicle error:', error);
    res.status(500).json({ error: 'Failed to create vehicle' });
  }
});

router.put('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;
    const { name, isDefault, plate } = req.body as UpdateVehicleRequest;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [
      req.user.uid,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const vehicleCheckResult = await query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [id, userId]
    );

    if (vehicleCheckResult.rows.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    if (isDefault) {
      await query('UPDATE vehicles SET is_default = false WHERE user_id = $1 AND id != $2', [
        userId,
        id,
      ]);
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }

    if (isDefault !== undefined) {
      updates.push(`is_default = $${paramCount}`);
      values.push(isDefault);
      paramCount++;
    }

    if (plate !== undefined) {
      updates.push(`plate = $${paramCount}`);
      values.push(plate);
      paramCount++;
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const idParamIdx = paramCount;
    values.push(id);
    paramCount++;
    const userIdParamIdx = paramCount;
    values.push(userId);

    const result = await query(
      `UPDATE vehicles SET ${updates.join(', ')}
       WHERE id = $${idParamIdx} AND user_id = $${userIdParamIdx}
       RETURNING id, user_id, plate, name, is_default, created_at, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const vehicle = result.rows[0];

    res.status(200).json({
      id: vehicle.id,
      userId: vehicle.user_id,
      plate: vehicle.plate,
      name: vehicle.name,
      isDefault: vehicle.is_default,
      createdAt: vehicle.created_at,
      updatedAt: vehicle.updated_at,
    });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Failed to update vehicle' });
  }
});

router.delete('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [
      req.user.uid,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      'DELETE FROM vehicles WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Delete vehicle error:', error);
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
