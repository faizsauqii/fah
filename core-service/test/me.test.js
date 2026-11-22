import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { MAX_LOCATIONS } from '../src/routes/me.js';

const JWT = { secret: 's'.repeat(32), issuer: 'jamhijau-auth', audience: 'jamhijau' };
const HOUR = 3_600_000;
const OFFSET = 25200;
const MIDNIGHT_WIB = Date.UTC(2026, 10, 23, 0, 0, 0) - OFFSET * 1000;
const NOW = MIDNIGHT_WIB + 4 * HOUR;

const tokenFor = (sub) =>
  jwt.sign({ role: 'user' }, JWT.secret, {
    algorithm: 'HS256',
    subject: sub,
    issuer: JWT.issuer,
    audience: JWT.audience,
    expiresIn: 3600,
  });

const ALICE = tokenFor('11111111-1111-4111-8111-111111111111');
const BOB = tokenFor('22222222-2222-4222-8222-222222222222');

function buildHours() {
  return Array.from({ length: 120 }, (_, i) => {
    const localHour = i % 24;
    return {
      epochMs: MIDNIGHT_WIB + i * HOUR,
      pm25: localHour === 7 ? 30 : 10,
      pm10: 20,
      uvIndex: localHour >= 10 && localHour <= 14 ? 9 : 1,
      temperature: 24,
      humidity: 70,
    };
  });
}

