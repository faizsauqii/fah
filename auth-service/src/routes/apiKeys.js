import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { errors } from '../errors.js';
import { generateApiKey, hashApiKey } from '../lib/tokens.js';
import { requireAdmin, requireJwt } from './middleware.js';

const TIERS = ['partner'];

// Penerbitan dan pencabutan API key untuk kelompok lain (admin saja).
export function apiKeysRouter({ db, config }) {
  const router = Router();
  const auth = [requireJwt(config.jwt), requireAdmin];

  router.post('/api/auth/api-keys', ...auth, (req, res) => {
    const { group, contact, tier = 'partner' } = req.body ?? {};
    const details = [];
    if (typeof group !== 'string' || !/^[a-z0-9-]{2,40}$/.test(group.trim())) details.push({ field: 'group', issue: 'lowercase_slug_2_40' });
    if (typeof contact !== 'string' || !contact.trim() || contact.length > 120) details.push({ field: 'contact', issue: 'required_max_120' });
    if (!TIERS.includes(tier)) details.push({ field: 'tier', issue: `one_of_${TIERS.join('_')}` });
    if (details.length) throw errors.validation('Data API key tidak valid.', details);

    const key = generateApiKey();
    const row = { id: randomUUID(), group: group.trim(), contact: contact.trim(), tier, createdAt: new Date().toISOString() };
    db.prepare(
      'INSERT INTO api_keys (id, key_hash, key_prefix, group_name, contact, tier, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(row.id, hashApiKey(key), key.slice(0, 7), row.group, row.contact, row.tier, row.createdAt);

    res.status(201).json({
      id: row.id,
      group: row.group,
      tier: row.tier,
      apiKey: key,
      note: 'Simpan key ini sekarang. Key tidak akan ditampilkan lagi.',
    });
  });

  router.get('/api/auth/api-keys', ...auth, (_req, res) => {
    const rows = db
      .prepare('SELECT id, key_prefix, group_name, contact, tier, created_at, revoked_at FROM api_keys ORDER BY created_at')
      .all();
    res.json({
      apiKeys: rows.map((r) => ({
        id: r.id,
        keyPrefix: r.key_prefix,
        group: r.group_name,
        contact: r.contact,
        tier: r.tier,
        createdAt: r.created_at,
        revokedAt: r.revoked_at,
      })),
    });
  });

  router.delete('/api/auth/api-keys/:id', ...auth, (req, res) => {
    const info = db
      .prepare('UPDATE api_keys SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL')
      .run(new Date().toISOString(), req.params.id);
    if (!info.changes) throw errors.notFound('API key tidak ditemukan atau sudah dicabut.');
    res.status(204).end();
  });

  return router;
}
