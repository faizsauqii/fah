import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { createAuthClient } from '../src/clients/authClient.js';
import { AppError } from '../src/errors.js';

// Stub auth-service yang meniru kontrak POST /internal/api-keys/verify (header X-Internal-Token).
const TOKEN = 'token-internal-uji-0123456789abcdef0123';
const VALID_KEY = 'jh_kunci-valid-untuk-uji';
let server;
let baseUrl;
let calls;
let lastHeaders;

const silentLogger = { error() {} };

before(async () => {
  server = http.createServer((req, res) => {
    let raw = '';
    req.on('data', (chunk) => (raw += chunk));
    req.on('end', () => {
      calls += 1;
      lastHeaders = req.headers;
      const send = (status, body) => {
        res.writeHead(status, { 'content-type': 'application/json' });
        res.end(JSON.stringify(body));
      };
      if (req.method !== 'POST' || req.url !== '/internal/api-keys/verify') {
        return send(404, { error: { code: 'NOT_FOUND', message: 'x' } });
      }
      if (req.headers['x-internal-token'] !== TOKEN) {
        return send(401, { error: { code: 'INVALID_INTERNAL_TOKEN', message: 'x' } });
      }
      const { apiKey } = JSON.parse(raw);
      if (apiKey === VALID_KEY) {
        return send(200, { valid: true, keyId: 'k-1', group: 'sehatdekat', tier: 'partner' });
      }
      return send(200, { valid: false });
    });
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => server.close());

beforeEach(() => {
  calls = 0;
  lastHeaders = undefined;
});

test('mengirim header X-Internal-Token dan menerima key valid', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: TOKEN, logger: silentLogger });
  const result = await client.verifyApiKey(VALID_KEY);
  assert.deepEqual(result, { valid: true, keyId: 'k-1', group: 'sehatdekat', tier: 'partner' });
  assert.equal(lastHeaders['x-internal-token'], TOKEN);
  assert.equal(lastHeaders['content-type'], 'application/json');
});

test('key tidak valid menghasilkan { valid: false }', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: TOKEN, logger: silentLogger });
  assert.deepEqual(await client.verifyApiKey('jh_salah'), { valid: false });
});

test('hasil di-cache: panggilan kedua tidak menghubungi auth-service', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: TOKEN, logger: silentLogger });
  await client.verifyApiKey(VALID_KEY);
  await client.verifyApiKey(VALID_KEY);
  await client.verifyApiKey('jh_salah');
  await client.verifyApiKey('jh_salah');
  assert.equal(calls, 2);
});

test('cache kedaluwarsa setelah apiKeyCacheSeconds', async () => {
  let clock = 1_000_000;
  const client = createAuthClient({
    internalUrl: baseUrl,
    internalToken: TOKEN,
    apiKeyCacheSeconds: 60,
    now: () => clock,
    logger: silentLogger,
  });
  await client.verifyApiKey(VALID_KEY);
  clock += 59_000;
  await client.verifyApiKey(VALID_KEY);
  assert.equal(calls, 1);
  clock += 2_000;
  await client.verifyApiKey(VALID_KEY);
  assert.equal(calls, 2);
});

test('X-Internal-Token salah menjadi 503 AUTH_UNAVAILABLE, bukan key tidak valid', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: 'token-yang-salah', logger: silentLogger });
  await assert.rejects(client.verifyApiKey(VALID_KEY), (err) => {
    assert.ok(err instanceof AppError);
    assert.equal(err.status, 503);
    assert.equal(err.code, 'AUTH_UNAVAILABLE');
    return true;
  });
});

test('auth-service mati menjadi 503 AUTH_UNAVAILABLE', async () => {
  const client = createAuthClient({
    internalUrl: 'http://127.0.0.1:1',
    internalToken: TOKEN,
    timeoutMs: 500,
    logger: silentLogger,
  });
  await assert.rejects(client.verifyApiKey(VALID_KEY), { status: 503, code: 'AUTH_UNAVAILABLE' });
});

test('auth-service lambat melewati timeout menjadi 503', async () => {
  const slowFetch = (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener('abort', () => reject(signal.reason));
    });
  const client = createAuthClient({
    internalUrl: baseUrl,
    internalToken: TOKEN,
    timeoutMs: 50,
    fetchImpl: slowFetch,
    logger: silentLogger,
  });
  await assert.rejects(client.verifyApiKey(VALID_KEY), { status: 503, code: 'AUTH_UNAVAILABLE' });
});

test('key kosong atau terlalu panjang langsung ditolak tanpa memanggil auth-service', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: TOKEN, logger: silentLogger });
  assert.deepEqual(await client.verifyApiKey(''), { valid: false });
  assert.deepEqual(await client.verifyApiKey('x'.repeat(201)), { valid: false });
  assert.equal(calls, 0);
});

test('jumlah entri cache dibatasi', async () => {
  const client = createAuthClient({ internalUrl: baseUrl, internalToken: TOKEN, logger: silentLogger });
  for (let i = 0; i < 1005; i += 1) {
    await client.verifyApiKey(`jh_acak_${i}`);
  }
  assert.ok(client._cacheSize() <= 1000);
});

test('internalToken kosong ditolak saat membuat klien', () => {
  assert.throws(() => createAuthClient({ internalUrl: baseUrl, internalToken: '' }));
});