let server;
let baseUrl;
let db;

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({
    config: { nodeEnv: 'test', jwt: JWT },
    db,
    now: () => NOW,
    openMeteo: {
      async getHourlyConditions() {
        return { timezone: 'Asia/Jakarta', utcOffsetSeconds: OFFSET, hours: buildHours() };
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
  db.exec('DELETE FROM activity_plans; DELETE FROM saved_locations; DELETE FROM health_profiles; DELETE FROM env_cache;');
});

async function api(method, path, token, body) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...(body !== undefined ? { 'content-type': 'application/json' } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null };
}

const createLocation = async (token, data = { name: 'Taman Ganesha', lat: -6.8915, lon: 107.6107 }) =>
  (await api('POST', '/api/me/locations', token, data)).body;

test('profil kesehatan: bawaan umum, bisa diubah, dan tersimpan', async () => {
  assert.deepEqual((await api('GET', '/api/me/health-profile', ALICE)).body, { profile: 'umum', updatedAt: null });

  const put = await api('PUT', '/api/me/health-profile', ALICE, { profile: 'asma' });
  assert.equal(put.status, 200);
  assert.equal(put.body.profile, 'asma');
  assert.equal((await api('GET', '/api/me/health-profile', ALICE)).body.profile, 'asma');
  assert.equal((await api('GET', '/api/me/health-profile', BOB)).body.profile, 'umum');
});

test('profil kesehatan: nilai tidak dikenal ditolak', async () => {
  const res = await api('PUT', '/api/me/health-profile', ALICE, { profile: 'atlet' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details, [{ field: 'profile', issue: 'invalid_value' }]);
});

test('lokasi: tambah, daftar, ubah, hapus', async () => {
  const created = await api('POST', '/api/me/locations', ALICE, { name: '  Rumah  ', lat: -6.9, lon: 107.6 });
  assert.equal(created.status, 201);
  assert.equal(created.body.name, 'Rumah');
  assert.match(created.body.id, /^[0-9a-f-]{36}$/);

  const list = await api('GET', '/api/me/locations', ALICE);
  assert.deepEqual(list.body.locations.map((l) => l.name), ['Rumah']);

  const updated = await api('PUT', `/api/me/locations/${created.body.id}`, ALICE, { name: 'Kantor', lat: -6.2, lon: 106.8 });
  assert.equal(updated.status, 200);
  assert.equal(updated.body.name, 'Kantor');

  assert.equal((await api('DELETE', `/api/me/locations/${created.body.id}`, ALICE)).status, 204);
  assert.deepEqual((await api('GET', '/api/me/locations', ALICE)).body.locations, []);
});

test('lokasi: validasi per field', async () => {
  const res = await api('POST', '/api/me/locations', ALICE, { name: '', lat: 91, lon: '107' });
  assert.equal(res.status, 400);
  assert.deepEqual(res.body.error.details, [
    { field: 'name', issue: 'required' },
    { field: 'lat', issue: 'out_of_range' },
    { field: 'lon', issue: 'invalid_format' },
  ]);
  const long = await api('POST', '/api/me/locations', ALICE, { name: 'x'.repeat(81), lat: 0, lon: 0 });
  assert.deepEqual(long.body.error.details, [{ field: 'name', issue: 'too_long' }]);
});

test('lokasi milik orang lain tidak terlihat dan tidak bisa diubah/dihapus (404)', async () => {
  const loc = await createLocation(ALICE);
  assert.deepEqual((await api('GET', '/api/me/locations', BOB)).body.locations, []);
  assert.equal((await api('PUT', `/api/me/locations/${loc.id}`, BOB, { name: 'X', lat: 0, lon: 0 })).status, 404);
  assert.equal((await api('DELETE', `/api/me/locations/${loc.id}`, BOB)).status, 404);
  assert.equal((await api('GET', '/api/me/locations', ALICE)).body.locations.length, 1);
});

test(`lokasi: batas ${MAX_LOCATIONS} per pengguna -> 409 CONFLICT`, async () => {
  for (let i = 0; i < MAX_LOCATIONS; i += 1) await createLocation(ALICE, { name: `L${i}`, lat: 0, lon: 0 });
  const res = await api('POST', '/api/me/locations', ALICE, { name: 'lebih', lat: 0, lon: 0 });
  assert.equal(res.status, 409);
  assert.equal(res.body.error.code, 'CONFLICT');
});

test('rencana: tambah dan daftar dengan nama lokasi dan offset waktu asal', async () => {
  const loc = await createLocation(ALICE);
  const res = await api('POST', '/api/me/plans', ALICE, {
    title: 'Jalan pagi',
    locationId: loc.id,
    startAt: '2026-11-23T05:00:00+07:00',
    endAt: '2026-11-23T09:00:00+07:00',
  });
  assert.equal(res.status, 201);
  assert.equal(res.body.locationName, 'Taman Ganesha');
  assert.equal(res.body.startAt, '2026-11-23T05:00:00+07:00');
  assert.equal(res.body.endAt, '2026-11-23T09:00:00+07:00');

  const list = await api('GET', '/api/me/plans', ALICE);
  assert.deepEqual(list.body.plans.map((p) => p.title), ['Jalan pagi']);
});

test('rencana: validasi waktu, judul, dan lokasi', async () => {
  const loc = await createLocation(ALICE);
  const bad = await api('POST', '/api/me/plans', ALICE, {
    title: '',
    locationId: 'tidak-ada',
    startAt: '2026-11-23 05:00',
    endAt: '2026-11-23T04:00:00+07:00',
  });
  assert.equal(bad.status, 400);
  assert.deepEqual(bad.body.error.details, [
    { field: 'title', issue: 'required' },
    { field: 'startAt', issue: 'invalid_format' },
    { field: 'locationId', issue: 'not_found' },
  ]);

  const reversed = await api('POST', '/api/me/plans', ALICE, {
    title: 'X',
    locationId: loc.id,
    startAt: '2026-11-23T09:00:00+07:00',
    endAt: '2026-11-23T08:00:00+07:00',
  });
  assert.deepEqual(reversed.body.error.details, [{ field: 'endAt', issue: 'out_of_range' }]);

  const tooLong = await api('POST', '/api/me/plans', ALICE, {
    title: 'X',
    locationId: loc.id,
    startAt: '2026-11-23T05:00:00+07:00',
    endAt: '2026-11-24T06:00:00+07:00',
  });
  assert.deepEqual(tooLong.body.error.details, [{ field: 'endAt', issue: 'too_long' }]);
});

test('rencana: tidak bisa memakai lokasi orang lain', async () => {
  const loc = await createLocation(ALICE);
  const res = await api('POST', '/api/me/plans', BOB, {
    title: 'X',
    locationId: loc.id,
    startAt: '2026-11-23T05:00:00+07:00',
    endAt: '2026-11-23T06:00:00+07:00',
  });
  assert.deepEqual(res.body.error.details, [{ field: 'locationId', issue: 'not_found' }]);
});

test('rencana: ikut terhapus saat lokasinya dihapus', async () => {
  const loc = await createLocation(ALICE);
  await api('POST', '/api/me/plans', ALICE, {
    title: 'X',
    locationId: loc.id,
    startAt: '2026-11-23T05:00:00+07:00',
    endAt: '2026-11-23T06:00:00+07:00',
  });
  await api('DELETE', `/api/me/locations/${loc.id}`, ALICE);
  assert.deepEqual((await api('GET', '/api/me/plans', ALICE)).body.plans, []);
});

test('rencana: hapus milik sendiri 204, milik orang lain 404', async () => {
  const loc = await createLocation(ALICE);
  const plan = (
    await api('POST', '/api/me/plans', ALICE, {
      title: 'X',
      locationId: loc.id,
      startAt: '2026-11-23T05:00:00+07:00',
      endAt: '2026-11-23T06:00:00+07:00',
    })
  ).body;
  assert.equal((await api('DELETE', `/api/me/plans/${plan.id}`, BOB)).status, 404);
  assert.equal((await api('DELETE', `/api/me/plans/${plan.id}`, ALICE)).status, 204);
});

async function planFor(token, startAt, endAt) {
  const loc = await createLocation(token);
  return (await api('POST', '/api/me/plans', token, { title: 'Jalan pagi', locationId: loc.id, startAt, endAt })).body;
}

test('rekomendasi: jam hijau terpanjang di dalam rentang rencana (contoh Bu Rina)', async () => {
  const plan = await planFor(ALICE, '2026-11-23T05:00:00+07:00', '2026-11-23T09:00:00+07:00');
  const res = await api('GET', `/api/me/plans/${plan.id}/recommendation`, ALICE);
  assert.equal(res.status, 200);
  assert.equal(res.body.coverage, 'FULL');
  assert.equal(res.body.profile, 'umum');
  assert.deepEqual(res.body.recommendation, {
    start: '2026-11-23T05:00:00+07:00',
    end: '2026-11-23T09:00:00+07:00',
    hours: 4,
  });
  assert.equal(res.body.hours.length, 4);
});

test('rekomendasi memakai profil kesehatan pengguna', async () => {
  await api('PUT', '/api/me/health-profile', ALICE, { profile: 'asma' });
  const plan = await planFor(ALICE, '2026-11-23T05:00:00+07:00', '2026-11-23T09:00:00+07:00');
  const res = await api('GET', `/api/me/plans/${plan.id}/recommendation`, ALICE);
  assert.equal(res.body.profile, 'asma');
  assert.deepEqual(res.body.hours.map((h) => h.level), ['HIJAU', 'HIJAU', 'KUNING', 'HIJAU']);
  assert.deepEqual(res.body.recommendation, {
    start: '2026-11-23T05:00:00+07:00',
    end: '2026-11-23T07:00:00+07:00',
    hours: 2,
  });
});

test('rekomendasi: menit di awal dan akhir rencana dihormati', async () => {
  const plan = await planFor(ALICE, '2026-11-23T05:30:00+07:00', '2026-11-23T06:45:00+07:00');
  const res = await api('GET', `/api/me/plans/${plan.id}/recommendation`, ALICE);
  assert.deepEqual(res.body.recommendation, {
    start: '2026-11-23T05:30:00+07:00',
    end: '2026-11-23T06:45:00+07:00',
    hours: 2,
  });
});

test('rekomendasi: di luar jangkauan prakiraan -> coverage NONE dengan pesan, tanpa menebak', async () => {
  const plan = await planFor(ALICE, '2026-12-20T05:00:00+07:00', '2026-12-20T09:00:00+07:00');
  const res = await api('GET', `/api/me/plans/${plan.id}/recommendation`, ALICE);
  assert.equal(res.status, 200);
  assert.equal(res.body.coverage, 'NONE');
  assert.equal(res.body.recommendation, null);
  assert.deepEqual(res.body.hours, []);
  assert.match(res.body.message, /belum atau sudah tidak tersedia/);
});

test('rekomendasi rencana orang lain -> 404', async () => {
  const plan = await planFor(ALICE, '2026-11-23T05:00:00+07:00', '2026-11-23T09:00:00+07:00');
  assert.equal((await api('GET', `/api/me/plans/${plan.id}/recommendation`, BOB)).status, 404);
});
