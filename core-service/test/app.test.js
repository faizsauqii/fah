import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase(':memory:');
  const config = { port: 0, nodeEnv: 'test' };
  const app = createApp({ config, db });
  await new Promise((resolve) => {
    server = app.listen(0, resolve);
  });
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  db.close();
});

test('GET /healthz mengembalikan 200 dan database ok', async () => {
  const res = await fetch(`${baseUrl}/healthz`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.database, 'ok');
  assert.equal(body.service, 'core-service');
});

test('GET /api/core/health bisa diakses lewat prefix /api', async () => {
  const res = await fetch(`${baseUrl}/api/core/health`);
  assert.equal(res.status, 200);
});

test('endpoint yang belum dibuat menjawab 501 dengan format error bersama', async () => {
  const res = await fetch(`${baseUrl}/api/me/health-profile`);
  assert.equal(res.status, 501);
  const body = await res.json();
  assert.deepEqual(Object.keys(body), ['error']);
  assert.equal(body.error.code, 'NOT_IMPLEMENTED');
  assert.equal(typeof body.error.message, 'string');
});

test('path yang tidak ada menjawab 404 JSON', async () => {
  const res = await fetch(`${baseUrl}/api/tidak-ada`);
  assert.equal(res.status, 404);
  assert.match(res.headers.get('content-type'), /application\/json/);
  const body = await res.json();
  assert.equal(body.error.code, 'NOT_FOUND');
});

test('body JSON rusak menjawab 400 VALIDATION_ERROR', async () => {
  const res = await fetch(`${baseUrl}/api/me/locations`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: '{"nama": ',
  });
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.error.code, 'VALIDATION_ERROR');
});

test('migrasi membuat semua tabel', () => {
  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name")
    .all()
    .map((row) => row.name);
  for (const name of [
    'activity_plans',
    'env_cache',
    'health_profiles',
    'saved_locations',
    'schema_migrations',
  ]) {
    assert.ok(tables.includes(name), `tabel ${name} harus ada`);
  }
});

test('CHECK constraint menolak profil yang tidak dikenal', () => {
  assert.throws(() =>
    db
      .prepare('INSERT INTO health_profiles (user_id, profile, updated_at) VALUES (?, ?, ?)')
      .run('u1', 'atlet', new Date().toISOString()),
  );
});
