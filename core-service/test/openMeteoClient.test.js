import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createOpenMeteoClient } from '../src/clients/openMeteoClient.js';

const silent = { error() {} };
const T0 = 1795280400;

const airBody = {
  timezone: 'Asia/Jakarta',
  utc_offset_seconds: 25200,
  hourly: { time: [T0, T0 + 3600], pm2_5: [12.5, null], pm10: [20, 22], uv_index: [0, 0.4] },
};
const weatherBody = {
  timezone: 'Asia/Jakarta',
  utc_offset_seconds: 25200,
  hourly: { time: [T0 + 3600, T0], temperature_2m: [21, 20.5], relative_humidity_2m: [90, 92] },
};

const jsonResponse = (status, body) => ({ ok: status < 400, status, json: async () => body });

function fakeFetch() {
  const calls = [];
  const fn = async (url, options) => {
    calls.push({ url: new URL(url), options });
    return jsonResponse(200, url.includes('air-quality') ? airBody : weatherBody);
  };
  fn.calls = calls;
  return fn;
}

test('memanggil kedua API dengan timezone=auto, unixtime, dan User-Agent', async () => {
  const fetchImpl = fakeFetch();
  const client = createOpenMeteoClient({ userAgent: 'JamHijau/1.0 (kelompok-fah K02)', fetchImpl, logger: silent });
  await client.getHourlyConditions(-6.89, 107.61);

  assert.equal(fetchImpl.calls.length, 2);
  for (const { url, options } of fetchImpl.calls) {
    assert.equal(url.searchParams.get('timezone'), 'auto');
    assert.equal(url.searchParams.get('timeformat'), 'unixtime');
    assert.equal(url.searchParams.get('latitude'), '-6.89');
    assert.equal(options.headers['user-agent'], 'JamHijau/1.0 (kelompok-fah K02)');
  }
  const hourly = fetchImpl.calls.map((c) => c.url.searchParams.get('hourly')).sort();
  assert.deepEqual(hourly, ['pm2_5,pm10,uv_index', 'temperature_2m,relative_humidity_2m']);
});

test('menggabungkan data udara dan cuaca berdasarkan waktu, null tetap null', async () => {
  const client = createOpenMeteoClient({ fetchImpl: fakeFetch(), logger: silent });
  const data = await client.getHourlyConditions(-6.89, 107.61);

  assert.equal(data.timezone, 'Asia/Jakarta');
  assert.equal(data.utcOffsetSeconds, 25200);
  assert.deepEqual(data.hours[0], { epochMs: T0 * 1000, pm25: 12.5, pm10: 20, uvIndex: 0, temperature: 20.5, humidity: 92 });
  assert.equal(data.hours[1].pm25, null);
  assert.equal(data.hours[1].temperature, 21);
});

test('jaringan gagal -> 503 UPSTREAM_UNAVAILABLE', async () => {
  const client = createOpenMeteoClient({
    fetchImpl: async () => {
      throw new TypeError('fetch failed');
    },
    logger: silent,
  });
  await assert.rejects(client.getHourlyConditions(0, 0), { status: 503, code: 'UPSTREAM_UNAVAILABLE' });
});

test('Open-Meteo menjawab error -> 503 UPSTREAM_UNAVAILABLE', async () => {
  const client = createOpenMeteoClient({
    fetchImpl: async () => jsonResponse(400, { error: true, reason: 'Latitude must be in range' }),
    logger: silent,
  });
  await assert.rejects(client.getHourlyConditions(0, 0), { code: 'UPSTREAM_UNAVAILABLE' });
});

test('format respons tidak dikenal -> 503 UPSTREAM_UNAVAILABLE', async () => {
  const client = createOpenMeteoClient({ fetchImpl: async () => jsonResponse(200, { hourly: {} }), logger: silent });
  await assert.rejects(client.getHourlyConditions(0, 0), { code: 'UPSTREAM_UNAVAILABLE' });
});
