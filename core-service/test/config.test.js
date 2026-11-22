import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { loadConfig } from '../src/config.js';

const KEYS = ['NODE_ENV', 'JWT_SECRET', 'INTERNAL_TOKEN'];
const saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

const SECRET = 'a'.repeat(32);
const TOKEN = 'b'.repeat(32);

test('production tanpa INTERNAL_TOKEN gagal start', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = SECRET;
  delete process.env.INTERNAL_TOKEN;
  assert.throws(() => loadConfig(), /INTERNAL_TOKEN wajib diisi/);
});

test('production dengan INTERNAL_TOKEN pendek gagal start', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = SECRET;
  process.env.INTERNAL_TOKEN = 'pendek';
  assert.throws(() => loadConfig(), /minimal 32 karakter/);
});

test('production dengan INTERNAL_TOKEN sama dengan JWT_SECRET gagal start', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = SECRET;
  process.env.INTERNAL_TOKEN = SECRET;
  assert.throws(() => loadConfig(), /harus berbeda/);
});

test('production dengan konfigurasi lengkap berhasil', () => {
  process.env.NODE_ENV = 'production';
  process.env.JWT_SECRET = SECRET;
  process.env.INTERNAL_TOKEN = TOKEN;
  const config = loadConfig();
  assert.equal(config.auth.internalToken, TOKEN);
  assert.equal(config.auth.internalUrl, 'http://auth-service:3001');
});
