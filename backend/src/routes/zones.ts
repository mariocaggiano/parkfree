import { Router, Request, Response } from 'express';
import { optionalAuthMiddleware } from '../middleware/auth';
import { getZonesNearLocation, getZoneById } from '../services/parking';

const router = Router();

interface ZoneQueryParams {
  lat?: string;
  lng?: string;
  radius?: string;
}

router.get('/', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { lat, lng, radius } = req.query as ZoneQueryParams;

    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = radius ? parseFloat(radius) : 1000;

      if (isNaN(latitude) || isNaN(longitude) || isNaN(radiusMeters)) {
        res.status(400).json({ error: 'Invalid lat, lng, or radius parameters' });
        return;
      }

      if (radiusMeters <= 0 || radiusMeters > 50000) {
        res.status(400).json({ error: 'Radius must be between 0 and 50000 meters' });
        return;
      }

      const zones = await getZonesNearLocation(latitude, longitude, radiusMeters);

      res.status(200).json(
        zones.map((z) => ({
          id: z.id,
          cityCode: z.city_code,
          zoneCode: z.zone_code,
          name: z.name,
          hourlyRate: z.hourly_rate,
          maxDurationMin: z.max_duration_min,
          freeHours: z.free_hours,
          activeHours: z.active_hours,
        }))
      );
    } else {
      res.status(400).json({ error: 'lat and lng query parameters are required' });
    }
  } catch (error) {
    console.error('Get zones error:', error);
    res.status(500).json({ error: 'Failed to fetch zones' });
  }
});

router.get('/:id', optionalAuthMiddleware, async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const zone = await getZoneById(id);

    if (!zone) {
      res.status(404).json({ error: 'Zone not found' });
      return;
    }

    res.status(200).json({
      id: zone.id,
      cityCode: zone.city_code,
      zoneCode: zone.zone_code,
      name: zone.name,
      hourlyRate: zone.hourly_rate,
      maxDurationMin: zone.max_duration_min,
      freeHours: zone.free_hours,
      activeHours: zone.active_hours,
    });
  } catch (error) {
    console.error('Get zone error:', error);
    res.status(500).json({ error: 'Failed to fetch zone' });
  }
});

export default router;
