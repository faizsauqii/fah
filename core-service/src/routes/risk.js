import { Router } from 'express';
import { errors } from '../errors.js';
import { PROFILES, PROFILE_VALUES } from '../domain/profiles.js';

const NUMBER_RE = /^-?\d+(\.\d+)?$/;

function parseCoordinate(raw, field, min, max, details) {
  if (raw === undefined || raw === '') {
    details.push({ field, issue: 'required' });
    return null;
  }
  if (typeof raw !== 'string' || !NUMBER_RE.test(raw.trim())) {
    details.push({ field, issue: 'invalid_format' });
    return null;
  }
  const value = Number(raw);
  if (value < min || value > max) {
    details.push({ field, issue: 'out_of_range' });
    return null;
  }
  return value;
}

export function riskRouter({ riskService }) {
  const router = Router();

  router.get('/api/profiles', (_req, res) => {
    res.json({ profiles: PROFILES });
  });

  router.get('/api/risk', async (req, res) => {
    const details = [];
    const lat = parseCoordinate(req.query.lat, 'lat', -90, 90, details);
    const lon = parseCoordinate(req.query.lon, 'lon', -180, 180, details);
    const profile = req.query.profile ?? 'umum';
    if (typeof profile !== 'string' || !PROFILE_VALUES.includes(profile)) {
      details.push({ field: 'profile', issue: 'invalid_value' });
    }
    if (details.length) {
      throw errors.validation(
        `Parameter tidak valid. lat -90..90, lon -180..180, profile salah satu dari: ${PROFILE_VALUES.join(', ')}.`,
        details,
      );
    }

    res.json(await riskService.assess({ lat, lon, profile }));
  });

  return router;
}
