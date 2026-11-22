import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeIspu, ispuCategory, assessAirQuality } from '../src/domain/ispu.js';

test('contoh resmi Permen LHK P.14/2020: PM2.5 31,4 -> ISPU 70 (Sedang)', () => {
  assert.equal(computeIspu('pm25', 31.4), 70);
  assert.equal(ispuCategory(70), 'SEDANG');
});

test('contoh resmi Permen LHK P.14/2020: PM10 35 -> ISPU 35 (Baik)', () => {
  assert.equal(computeIspu('pm10', 35), 35);
  assert.equal(ispuCategory(35), 'BAIK');
});

test('batas konsentrasi Lampiran I memetakan tepat ke batas ISPU', () => {
  assert.deepEqual(
    [15.5, 55.4, 150.4, 250.4, 500].map((c) => computeIspu('pm25', c)),
    [50, 100, 200, 300, 500],
  );
  assert.deepEqual(
    [50, 150, 350, 420, 500].map((c) => computeIspu('pm10', c)),
    [50, 100, 200, 300, 500],
  );
});

test('kategori ISPU sesuai Lampiran II', () => {
  assert.deepEqual(
    [0, 50, 51, 100, 101, 200, 201, 300, 301].map(ispuCategory),
    ['BAIK', 'BAIK', 'SEDANG', 'SEDANG', 'TIDAK_SEHAT', 'TIDAK_SEHAT', 'SANGAT_TIDAK_SEHAT', 'SANGAT_TIDAK_SEHAT', 'BERBAHAYA'],
  );
});

test('konsentrasi di atas 500 tetap Berbahaya', () => {
  assert.equal(ispuCategory(computeIspu('pm25', 650)), 'BERBAHAYA');
});

test('nilai kosong atau negatif tidak ditebak', () => {
  assert.equal(computeIspu('pm25', null), null);
  assert.equal(computeIspu('pm25', -1), null);
  assert.equal(assessAirQuality({ pm25: 20, pm10: null }), null);
});

test('ISPU udara memakai parameter tertinggi sebagai parameter kritis', () => {
  const air = assessAirQuality({ pm25: 31.4, pm10: 35 });
  assert.equal(air.ispu, 70);
  assert.equal(air.criticalParameter, 'pm25');
  assert.equal(air.categoryLabel, 'Sedang');
});
