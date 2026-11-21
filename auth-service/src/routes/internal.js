import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { errors } from '../errors.js';
import { hashApiKey } from '../lib/tokens.js';

const sameString = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && timingSafeEqual(x, y);
};

// Endpoint internal untuk core-service (kontrak bagian 3.2).
// Tidak dirutekan oleh gateway (/internal/ dijawab 404), jadi hanya terjangkau dari jaringan Docker.
// Lapisan kedua: header X-Internal-Token wajib sama dengan env INTERNAL_TOKEN (revisi 2).
export function internalRouter({ db, config }) {
  const router = Router();
  const findKey = db.prepare(
    'SELECT id, group_name, tier FROM api_keys WHERE key_hash = ? AND revoked_at IS NULL',
  );

  router.post('/internal/api-keys/verify', (req, res) => {
    if (!config.internalToken || !sameString(req.get('x-internal-token') ?? '', config.internalToken)) {
      throw errors.invalidInternalToken();
    }
    const apiKey = req.body?.apiKey;
    if (typeof apiKey !== 'string' || !apiKey.startsWith('jh_')) return res.json({ valid: false });
    const row = findKey.get(hashApiKey(apiKey));
    if (!row) return res.json({ valid: false });
    return res.json({ valid: true, keyId: row.id, group: row.group_name, tier: row.tier });
  });

  return router;
}
