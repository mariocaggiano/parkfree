import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { query } from '../config/database';

const router = Router();

interface SpendingQuery {
  period?: 'weekly' | 'monthly';
  months?: string;
}

router.get('/spending', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { period, months } = req.query as SpendingQuery;

    const periodType = period === 'weekly' ? 'week' : 'month';
    const monthsCount = months ? Math.min(parseInt(months), 24) : 6;

    const userResult = await query('SELECT id FROM users WHERE firebase_uid = $1', [req.user.uid]);

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;

    const result = await query(
      `SELECT
        DATE_TRUNC($1, created_at)::DATE as period_start,
        COUNT(*) as session_count,
        SUM(parking_cost) as total_parking_cost,
        SUM(service_fee) as total_service_fees,
        SUM(total_cost) as total_spent,
        AVG(total_cost) as average_session_cost,
        MAX(total_cost) as max_session_cost,
        MIN(total_cost) as min_session_cost
       FROM parking_sessions
       WHERE user_id = $2
       AND status = 'completed'
       AND created_at >= NOW() - $3::interval
       GROUP BY DATE_TRUNC($1, created_at)
       ORDER BY period_start DESC`,
      [periodType, userId, monthsCount === 6 ? '180 days' : `${monthsCount} months`]
    );

    const spending = result.rows.map((row) => ({
      periodStart: row.period_start,
      sessionCount: parseInt(row.session_count),
      totalParkingCost: parseFloat(row.total_parking_cost || 0),
      totalServiceFees: parseFloat(row.total_service_fees || 0),
      totalSpent: parseFloat(row.total_spent || 0),
      averageSessionCost: row.average_session_cost ? parseFloat(row.average_session_cost) : 0,
      maxSessionCost: row.max_session_cost ? parseFloat(row.max_session_cost) : 0,
      minSessionCost: row.min_session_cost ? parseFloat(row.min_session_cost) : 0,
    }));

    const totalResult = await query(
      `SELECT
        COUNT(*) as session_count,
        SUM(parking_cost) as total_parking_cost,
        SUM(service_fee) as total_service_fees,
        SUM(total_cost) as total_spent,
        AVG(total_cost) as average_session_cost,
        AVG(EXTRACT(EPOCH FROM (actual_end_at - started_at))/60) as average_duration_minutes
       FROM parking_sessions
       WHERE user_id = $1
       AND status = 'completed'`,
      [userId]
    );

    const total = totalResult.rows[0];

    res.status(200).json({
      period: periodType,
      data: spending,
      totals: {
        sessionCount: parseInt(total.session_count),
        totalParkingCost: parseFloat(total.total_parking_cost || 0),
        totalServiceFees: parseFloat(total.total_service_fees || 0),
        totalSpent: parseFloat(total.total_spent || 0),
        averageSessionCost: total.average_session_cost ? parseFloat(total.average_session_cost) : 0,
        averageDurationMinutes: total.average_duration_minutes
          ? parseFloat(total.average_duration_minutes)
          : 0,
      },
    });
  } catch (error) {
    console.error('Get spending error:', error);
    res.status(500).json({ error: 'Failed to fetch spending data' });
  }
});

router.get('/export', authMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const userResult = await query(
      'SELECT id, email, name FROM users WHERE firebase_uid = $1',
      [req.user.uid]
    );

    if (userResult.rows.length === 0) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userId = userResult.rows[0].id;
    const userEmail = userResult.rows[0].email;
    const userName = userResult.rows[0].name;

    const result = await query(
      `SELECT
        ps.id,
        ps.started_at,
        ps.actual_end_at,
        EXTRACT(EPOCH FROM (ps.actual_end_at - ps.started_at))/60 as duration_minutes,
        pz.name as zone_name,
        pz.zone_code,
        v.plate as vehicle_plate,
        ps.parking_cost,
        ps.service_fee,
        ps.total_cost,
        ps.status
       FROM parking_sessions ps
       JOIN parking_zones pz ON ps.zone_id = pz.id
       JOIN vehicles v ON ps.vehicle_id = v.id
       WHERE ps.user_id = $1
       ORDER BY ps.started_at DESC`,
      [userId]
    );

    const sessions = result.rows;

    const csvHeaders = [
      'Session ID',
      'Date',
      'Start Time',
      'End Time',
      'Duration (minutes)',
      'Zone Name',
      'Zone Code',
      'Vehicle Plate',
      'Parking Cost',
      'Service Fee',
      'Total Cost',
      'Status',
    ];

    const csvData = sessions.map((session) => [
      session.id,
      new Date(session.started_at).toLocaleDateString('en-US'),
      new Date(session.started_at).toLocaleTimeString('en-US'),
      session.actual_end_at ? new Date(session.actual_end_at).toLocaleTimeString('en-US') : '',
      Math.round(session.duration_minutes || 0),
      session.zone_name,
      session.zone_code,
      session.vehicle_plate,
      session.parking_cost.toFixed(2),
      session.service_fee.toFixed(2),
      session.total_cost.toFixed(2),
      session.status,
    ]);

    const csvContent = [
      csvHeaders.join(','),
      ...csvData.map((row) => row.map((col) => `"${col}"`).join(',')),
    ].join('\n');

    const filename = `parkfree-export-${new Date().toISOString().split('T')[0]}.csv`;

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csvContent);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

export default router;
