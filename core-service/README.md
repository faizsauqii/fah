# core-service JamHijau

Bounded context: Penilaian Risiko, Data Lingkungan, Profil Pengguna, Rencana Aktivitas.
Penanggung jawab kode: Anggota N. Deploy ke STB: Anggota S.

## Menjalankan di laptop (tanpa Docker)

Butuh Node.js 22.13 atau lebih baru.

```bash
cd core-service
cp .env.example .env
npm install
npm run dev          # http://localhost:3000/healthz
npm test
```

## Menjalankan di laptop (dengan Docker, sama seperti di STB)

```bash
cd core-service
cp .env.example .env
docker compose -f docker-compose.dev.yml up --build
curl http://localhost:3000/healthz
```

## Struktur

```
src/
  server.js            # titik masuk, shutdown rapi saat SIGTERM
  app.js               # membuat aplikasi Express (dipakai juga oleh test)
  config.js            # membaca .env; JWT_SECRET wajib di production
  errors.js            # format error bersama + handler
  clients/authClient.js  # verifikasi API key ke auth-service (kirim X-Internal-Token, cache 60 dtk)
  db/index.js          # node:sqlite, PRAGMA, runner migrasi
  db/migrations.js     # skema tabel (tambah migrasi baru, jangan ubah yang lama)
  routes/health.js     # /healthz dan /api/core/health
  routes/placeholders.js  # endpoint kontrak yang belum dibuat (501)
test/
  app.test.js          # health, 404, 501, migrasi
  authClient.test.js   # stub auth-service: header, cache, timeout, token salah
  config.test.js       # INTERNAL_TOKEN & JWT_SECRET wajib di production
```

## Catatan

- `node:sqlite` dipakai agar tidak perlu kompilasi native di STB ARM.
  Di Node 22 modul ini masih berlabel experimental, jadi peringatannya
  dimatikan dengan `--disable-warning=ExperimentalWarning`.
- Endpoint di `routes/placeholders.js` dihapus satu per satu saat versi aslinya selesai.
