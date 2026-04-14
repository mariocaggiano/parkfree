import { Router, Request, Response, NextFunction } from 'express';
import { query } from '../config/database';

const router = Router();

/**
 * Middleware di autenticazione per agenti di enforcement.
 * Richiede l'header X-Enforcement-Key con il valore configurato in ENFORCEMENT_API_KEY.
 * Se la variabile non è impostata (sviluppo locale), il check viene saltato.
 */
function enforcementAuth(req: Request, res: Response, next: NextFunction): void {
  const apiKey = process.env.ENFORCEMENT_API_KEY;

  // In sviluppo senza chiave configurata, bypassa il check
  if (!apiKey) {
    next();
    return;
  }

  const provided = req.headers['x-enforcement-key'] as string | undefined;

  if (!provided || provided !== apiKey) {
    res.status(401).json({ error: 'Accesso non autorizzato. Chiave API mancante o non valida.' });
    return;
  }

  next();
}


/**
 * GET /api/enforcement/check/:plate
 *
 * Verifica se esiste una sessione di sosta attiva per la targa indicata.
 * Endpoint pubblico (usato dagli agenti, autenticazione gestita via API key).
 *
 * Response 200:
 *   { active: true,  plate, zone, zoneCode, startTime, endTime, durationMin, cost, vehicle }
 *   { active: false, plate }
 */
router.get('/check/:plate', enforcementAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    // Normalizza la targa: maiuscolo, rimuovi spazi
    const rawPlate = req.params.plate.toUpperCase().replace(/\s/g, '');

    if (rawPlate.length < 5 || rawPlate.length > 9) {
      res.status(400).json({ error: 'Formato targa non valido' });
      return;
    }

    // Cerca sessione attiva per questo veicolo
    const result = await query(
      `SELECT
         ps.id,
         ps.started_at,
         ps.planned_end_at,
         ps.actual_end_at,
         ps.status,
         ps.parking_cost,
         ps.service_fee,
         ps.total_cost,
         EXTRACT(EPOCH FROM (ps.planned_end_at - ps.started_at)) / 60 AS duration_min,
         v.plate,
         pz.name AS zone_name,
         pz.city_code || '-' || pz.zone_code AS zone_code
       FROM parking_sessions ps
       JOIN vehicles v      ON v.id  = ps.vehicle_id
       JOIN parking_zones pz ON pz.id = ps.zone_id
       WHERE
         UPPER(REPLACE(v.plate, ' ', '')) = $1
         AND ps.status IN ('active', 'extended')
         AND ps.planned_end_at > NOW()
       ORDER BY ps.started_at DESC
       LIMIT 1`,
      [rawPlate]
    );

    if (result.rows.length === 0) {
      // Nessuna sosta attiva — targa non pagata
      res.status(200).json({
        active:   false,
        plate:    formatPlate(rawPlate),
        checkedAt: new Date().toISOString(),
      });
      return;
    }

    const s = result.rows[0];

    res.status(200).json({
      active:      true,
      plate:       formatPlate(s.plate || rawPlate),
      zone:        s.zone_name,
      zoneCode:    s.zone_code,
      startTime:   s.started_at,
      endTime:     s.planned_end_at,
      durationMin: Math.round(parseFloat(s.duration_min)),
      cost:        parseFloat(s.total_cost),
      status:      s.status,
      checkedAt:   new Date().toISOString(),
    });
  } catch (error) {
    console.error('Enforcement check error:', error);
    res.status(500).json({ error: 'Errore durante la verifica. Riprovare.' });
  }
});

/**
 * GET /api/enforcement/zone/:zoneCode/active
 *
 * Restituisce tutte le soste attive in una zona (per pattugliamento di area).
 */
router.get('/zone/:zoneCode/active', enforcementAuth, async (req: Request, res: Response): Promise<void> => {
  try {
    const zoneCode = req.params.zoneCode.toUpperCase();

    const [cityCode, code] = zoneCode.split('-');
    if (!cityCode || !code) {
      res.status(400).json({ error: 'Formato codice zona non valido (es. MI-A)' });
      return;
    }

    const result = await query(
      `SELECT
         v.plate,
         ps.started_at,
         ps.planned_end_at,
         EXTRACT(EPOCH FROM (ps.planned_end_at - NOW())) / 60 AS remaining_min
       FROM parking_sessions ps
       JOIN vehicles v       ON v.id  = ps.vehicle_id
       JOIN parking_zones pz ON pz.id = ps.zone_id
       WHERE
         pz.city_code = $1 AND pz.zone_code = $2
         AND ps.status IN ('active', 'extended')
         AND ps.planned_end_at > NOW()
       ORDER BY ps.planned_end_at ASC`,
      [cityCode, code]
    );

    res.status(200).json({
      zoneCode,
      activeSessions: result.rows.length,
      sessions: result.rows.map((r) => ({
        plate:        formatPlate(r.plate),
        startTime:    r.started_at,
        endTime:      r.planned_end_at,
        remainingMin: Math.max(0, Math.round(parseFloat(r.remaining_min))),
      })),
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Zone active sessions error:', error);
    res.status(500).json({ error: 'Errore durante la verifica zona' });
  }
});

/* Formatta la targa in stile italiano (es. AB123CD → AB 123CD) */
function formatPlate(raw: string): string {
  const p = raw.toUpperCase().replace(/\s/g, '');
  // Targa italiana moderna: 2 lettere + 3 cifre + 2 lettere
  const match = p.match(/^([A-Z]{2})(\d{3})([A-Z]{2})$/);
  if (match) return `${match[1]} ${match[2]}${match[3]}`;
  return p;
}

export default router;
