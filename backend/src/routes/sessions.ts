import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query, getClient } from '../config/database';
import {
  calculateParkingCost,
  calculateServiceFee,
  getZoneById,
  validateSessionDuration,
  getSessionById,
  calculateExtensionCost,
} from '../services/parking';
import {
  sendPaymentConfirmation,
  sendExtensionConfirmation,
  sendSessionComplete,
} from '../services/notifications';
import { v4 as uuidv4 } from 'uuid';

/**
 * Scala l'importo dal wallet dell'utente in modo atomico.
 * Restituisce il nuovo saldo o lancia un errore se il saldo è insufficiente.
 */
async function debitWallet(
  userId: string,
  amount: number,
  description: string,
  sessionId: string
): Promise<number> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    // Blocca la riga utente per evitare race condition
    const lockResult = await client.query(
      'SELECT wallet_balance FROM users WHERE id = $1 FOR UPDATE',
      [userId]
    );
    const currentBalance = parseFloat(lockResult.rows[0].wallet_balance);

    if (currentBalance < amount) {
      await client.query('ROLLBACK');
      throw new Error('INSUFFICIENT_BALANCE');
    }

    const updateResult = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance - $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
      [amount, userId]
    );
    const newBalance = parseFloat(updateResult.rows[0].wallet_balance);

    await client.query(
      `INSERT INTO wallet_transactions
         (id, user_id, type, amount, balance_after, description, session_id)
       VALUES ($1, $2, 'session_debit', $3, $4, $5, $6)`,
      [uuidv4(), userId, -amount, newBalance, description, sessionId]
    );

    await client.query('COMMIT');
    return newBalance;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Accredita un rimborso sul wallet (terminazione anticipata).
 */
