import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  heatIndexFahrenheit,
  heatCategory,
  assessHeat,
  celsiusToFahrenheit,
} from '../src/domain/heatIndex.js';

test('contoh NWS: 96°F dan RH 65% -> heat index sekitar 121°F', () => {
  assert.equal(Math.round(heatIndexFahrenheit(96, 65)), 121);
});

test('di bawah 80°F memakai rumus sederhana yang dirata-ratakan dengan suhu', () => {
  const t = 70;
  const rh = 50;
  const simple = 0.5 * (t + 61 + (t - 68) * 1.2 + rh * 0.094);
  assert.equal(heatIndexFahrenheit(t, rh), (simple + t) / 2);
});

test('kategori NWS', () => {
  assert.deepEqual(
    [79.9, 80, 89.9, 90, 102.9, 103, 124.9, 125].map(heatCategory),
    ['NORMAL', 'CAUTION', 'CAUTION', 'EXTREME_CAUTION', 'EXTREME_CAUTION', 'DANGER', 'DANGER', 'EXTREME_DANGER'],
  );
});

test('assessHeat menerima Celsius dan mengembalikan heat index dalam Celsius', () => {
  const result = assessHeat({ temperature: 30.5, humidity: 53 });
  assert.equal(typeof result.heatIndex, 'number');
  assert.equal(result.category, heatCategory(heatIndexFahrenheit(celsiusToFahrenheit(30.5), 53)));
});

test('data suhu atau kelembapan kosong tidak ditebak', () => {
  assert.equal(assessHeat({ temperature: null, humidity: 50 }), null);
});
