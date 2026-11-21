import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

function withEnv(env, fn) {
  const saved = { ...process.env };
  for (const k of ['NODE_ENV', 'JWT_SECRET', 'INTERNAL_TOKEN']) delete process.env[k];
  Object.assign(process.env, env);
  try { return fn(); } finally { process.env = saved; }
}
const SECRET = 'a'.repeat(40);

test('produksi: INTERNAL_TOKEN wajib, minimal 32, beda dari JWT_SECRET', () => {
  withEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET }, () => assert.throws(loadConfig, /INTERNAL_TOKEN/));
  withEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET, INTERNAL_TOKEN: 'pendek' }, () => assert.throws(loadConfig, /32/));
  withEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET, INTERNAL_TOKEN: SECRET }, () => assert.throws(loadConfig, /berbeda/));
  withEnv({ NODE_ENV: 'production', JWT_SECRET: SECRET, INTERNAL_TOKEN: 'b'.repeat(40) }, () =>
    assert.equal(loadConfig().internalToken, 'b'.repeat(40)));
});

test('dev: default INTERNAL_TOKEN sama dengan default core-service', () => {
  withEnv({}, () => assert.equal(loadConfig().internalToken, 'dev-only-internal-token-jangan-dipakai-000'));
});
