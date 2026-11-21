import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { seedUsers } from '../src/seed.js';

const config = {
  nodeEnv: 'test',
  jwt: { secret: 'test-secret-yang-panjangnya-lebih-dari-32-karakter', issuer: 'jamhijau-auth', audience: 'jamhijau', expiresInSeconds: 604800 },
  internalToken: 'rahasia-internal',
};

let server;
let base;

async function call(method, path, { body, token, headers = {} } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

before(async () => {
  const db = openDatabase(':memory:');
  seedUsers(db, { adminEmail: 'admin@jamhijau.test', adminPassword: 'admin-rahasia-1', demoEmail: null, demoPassword: null });
  const app = createApp({ config, db });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

describe('health', () => {
  test('/healthz dan /api/auth/health', async () => {
    for (const p of ['/healthz', '/api/auth/health']) {
      const r = await call('GET', p);
      assert.equal(r.status, 200);
      assert.equal(r.body.service, 'auth-service');
      assert.equal(r.body.database, 'ok');
    }
  });
});

describe('register dan login', () => {
  test('register mengembalikan format token sesuai kontrak', async () => {
    const r = await call('POST', '/api/auth/register', { body: { email: 'Uji@JamHijau.test', password: 'password123', name: 'Uji' } });
    assert.equal(r.status, 201);
    assert.equal(r.body.tokenType, 'Bearer');
    assert.equal(r.body.expiresIn, 604800);
    assert.equal(r.body.user.email, 'uji@jamhijau.test');
    assert.equal(r.body.user.role, 'user');
    assert.match(r.body.user.id, /^[0-9a-f-]{36}$/);

    const payload = jwt.verify(r.body.accessToken, config.jwt.secret, { issuer: 'jamhijau-auth', audience: 'jamhijau' });
    assert.equal(payload.sub, r.body.user.id);
    assert.equal(payload.role, 'user');
    assert.equal(payload.exp - payload.iat, 604800);
  });

  test('validasi dengan details per field', async () => {
    const r = await call('POST', '/api/auth/register', { body: { email: 'bukan-email', password: '123', name: '' } });
    assert.equal(r.status, 400);
    assert.equal(r.body.error.code, 'VALIDATION_ERROR');
    assert.deepEqual(r.body.error.details.map((d) => d.field), ['email', 'password', 'name']);
  });

  test('email ganda: 409 CONFLICT', async () => {
    const r = await call('POST', '/api/auth/register', { body: { email: 'uji@jamhijau.test', password: 'password123', name: 'Lagi' } });
    assert.equal(r.status, 409);
    assert.equal(r.body.error.code, 'CONFLICT');
  });

  test('login benar dan salah', async () => {
    const ok = await call('POST', '/api/auth/login', { body: { email: 'uji@jamhijau.test', password: 'password123' } });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.accessToken);
    const bad = await call('POST', '/api/auth/login', { body: { email: 'uji@jamhijau.test', password: 'salah-salah' } });
    assert.equal(bad.status, 401);
    assert.equal(bad.body.error.code, 'UNAUTHENTICATED');
  });

  test('JSON rusak: 400 VALIDATION_ERROR', async () => {
    const res = await fetch(base + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{rusak' });
    assert.equal(res.status, 400);
    assert.equal((await res.json()).error.code, 'VALIDATION_ERROR');
  });
});

describe('me', () => {
  test('tanpa token, token rusak, token dengan audience lain', async () => {
    assert.equal((await call('GET', '/api/auth/me')).body.error.code, 'UNAUTHENTICATED');
    assert.equal((await call('GET', '/api/auth/me', { token: 'rusak' })).body.error.code, 'INVALID_TOKEN');
    const wrongAud = jwt.sign({ role: 'user' }, config.jwt.secret, { subject: 'x', issuer: 'jamhijau-auth', audience: 'lain' });
    assert.equal((await call('GET', '/api/auth/me', { token: wrongAud })).status, 401);
  });
  test('dengan token valid', async () => {
    const login = await call('POST', '/api/auth/login', { body: { email: 'uji@jamhijau.test', password: 'password123' } });
    const r = await call('GET', '/api/auth/me', { token: login.body.accessToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.user.email, 'uji@jamhijau.test');
  });
});

describe('API key', () => {
  let adminToken;
  let userToken;
  let issued;

  before(async () => {
    adminToken = (await call('POST', '/api/auth/login', { body: { email: 'admin@jamhijau.test', password: 'admin-rahasia-1' } })).body.accessToken;
    userToken = (await call('POST', '/api/auth/login', { body: { email: 'uji@jamhijau.test', password: 'password123' } })).body.accessToken;
  });

  test('hanya admin yang boleh menerbitkan', async () => {
    const r = await call('POST', '/api/auth/api-keys', { token: userToken, body: { group: 'kelompok-x', contact: 'x@itb.ac.id' } });
    assert.equal(r.status, 403);
    assert.equal(r.body.error.code, 'FORBIDDEN');
  });

  test('admin menerbitkan key berformat jh_ + 32 karakter', async () => {
    const r = await call('POST', '/api/auth/api-keys', { token: adminToken, body: { group: 'kelompok-x', contact: 'x@itb.ac.id' } });
    assert.equal(r.status, 201);
    assert.match(r.body.apiKey, /^jh_[A-Za-z0-9_-]{32}$/);
    issued = r.body;
  });

  test('daftar key tidak memuat key asli', async () => {
    const r = await call('GET', '/api/auth/api-keys', { token: adminToken });
    assert.equal(r.status, 200);
    assert.equal(r.body.apiKeys.length, 1);
    assert.equal(JSON.stringify(r.body).includes(issued.apiKey), false);
  });

  test('verifikasi internal: tanpa atau salah X-Internal-Token = 401 INVALID_INTERNAL_TOKEN', async () => {
    for (const headers of [{}, { 'X-Internal-Token': 'salah' }]) {
      const r = await call('POST', '/internal/api-keys/verify', { headers, body: { apiKey: issued.apiKey } });
      assert.equal(r.status, 401);
      assert.equal(r.body.error.code, 'INVALID_INTERNAL_TOKEN');
    }
  });

  test('verifikasi internal: valid, salah, lalu dicabut', async () => {
    const h = { 'X-Internal-Token': 'rahasia-internal' };
    const ok = await call('POST', '/internal/api-keys/verify', { headers: h, body: { apiKey: issued.apiKey } });
    assert.deepEqual(ok.body, { valid: true, keyId: issued.id, group: 'kelompok-x', tier: 'partner' });

    const bad = await call('POST', '/internal/api-keys/verify', { headers: h, body: { apiKey: 'jh_salah' } });
    assert.deepEqual(bad.body, { valid: false });

    assert.equal((await call('DELETE', `/api/auth/api-keys/${issued.id}`, { token: adminToken })).status, 204);
    const revoked = await call('POST', '/internal/api-keys/verify', { headers: h, body: { apiKey: issued.apiKey } });
    assert.deepEqual(revoked.body, { valid: false });
  });
});

test('path tidak dikenal: 404 NOT_FOUND', async () => {
  const r = await call('GET', '/api/auth/tidak-ada');
  assert.equal(r.status, 404);
  assert.equal(r.body.error.code, 'NOT_FOUND');
});
