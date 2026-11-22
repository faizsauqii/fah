import { test, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../src/app.js';
import { openDatabase } from '../src/db/index.js';
import { errors } from '../src/errors.js';

const HOUR = 3_600_000;
const OFFSET = 25200;
const MIDNIGHT_WIB = Date.UTC(2026, 10, 23, 0, 0, 0) - OFFSET * 1000;
const NOW = MIDNIGHT_WIB + 6 * HOUR + 20 * 60_000;

function buildHours() {
  return Array.from({ length: 72 }, (_, i) => {
    const localHour = i % 24;
    const dirtyNight = localHour < 7 || localHour >= 19;
    return {
      epochMs: MIDNIGHT_WIB + i * HOUR,
      pm25: dirtyNight ? 120 : 10,
      pm10: dirtyNight ? 120 : 20,
      uvIndex: localHour >= 10 && localHour <= 14 ? 9 : 1,
      temperature: 24,
      humidity: 70,
    };
  });
}

let server;
let baseUrl;
let db;
let calls;
let fail;

const fakeOpenMeteo = {
  async getHourlyConditions(lat, lon) {
    calls.push([lat, lon]);
    if (fail) throw errors.upstreamUnavailable();
    return { timezone: 'Asia/Jakarta', utcOffsetSeconds: OFFSET, hours: buildHours() };
  },
};

before(async () => {
  db = openDatabase(':memory:');
  const app = createApp({ config: { nodeEnv: 'test' }, db, openMeteo: fakeOpenMeteo, now: () => NOW });
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
  calls = [];
  fail = false;
  db.exec('DELETE FROM env_cache');
});

const get = async (path) => {
  const res = await fetch(`${baseUrl}${path}`);
  return { status: res.status, body: await res.json() };
};

test('GET /api/profiles mengembalikan lima profil', async () => {
  const { status, body } = await get('/api/profiles');
  assert.equal(status, 200);
  assert.deepEqual(
    body.profiles.map((p) => p.value),
    ['umum', 'asma', 'lansia', 'ibu_hamil', 'anak'],
  );
});

test('GET /api/risk: 24 jam mulai dari jam sekarang, waktu ber-offset lokasi', async () => {
  const { status, body } = await get('/api/risk?lat=-6.8915&lon=107.6107&profile=umum');
  assert.equal(status, 200);
  assert.equal(body.hours.length, 24);
  assert.equal(body.hours[0].time, '2026-11-23T06:00:00+07:00');
  assert.equal(body.location.timezone, 'Asia/Jakarta');
  assert.deepEqual([body.location.lat, body.location.lon], [-6.89, 107.61]);
  assert.deepEqual(calls, [[-6.89, 107.61]]);
  assert.equal(body.generatedAt, '2026-11-23T06:20:00+07:00');
  assert.ok(Array.isArray(body.basis) && body.basis.length === 3);
});

test('GET /api/risk: tingkat per jam dan jam hijau terbaik', async () => {
  const { body } = await get('/api/risk?lat=-6.89&lon=107.61&profile=umum');
  const levelAt = (hh) => body.hours.find((h) => h.time.includes(`T${hh}:00`)).level;
  assert.equal(levelAt('06'), 'KUNING');
  assert.equal(levelAt('08'), 'HIJAU');
  assert.equal(levelAt('12'), 'MERAH');
  assert.deepEqual(body.greenWindow, {
    start: '2026-11-23T15:00:00+07:00',
    end: '2026-11-23T19:00:00+07:00',
    hours: 4,
  });
  const h = body.hours[0];
  for (const key of ['pm25', 'pm10', 'uvIndex', 'temperature', 'humidity', 'heatIndex', 'ispu', 'ispuCategory', 'factors']) {
    assert.ok(key in h, `jam harus memuat ${key}`);
  }
});

test('GET /api/risk: profil tidak diisi memakai umum', async () => {
  const { status, body } = await get('/api/risk?lat=-6.89&lon=107.61');
  assert.equal(status, 200);
  assert.equal(body.profile, 'umum');
});

test('GET /api/risk: permintaan kedua di area yang sama memakai cache', async () => {
  await get('/api/risk?lat=-6.891&lon=107.612&profile=umum');
  await get('/api/risk?lat=-6.889&lon=107.608&profile=asma');
  assert.equal(calls.length, 1);
});

test('GET /api/risk: validasi parameter', async () => {
  const { status, body } = await get('/api/risk?lat=91&lon=abc&profile=atlet');
  assert.equal(status, 400);
  assert.equal(body.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(body.error.details, [
    { field: 'lat', issue: 'out_of_range' },
    { field: 'lon', issue: 'invalid_format' },
    { field: 'profile', issue: 'invalid_value' },
  ]);
  assert.equal(calls.length, 0);
});

test('GET /api/risk: lat/lon wajib', async () => {
  const { status, body } = await get('/api/risk');
  assert.equal(status, 400);
  assert.deepEqual(
    body.error.details.map((d) => [d.field, d.issue]),
    [
      ['lat', 'required'],
      ['lon', 'required'],
    ],
  );
});

test('GET /api/risk: Open-Meteo mati -> 503 UPSTREAM_UNAVAILABLE, tanpa menebak', async () => {
  fail = true;
  const { status, body } = await get('/api/risk?lat=-6.89&lon=107.61&profile=umum');
  assert.equal(status, 503);
  assert.equal(body.error.code, 'UPSTREAM_UNAVAILABLE');
});
