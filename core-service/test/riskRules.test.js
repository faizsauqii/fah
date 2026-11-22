import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assessHour, findGreenWindow, uvLevel, worstLevel } from '../src/domain/riskRules.js';

const clean = { pm25: 10, pm10: 20, uvIndex: 1, temperature: 22, humidity: 70 };

test('kondisi bersih -> HIJAU untuk semua profil', () => {
  for (const profile of ['umum', 'asma', 'lansia', 'ibu_hamil', 'anak']) {
    assert.equal(assessHour(clean, profile).level, 'HIJAU', profile);
  }
});

test('udara Sedang: umum HIJAU, profil rentan KUNING', () => {
  const sedang = { ...clean, pm25: 31.4 };
  assert.equal(assessHour(sedang, 'umum').level, 'HIJAU');
  assert.equal(assessHour(sedang, 'asma').level, 'KUNING');
  assert.equal(assessHour(sedang, 'anak').level, 'KUNING');
});

test('udara Tidak Sehat: KUNING untuk semua profil', () => {
  const tidakSehat = { ...clean, pm25: 100 };
  assert.equal(assessHour(tidakSehat, 'umum').level, 'KUNING');
  assert.equal(assessHour(tidakSehat, 'lansia').level, 'KUNING');
});

test('udara Sangat Tidak Sehat: MERAH untuk semua profil', () => {
  const sts = { ...clean, pm25: 200 };
  assert.equal(assessHour(sts, 'umum').level, 'MERAH');
  assert.equal(assessHour(sts, 'asma').level, 'MERAH');
});

test('UV mengikuti kategori perlindungan WHO setelah dibulatkan', () => {
  assert.deepEqual([0, 2.4, 2.5, 7.4, 7.5, 11].map(uvLevel), ['HIJAU', 'HIJAU', 'KUNING', 'KUNING', 'MERAH', 'MERAH']);
});

test('panas Caution: umum HIJAU, profil rentan KUNING', () => {
  const caution = { ...clean, temperature: 30, humidity: 50 };
  assert.equal(assessHour(caution, 'umum').factors.heat.category, 'CAUTION');
  assert.equal(assessHour(caution, 'umum').level, 'HIJAU');
  assert.equal(assessHour(caution, 'ibu_hamil').level, 'KUNING');
});

test('panas Extreme Caution: umum KUNING, profil rentan MERAH', () => {
  const extreme = { ...clean, temperature: 31, humidity: 60 };
  assert.equal(assessHour(extreme, 'umum').factors.heat.category, 'EXTREME_CAUTION');
  assert.equal(assessHour(extreme, 'umum').level, 'KUNING');
  assert.equal(assessHour(extreme, 'lansia').level, 'MERAH');
});

test('tingkat jam = faktor terburuk', () => {
  assert.equal(worstLevel(['HIJAU', 'MERAH', 'KUNING']), 'MERAH');
  assert.equal(assessHour({ ...clean, uvIndex: 9 }, 'umum').level, 'MERAH');
});

test('data yang hilang membuat tingkat null, tidak ditebak', () => {
  const result = assessHour({ ...clean, uvIndex: null }, 'umum');
  assert.equal(result.level, null);
  assert.deepEqual(result.missing, ['uv']);
});

const HOUR = 3_600_000;
const series = (levels, startHour = 0) =>
  levels.map((level, i) => ({ level, epochMs: i * HOUR, localHour: (startHour + i) % 24 }));

test('jam hijau = rentang HIJAU terpanjang', () => {
  const hours = series(['MERAH', 'MERAH', 'MERAH', 'MERAH', 'MERAH', 'HIJAU', 'KUNING', 'HIJAU', 'HIJAU', 'HIJAU', 'MERAH']);
  const w = findGreenWindow(hours);
  assert.equal(w.startIndex, 7);
  assert.equal(w.length, 3);
});

test('jika sama panjang, pilih yang paling awal', () => {
  const hours = series(['MERAH', 'MERAH', 'MERAH', 'MERAH', 'MERAH', 'HIJAU', 'HIJAU', 'KUNING', 'HIJAU', 'HIJAU']);
  assert.equal(findGreenWindow(hours).startIndex, 5);
});

test('jam hijau hanya dicari pukul 05.00-21.00 waktu lokal', () => {
  const hours = series(Array(24).fill('HIJAU'));
  const w = findGreenWindow(hours);
  assert.equal(w.first.localHour, 5);
  assert.equal(w.last.localHour, 20);
  assert.equal(w.length, 16);
});

test('tidak ada HIJAU -> null', () => {
  assert.equal(findGreenWindow(series(['KUNING', 'MERAH'], 8)), null);
});

test('level null tidak dihitung sebagai HIJAU', () => {
  const hours = series([null, null, null, null, null, null, null, 'HIJAU', null]);
  const w = findGreenWindow(hours);
  assert.equal(w.startIndex, 7);
  assert.equal(w.length, 1);
});
