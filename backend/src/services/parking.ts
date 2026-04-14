import { query } from '../config/database';

export interface ParkingZone {
  id: string;
  city_code: string;
  zone_code: string;
  name: string;
  hourly_rate: number;
  max_duration_min: number | null;
  free_hours: {
    start: string | null;
    end: string | null;
  };
  active_hours: Record<string, { start: string; end: string } | null>;
}

export interface ParkingSession {
  id: string;
  user_id: string;
  vehicle_id: string;
  zone_id: string;
  started_at: Date;
  planned_end_at: Date;
  actual_end_at: Date | null;
  status: 'active' | 'extended' | 'completed' | 'cancelled' | 'expired';
  parking_cost: number;
  service_fee: number;
  total_cost: number;
  stripe_payment_id: string | null;
  auto_extend: boolean;
  created_at: Date;
  updated_at: Date;
}

export const calculateParkingCost = (
  zone: ParkingZone,
  durationMinutes: number
): number => {
  if (durationMinutes <= 0) {
    return 0;
  }

  const hourlyRate = zone.hourly_rate;
  const costPerMinute = hourlyRate / 60;
  // Arrotonda per eccesso alla mezz'ora più vicina
  const durationHours = Math.ceil(durationMinutes / 60);
  const roundedCost = hourlyRate * durationHours;

  return Math.round(roundedCost * 100) / 100;
};

/**
 * Calcola la commissione di servizio ParkFree.
 *
 * Formula ottimizzata per piccoli comuni (transazioni di valore basso):
 *   fee = max(MIN, min(parkingCost × PERC + FIXED, MAX))
 *
 * Valori default:
 *   PERC  = 15%   (configurabile via SERVICE_FEE_PERCENTAGE)
 *   FIXED = 0.20€ (configurabile via SERVICE_FEE_FIXED)
 *   MIN   = 0.39€ — copre il costo fisso Stripe (€0.25) anche sul più piccolo pagamento
 *   MAX   = 2.50€ — tetto per parcheggi lunghi/costosi
 *
 * Esempi:
 *   €0.50 sosta → fee €0.39  (minimo garantito)
 *   €1.00 sosta → fee €0.39  (0.15+0.20=0.35 → under min)
 *   €1.50 sosta → fee €0.43  (0.225+0.20=0.425 → ≈0.43)
 *   €3.00 sosta → fee €0.65  (0.45+0.20=0.65)
 *   €15.00 sosta → fee €2.45 (2.25+0.20=2.45)
 *   €20.00 sosta → fee €2.50 (3.00+0.20=3.20 → capped)
 */
export const calculateServiceFee = (parkingCost: number): number => {
  const percentage = parseFloat(process.env.SERVICE_FEE_PERCENTAGE || '15') / 100;
  const fixedFee = parseFloat(process.env.SERVICE_FEE_FIXED || '0.20');
  const minFee = parseFloat(process.env.SERVICE_FEE_MIN || '0.39');
  const maxFee = parseFloat(process.env.SERVICE_FEE_MAX || '2.50');

  const totalFee = percentage * parkingCost + fixedFee;
  const fee = Math.max(minFee, Math.min(totalFee, maxFee));
  return Math.round(fee * 100) / 100;
};

export const isZoneActiveNow = (zone: ParkingZone): boolean => {
  const now = new Date();
  const dayOfWeek = getDayOfWeek(now);
  const timeString = getTimeString(now);

  const dayHours = zone.active_hours[dayOfWeek];

  if (!dayHours) {
    return false;
  }

  const startTime = dayHours.start;
  const endTime = dayHours.end;

  if (!startTime || !endTime) {
    return false;
  }

  return timeString >= startTime && timeString < endTime;
};

export const isInFreeHours = (zone: ParkingZone, dateTime: Date): boolean => {
  const freeStart = zone.free_hours.start;
  const freeEnd = zone.free_hours.end;

  if (!freeStart || !freeEnd) {
    return false;
  }

  const timeString = getTimeString(dateTime);

  if (freeStart < freeEnd) {
    return timeString >= freeStart && timeString < freeEnd;
  } else {
    return timeString >= freeStart || timeString < freeEnd;
  }
};

export const getZoneById = async (zoneId: string): Promise<ParkingZone | null> => {
  const result = await query(
    `SELECT id, city_code, zone_code, name, hourly_rate, max_duration_min,
            free_hours, active_hours
     FROM parking_zones WHERE id = $1`,
    [zoneId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as ParkingZone;
};

export const getZonesNearLocation = async (
  latitude: number,
  longitude: number,
  radiusMeters: number = 1000
): Promise<ParkingZone[]> => {
  const result = await query(
    `SELECT id, city_code, zone_code, name, hourly_rate, max_duration_min,
            free_hours, active_hours
     FROM parking_zones
     WHERE ST_DWithin(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326), $3)
     ORDER BY ST_Distance(geometry, ST_SetSRID(ST_MakePoint($1, $2), 4326))`,
    [longitude, latitude, radiusMeters]
  );

  return result.rows as ParkingZone[];
};

export const validateSessionDuration = (
  zone: ParkingZone,
  durationMinutes: number
): { valid: boolean; message?: string } => {
  if (durationMinutes <= 0) {
    return { valid: false, message: 'Duration must be positive' };
  }

  if (zone.max_duration_min && durationMinutes > zone.max_duration_min) {
    return {
      valid: false,
      message: `Maximum duration for this zone is ${zone.max_duration_min} minutes`,
    };
  }

  return { valid: true };
};

export const getSessionById = async (sessionId: string): Promise<ParkingSession | null> => {
  const result = await query(
    `SELECT id, user_id, vehicle_id, zone_id, started_at, planned_end_at,
            actual_end_at, status, parking_cost, service_fee, total_cost,
            stripe_payment_id, auto_extend, created_at, updated_at
     FROM parking_sessions WHERE id = $1`,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0] as ParkingSession;
};

export const calculateExtensionCost = (
  zone: ParkingZone,
  extensionMinutes: number
): { parkingCost: number; serviceFee: number; totalCost: number } => {
  const parkingCost = calculateParkingCost(zone, extensionMinutes);
  const serviceFee = calculateServiceFee(parkingCost);
  const totalCost = parkingCost + serviceFee;

  return {
    parkingCost: Math.round(parkingCost * 100) / 100,
    serviceFee: Math.round(serviceFee * 100) / 100,
    totalCost: Math.round(totalCost * 100) / 100,
  };
};

function getDayOfWeek(date: Date): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
}

function getTimeString(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}
