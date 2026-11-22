import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { errors } from '../src/errors.js';

const JWT = { secret: 's'.repeat(32), issuer: 'jamhijau-auth', audience: 'jamhijau' };
const USER_ID = '3f6c2a8e-7b1d-4c3a-9a51-2f0e8d4b6c10';

const sign = (overrides = {}, options = {}) =>
  jwt.sign({ role: 'user', ...overrides }, options.secret ?? JWT.secret, {
    algorithm: 'HS256',
    subject: USER_ID,
    issuer: options.issuer ?? JWT.issuer,
    audience: options.audience ?? JWT.audience,
    expiresIn: options.expiresIn ?? 3600,
  });

let server;
let baseUrl;
let db;
let keyCalls;
let authDown;

const fakeAuthClient = {
  async verifyApiKey(apiKey) {
    keyCalls.push(apiKey);
    if (authDown) throw errors.authUnavailable();
    return apiKey === 'jh_valid'
      ? { valid: true, keyId: 'k1', group: 'sehatdekat', tier: 'partner' }
      : { valid: false };
  },
};

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({
    config: { nodeEnv: 'test', jwt: JWT },
    db,
    authClient: fakeAuthClient,
    openMeteo: {
      async getHourlyConditions() {
        throw errors.upstreamUnavailable();
      },
    },
  });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

beforeEach(() => {
  keyCalls = [];
  authDown = false;
});

const call = async (path, headers = {}) => {
  const res = await fetch(`${baseUrl}${path}`, { headers });
  return { status: res.status, code: (await res.json()).error?.code };
};

test('anonim boleh memanggil /api/profiles', async () => {
  assert.equal((await call('/api/profiles')).status, 200);
});

test('JWT valid diterima di /api/profiles', async () => {
  assert.equal((await call('/api/profiles', { authorization: `Bearer ${sign()}` })).status, 200);
});

test('JWT dengan tanda tangan salah -> 401 INVALID_TOKEN', async () => {
  const token = sign({}, { secret: 'x'.repeat(32) });
  assert.deepEqual(await call('/api/profiles', { authorization: `Bearer ${token}` }), { status: 401, code: 'INVALID_TOKEN' });
});

test('JWT kedaluwarsa -> 401 INVALID_TOKEN', async () => {
  const token = sign({}, { expiresIn: -10 });
  assert.deepEqual(await call('/api/profiles', { authorization: `Bearer ${token}` }), { status: 401, code: 'INVALID_TOKEN' });
});

test('JWT dengan audience atau issuer lain -> 401 INVALID_TOKEN', async () => {
  for (const options of [{ audience: 'lain' }, { issuer: 'lain' }]) {
    const token = sign({}, options);
    assert.equal((await call('/api/profiles', { authorization: `Bearer ${token}` })).code, 'INVALID_TOKEN');
  }
});

test('JWT dengan role tidak dikenal -> 401 INVALID_TOKEN', async () => {
  const token = sign({ role: 'superuser' });
  assert.equal((await call('/api/profiles', { authorization: `Bearer ${token}` })).code, 'INVALID_TOKEN');
});

test('header Authorization bukan Bearer -> 401 INVALID_TOKEN', async () => {
  assert.equal((await call('/api/profiles', { authorization: 'Basic abc' })).code, 'INVALID_TOKEN');
});

test('API key valid diterima di /api/profiles', async () => {
  assert.equal((await call('/api/profiles', { 'x-api-key': 'jh_valid' })).status, 200);
  assert.deepEqual(keyCalls, ['jh_valid']);
});

test('API key salah -> 401 INVALID_API_KEY', async () => {
  assert.deepEqual(await call('/api/profiles', { 'x-api-key': 'jh_salah' }), { status: 401, code: 'INVALID_API_KEY' });
});

test('auth-service tidak bisa dihubungi -> 503 AUTH_UNAVAILABLE', async () => {
  authDown = true;
  assert.deepEqual(await call('/api/profiles', { 'x-api-key': 'jh_valid' }), { status: 503, code: 'AUTH_UNAVAILABLE' });
});

test('JWT dan API key sekaligus -> JWT yang dipakai, API key tidak diverifikasi', async () => {
  const res = await call('/api/profiles', { authorization: `Bearer ${sign()}`, 'x-api-key': 'jh_salah' });
  assert.equal(res.status, 200);
  assert.deepEqual(keyCalls, []);
});

test('/api/me tanpa token -> 401 UNAUTHENTICATED', async () => {
  assert.deepEqual(await call('/api/me/locations'), { status: 401, code: 'UNAUTHENTICATED' });
});

test('/api/me dengan API key saja -> 401 UNAUTHENTICATED', async () => {
  assert.deepEqual(await call('/api/me/locations', { 'x-api-key': 'jh_valid' }), { status: 401, code: 'UNAUTHENTICATED' });
});

test('/api/me dengan JWT valid lolos autentikasi', async () => {
  assert.deepEqual(await call('/api/me/locations', { authorization: `Bearer ${sign()}` }), { status: 200, code: undefined });
});

test('/api/core/health tetap bisa diakses tanpa autentikasi', async () => {
  const res = await fetch(`${baseUrl}/api/core/health`, { headers: { authorization: 'Bearer rusak' } });
  assert.equal(res.status, 200);
});
