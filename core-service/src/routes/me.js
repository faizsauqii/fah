import { Router } from 'express';
import { errors } from '../errors.js';
import { requireUser } from '../middleware/auth.js';
import { PROFILE_VALUES } from '../domain/profiles.js';

export const MAX_LOCATIONS = 50;
export const MAX_PLANS = 100;
const NAME_MAX = 80;
const MAX_PLAN_HOURS = 24;
const ISO_OFFSET_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(Z|[+-](\d{2}):(\d{2}))$/;

function readText(value, field, details) {
  if (typeof value !== 'string' || !value.trim()) {
    details.push({ field, issue: 'required' });
    return null;
  }
  const text = value.trim();
  if (text.length > NAME_MAX) {
    details.push({ field, issue: 'too_long' });
    return null;
  }
  return text;
}

function readCoordinate(value, field, min, max, details) {
  if (value === undefined || value === null) {
    details.push({ field, issue: 'required' });
    return null;
  }
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    details.push({ field, issue: 'invalid_format' });
    return null;
  }
  if (value < min || value > max) {
    details.push({ field, issue: 'out_of_range' });
    return null;
  }
  return value;
}

function readDateTime(value, field, details) {
  if (typeof value !== 'string' || !value) {
    details.push({ field, issue: 'required' });
    return null;
  }
  const match = ISO_OFFSET_RE.exec(value);
  const ms = Date.parse(value);
  if (!match || Number.isNaN(ms)) {
    details.push({ field, issue: 'invalid_format' });
    return null;
  }
  const offsetMinutes =
    match[1] === 'Z' ? 0 : (match[1][0] === '-' ? -1 : 1) * (Number(match[2]) * 60 + Number(match[3]));
  return { ms, offsetMinutes };
}

function fail(message, details) {
  throw errors.validation(message, details);
}

function readLocation(body) {
  const details = [];
  const name = readText(body.name, 'name', details);
  const lat = readCoordinate(body.lat, 'lat', -90, 90, details);
  const lon = readCoordinate(body.lon, 'lon', -180, 180, details);
  if (details.length) fail('Data lokasi tidak valid.', details);
  return { name, lat, lon };
}

export function meRouter({ store, riskService }) {
  const router = Router();
  router.use('/api/me', requireUser);

  const userId = (req) => req.auth.userId;
  const body = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {});

  router.get('/api/me/health-profile', (req, res) => {
    res.json(store.getHealthProfile(userId(req)));
  });

  router.put('/api/me/health-profile', (req, res) => {
    const { profile } = body(req);
    if (typeof profile !== 'string' || !PROFILE_VALUES.includes(profile)) {
      fail(`Profil harus salah satu dari: ${PROFILE_VALUES.join(', ')}.`, [{ field: 'profile', issue: 'invalid_value' }]);
    }
    res.json(store.setHealthProfile(userId(req), profile));
  });

  router.get('/api/me/locations', (req, res) => {
    res.json({ locations: store.listLocations(userId(req)) });
  });

  router.post('/api/me/locations', (req, res) => {
    const data = readLocation(body(req));
    if (store.countLocations(userId(req)) >= MAX_LOCATIONS) {
      throw errors.conflict(`Batas ${MAX_LOCATIONS} lokasi tersimpan sudah tercapai. Hapus lokasi lain terlebih dahulu.`);
    }
    res.status(201).json(store.createLocation(userId(req), data));
  });

  router.put('/api/me/locations/:id', (req, res) => {
    const data = readLocation(body(req));
    const updated = store.updateLocation(userId(req), req.params.id, data);
    if (!updated) throw errors.notFound('Lokasi tidak ditemukan.');
    res.json(updated);
  });

  router.delete('/api/me/locations/:id', (req, res) => {
    if (!store.deleteLocation(userId(req), req.params.id)) throw errors.notFound('Lokasi tidak ditemukan.');
    res.status(204).end();
  });

  router.get('/api/me/plans', (req, res) => {
    res.json({ plans: store.listPlans(userId(req)) });
  });

  router.post('/api/me/plans', (req, res) => {
    const input = body(req);
    const details = [];
    const title = readText(input.title, 'title', details);
    const start = readDateTime(input.startAt, 'startAt', details);
    const end = readDateTime(input.endAt, 'endAt', details);

    if (typeof input.locationId !== 'string' || !input.locationId) {
      details.push({ field: 'locationId', issue: 'required' });
    } else if (!store.getLocation(userId(req), input.locationId)) {
      details.push({ field: 'locationId', issue: 'not_found' });
    }
    if (start && end) {
      if (end.ms <= start.ms) details.push({ field: 'endAt', issue: 'out_of_range' });
      else if (end.ms - start.ms > MAX_PLAN_HOURS * 3_600_000) details.push({ field: 'endAt', issue: 'too_long' });
    }
    if (details.length) {
      fail(`Data rencana tidak valid. endAt harus setelah startAt, paling lama ${MAX_PLAN_HOURS} jam.`, details);
    }
    if (store.countPlans(userId(req)) >= MAX_PLANS) {
      throw errors.conflict(`Batas ${MAX_PLANS} rencana sudah tercapai. Hapus rencana lama terlebih dahulu.`);
    }

    res.status(201).json(
      store.createPlan(userId(req), {
        title,
        locationId: input.locationId,
        startMs: start.ms,
        endMs: end.ms,
        offsetMinutes: start.offsetMinutes,
      }),
    );
  });

  router.delete('/api/me/plans/:id', (req, res) => {
    if (!store.deletePlan(userId(req), req.params.id)) throw errors.notFound('Rencana tidak ditemukan.');
    res.status(204).end();
  });

  router.get('/api/me/plans/:id/recommendation', async (req, res) => {
    const plan = store.getPlan(userId(req), req.params.id);
    if (!plan) throw errors.notFound('Rencana tidak ditemukan.');

    const { profile } = store.getHealthProfile(userId(req));
    const result = await riskService.assessRange({
      lat: plan.location.lat,
      lon: plan.location.lon,
      profile,
      fromMs: plan.startMs,
      toMs: plan.endMs,
    });

    const messages = {
      NONE: 'Prakiraan untuk waktu rencana ini belum atau sudah tidak tersedia (prakiraan hanya sekitar 5 hari ke depan).',
      PARTIAL: 'Prakiraan baru tersedia untuk sebagian waktu rencana; saran dihitung dari jam yang tersedia.',
    };

    res.json({
      planId: plan.id,
      ...result,
      message: messages[result.coverage] ?? null,
    });
  });

  return router;
}
