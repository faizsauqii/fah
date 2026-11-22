# JamHijau

Penentu waktu aman beraktivitas di luar ruangan. Microservice kelompok **fah**
(K02) untuk Tugas Besar II3160 TST × II3140 PWAM.

**Base URL:** https://fah.stei.site/api

## Struktur

```
gateway/          Nginx: routing, rate limit, error JSON (Anggota S)
auth-service/     registrasi, login JWT, API key (Anggota S)
core-service/     penilaian risiko, data lingkungan, profil, rencana (Anggota N)
mobile/           aplikasi React Native (Expo), lihat mobile/README.md (Anggota N)
docs/             DEPLOY-STB.md
scripts/          cek-stb.sh, backup.sh
docker-compose.yml
.env.example
```

## Menjalankan di laptop

```sh
cp .env.example .env      # isi JWT_SECRET dan INTERNAL_TOKEN (berbeda, ≥ 32 karakter)
docker compose up -d --build
curl http://127.0.0.1:8080/api/health
```

Deploy di STB: lihat `docs/DEPLOY-STB.md`.

## Status

| Bagian | Status |
|---|---|
| Gateway, auth-service, skrip deploy STB | kode tersedia |
| core-service | kerangka: health check dan migrasi database; endpoint domain masih menjawab `501 NOT_IMPLEMENTED` |
| Dokumentasi OpenAPI / Postman | menyusul |

## Anggota

- Syafaq Jiwa Raharjo (18224050)
- Faiz Muhammad Sauqi (18224086)