async function refundWallet(
  userId: string,
  amount: number,
  description: string,
  sessionId: string
): Promise<void> {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const updateResult = await client.query(
      'UPDATE users SET wallet_balance = wallet_balance + $1, updated_at = NOW() WHERE id = $2 RETURNING wallet_balance',
      [amount, userId]
    );
    const newBalance = parseFloat(updateResult.rows[0].wallet_balance);

    await client.query(
      `INSERT INTO wallet_transactions
         (id, user_id, type, amount, balance_after, description, session_id)
       VALUES ($1, $2, 'session_refund', $3, $4, $5, $6)`,
      [uuidv4(), userId, amount, newBalance, description, sessionId]
    );

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

const router = Router();

interface StartSessionRequest {
  vehicleId: string;
  zoneId: string;
  durationMinutes: number;
}

interface ExtendSessionRequest {
  extensionMinutes: number;
}

interface PaginationQuery {
  page?: string;
  limit?: string;
}

router.post('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { vehicleId, zoneId, durationMinutes } =
      req.body as StartSessionRequest;

    if (!vehicleId || !zoneId || !durationMinutes) {
      res.status(400).json({ error: 'vehicleId, zoneId, and durationMinutes are required' });
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

    const vehicleResult = await query(
      'SELECT id FROM vehicles WHERE id = $1 AND user_id = $2',
      [vehicleId, userId]
    );

    if (vehicleResult.rows.length === 0) {
      res.status(404).json({ error: 'Vehicle not found' });
      return;
    }

    const zone = await getZoneById(zoneId);

    if (!zone) {
      res.status(404).json({ error: 'Zone not found' });
      return;
    }

    const durationValidation = validateSessionDuration(zone, durationMinutes);
    if (!durationValidation.valid) {
      res.status(400).json({ error: durationValidation.message });
      return;
    }

    // SEC-005: impedisce sessioni concorrenti per lo stesso veicolo
    const concurrentCheck = await query(
      `SELECT id FROM parking_sessions
       WHERE vehicle_id = $1
         AND status IN ('active', 'extended')
         AND planned_end_at > NOW()`,
      [vehicleId]
    );
    if (concurrentCheck.rows.length > 0) {
      res.status(409).json({
        error: 'Il veicolo ha già una sessione di parcheggio attiva',
        code: 'SESSION_ALREADY_ACTIVE',
        activeSessionId: concurrentCheck.rows[0].id,
      });
      return;
    }

    const parkingCost = calculateParkingCost(zone, durationMinutes);
    const serviceFee = calculateServiceFee(parkingCost);
    const totalCost = parkingCost + serviceFee;

    const now = new Date();
    const plannedEndAt = new Date(now.getTime() + durationMinutes * 60000);
    const sessionId = uuidv4();

    // Scala dal wallet — lancia INSUFFICIENT_BALANCE se il saldo è insufficiente
    try {
      await debitWallet(
        userId,
        totalCost,
        `Parcheggio ${zone.name} — ${durationMinutes} min`,
        sessionId
      );
    } catch (err) {
      if ((err as Error).message === 'INSUFFICIENT_BALANCE') {
        res.status(402).json({
          error: 'Saldo wallet insufficiente',
          code: 'INSUFFICIENT_BALANCE',
          required: totalCost,
        });
        return;
      }
      throw err;
    }

    await query(
      `INSERT INTO parking_sessions
       (id, user_id, vehicle_id, zone_id, started_at, planned_end_at, status, parking_cost, service_fee, total_cost)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [sessionId, userId, vehicleId, zoneId, now, plannedEndAt, 'active', parkingCost, serviceFee, totalCost]
    );

    await sendPaymentConfirmation(userId, sessionId, totalCost);

    res.status(201).json({
      sessionId,
      vehicleId,
      zoneId,
      startedAt: now,
      plannedEndAt,
      parkingCost,
      serviceFee,
      totalCost,
      paymentMethod: 'wallet',
    });
  } catch (error) {
    console.error('Start session error:', error);
    res.status(500).json({ error: 'Failed to start parking session' });
  }
});

router.put(
  '/:id/extend',
  authMiddleware,
  async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Unauthorized' });
        return;
      }

      const { id } = req.params;
      const { extensionMinutes } = req.body as ExtendSessionRequest;

      if (!extensionMinutes || extensionMinutes <= 0) {
        res.status(400).json({ error: 'extensionMinutes must be positive' });
        return;
      }

      const userResult = await query(
        'SELECT id FROM users WHERE firebase_uid = $1',
        [req.user.uid]
      );

      if (userResult.rows.length === 0) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const userId = userResult.rows[0].id;

      const session = await getSessionById(id);

      if (!session || session.user_id !== userId) {
        res.status(404).json({ error: 'Session not found' });
        return;
      }

      if (session.status !== 'active' && session.status !== 'extended') {
        res.status(400).json({ error: 'Can only extend active or previously extended sessions' });
        return;
      }

      const zone = await getZoneById(session.zone_id);

      if (!zone) {
        res.status(500).json({ error: 'Zone not found' });
        return;
      }

      const { parkingCost, serviceFee, totalCost } = calculateExtensionCost(
        zone,
        extensionMinutes
      );

      // Scala proroga dal wallet
      try {
        await debitWallet(
          userId,
          totalCost,
          `Proroga ${zone.name} — +${extensionMinutes} min`,
          id
        );
      } catch (err) {
        if ((err as Error).message === 'INSUFFICIENT_BALANCE') {
          res.status(402).json({
            error: 'Saldo wallet insufficiente per la proroga',
            code: 'INSUFFICIENT_BALANCE',
            required: totalCost,
          });
          return;
        }
        throw err;
      }

      const newPlannedEndAt = new Date(session.planned_end_at.getTime() + extensionMinutes * 60000);

      await query(
        `UPDATE parking_sessions
         SET planned_end_at = $1, status = $2, parking_cost = parking_cost + $3,
             service_fee = service_fee + $4, total_cost = total_cost + $5
         WHERE id = $6`,
        [newPlannedEndAt, 'extended', parkingCost, serviceFee, totalCost, id]
      );

      await sendExtensionConfirmation(userId, id, newPlannedEndAt, totalCost);

      res.status(200).json({
        sessionId: id,
        newPlannedEndAt,
        extensionCost: totalCost,
        paymentMethod: 'wallet',
      });
    } catch (error) {
      console.error('Extend session error:', error);
      res.status(500).json({ error: 'Failed to extend parking session' });
    }
  }
);

router.put('/:id/stop', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    const session = await getSessionById(id);

    if (!session || session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    if (session.status === 'completed' || session.status === 'cancelled') {
      res.status(400).json({ error: 'Session is already ended' });
      return;
    }

    const now = new Date();
    const actualDurationMinutes = Math.ceil(
      (now.getTime() - session.started_at.getTime()) / 60000
    );

    const zone = await getZoneById(session.zone_id);

    if (!zone) {
      res.status(500).json({ error: 'Zone not found' });
      return;
    }

    const actualParkingCost = calculateParkingCost(zone, actualDurationMinutes);
    const actualServiceFee = calculateServiceFee(actualParkingCost);
    const actualTotalCost = actualParkingCost + actualServiceFee;

    const refundAmount = Math.max(0, Math.round((session.total_cost - actualTotalCost) * 100) / 100);

    // Rimborsa la differenza sul wallet (nessuna transazione Stripe)
    if (refundAmount > 0) {
      try {
        await refundWallet(
          userId,
          refundAmount,
          `Rimborso terminazione anticipata — ${refundAmount.toFixed(2)}€`,
          id
        );
      } catch (refundErr) {
        console.error('Wallet refund error:', refundErr);
        // Non bloccare il completamento della sessione per un errore di rimborso
      }
    }

    await query(
      `UPDATE parking_sessions
       SET actual_end_at = $1, status = $2, parking_cost = $3, service_fee = $4, total_cost = $5
       WHERE id = $6`,
      [now, 'completed', actualParkingCost, actualServiceFee, actualTotalCost, id]
    );

    await sendSessionComplete(userId, id, actualTotalCost);

    res.status(200).json({
      sessionId: id,
      actualEndAt: now,
      actualDurationMinutes: actualDurationMinutes,
      actualParkingCost: actualParkingCost,
      actualServiceFee: actualServiceFee,
      actualTotalCost: actualTotalCost,
      refundAmount: refundAmount,
    });
  } catch (error) {
    console.error('Stop session error:', error);
    res.status(500).json({ error: 'Failed to stop parking session' });
  }
});

router.get('/', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { page, limit } = req.query as PaginationQuery;

    const pageNum = page ? Math.max(1, parseInt(page)) : 1;
    const pageSize = limit ? Math.max(1, Math.min(100, parseInt(limit))) : 10;
    const offset = (pageNum - 1) * pageSize;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const countResult = await query('SELECT COUNT(*) as count FROM parking_sessions WHERE user_id = $1', [
      userId,
    ]);

    const totalCount = parseInt(countResult.rows[0].count);

    const result = await query(
      `SELECT id, user_id, vehicle_id, zone_id, started_at, planned_end_at, actual_end_at,
              status, parking_cost, service_fee, total_cost, auto_extend,
              created_at, updated_at
       FROM parking_sessions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, pageSize, offset]
    );

    const sessions = result.rows.map((s) => ({
      id: s.id,
      vehicleId: s.vehicle_id,
      zoneId: s.zone_id,
      startedAt: s.started_at,
      plannedEndAt: s.planned_end_at,
      actualEndAt: s.actual_end_at,
      status: s.status,
      parkingCost: s.parking_cost,
      serviceFee: s.service_fee,
      totalCost: s.total_cost,
      autoExtend: s.auto_extend,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
    }));

    res.status(200).json({
      sessions: sessions,
      pagination: {
        page: pageNum,
        limit: pageSize,
        total: totalCount,
        pages: Math.ceil(totalCount / pageSize),
      },
    });
  } catch (error) {
    console.error('Get sessions error:', error);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

router.get('/:id', authMiddleware, async (req: Request, res: Response): Promise<void> => {
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

    const session = await getSessionById(id);

    if (!session || session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    res.status(200).json({
      id: session.id,
      vehicleId: session.vehicle_id,
      zoneId: session.zone_id,
      startedAt: session.started_at,
      plannedEndAt: session.planned_end_at,
      actualEndAt: session.actual_end_at,
      status: session.status,
      parkingCost: session.parking_cost,
      serviceFee: session.service_fee,
      totalCost: session.total_cost,
      autoExtend: session.auto_extend,
      createdAt: session.created_at,
      updatedAt: session.updated_at,
    });
  } catch (error) {
    console.error('Get session error:', error);
    res.status(500).json({ error: 'Failed to fetch session' });
  }
});

router.get('/:id/receipt', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { id } = req.params;

    const userResult = await query('SELECT id, email, name FROM users WHERE firebase_uid = $1', [
      req.user.uid,
    ]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    const userName = userResult.rows[0].name;

    const session = await getSessionById(id);

    if (!session || session.user_id !== userId) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const vehicleResult = await query('SELECT plate FROM vehicles WHERE id = $1', [
      session.vehicle_id,
    ]);
    if (vehicleResult.rows.length === 0) {
      res.status(404).json({ error: 'Vehicle record not found' });
      return;
    }
    const vehicle = vehicleResult.rows[0];

    const zoneResult = await query(
      'SELECT name, zone_code FROM parking_zones WHERE id = $1',
      [session.zone_id]
    );
    if (zoneResult.rows.length === 0) {
      res.status(404).json({ error: 'Zone record not found' });
      return;
    }
    const zone = zoneResult.rows[0];

    const endTime = session.actual_end_at ? new Date(session.actual_end_at) : new Date(session.planned_end_at);
    const startTime = new Date(session.started_at);
    const durationMinutes = Math.ceil((endTime.getTime() - startTime.getTime()) / 60000);

    res.status(200).json({
      receiptId: `RCP-${id.substring(0, 8).toUpperCase()}`,
      sessionId: session.id,
      userEmail: userEmail,
      userName: userName,
      vehiclePlate: vehicle.plate,
      zoneName: zone.name,
      zoneCode: zone.zone_code,
      startedAt: session.started_at,
      endedAt: session.actual_end_at || session.planned_end_at,
      durationMinutes: durationMinutes,
      parkingCost: session.parking_cost,
      serviceFee: session.service_fee,
      totalCost: session.total_cost,
      status: session.status,
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({ error: 'Failed to fetch receipt' });
  }
});

export default router;
