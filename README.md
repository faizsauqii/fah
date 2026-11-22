# JamHijau

Penentu waktu aman beraktivitas di luar ruangan. Sistem kelompok **fah** (K02) untuk
Tugas Besar II3160 Teknologi Sistem Terintegrasi × II3140 Pengembangan Aplikasi Web dan Mobile, ITB.

JamHijau menilai setiap jam sebagai **HIJAU** (aman), **KUNING** (waspada, batasi aktivitas berat),
atau **MERAH** (hindari, sebaiknya di dalam ruangan). Penilaian memadukan PM2.5, PM10, indeks UV,
suhu, dan kelembapan dari [Open-Meteo](https://open-meteo.com/) dengan lima profil kesehatan:
`umum`, `asma`, `lansia`, `ibu_hamil`, `anak`. **Jam hijau** adalah rentang jam HIJAU berurutan
yang paling panjang.

| | |
|---|---|
| Base URL | `https://fah.stei.site/api` |
| Dokumentasi API (Swagger UI) | https://fah.stei.site/api/docs |
| Spesifikasi OpenAPI 3.0.3 | https://fah.stei.site/api/openapi.yaml (sumber: [`core-service/openapi.yaml`](core-service/openapi.yaml)) |
| Autentikasi | `Authorization: Bearer <JWT>` untuk pengguna, `X-API-Key` untuk kelompok lain |
| Aplikasi mobile | [`mobile/`](mobile/README.md) (React Native, Expo SDK 58) |

## Arsitektur

```
Aplikasi mobile (Expo)          Kelompok lain (server ke server)
        │ HTTPS + Bearer JWT              │ HTTPS + X-API-Key
        └──────────────┬──────────────────┘
                       ▼
        Cloudflare Tunnel  (https://fah.stei.site)
                       │
  STB ─────────────────┼──────────────────────────────────────────────
                       ▼
        gateway (Nginx :80) ── rate limit, error JSON, blokir /internal/
          │ /api/auth/*                 │ /api/* lainnya
          ▼                             ▼
   auth-service (:3001)  ◄─────── core-service (:3000) ──────► Open-Meteo
   registrasi, login JWT,  POST /internal/api-keys/verify     Air Quality API
   API key                 (X-Internal-Token)                 Forecast API
          │                             │
       auth.db (SQLite)             core.db (SQLite)
```

Setiap service berjalan di kontainer Docker sendiri dengan `mem_limit` dan `cpus`, database
SQLite milik masing-masing service (modul bawaan `node:sqlite`, tanpa kompilasi native).
Hanya kontainer `tunnel` yang terhubung ke internet; port database tidak dibuka.

| Bounded context (makalah DDD) | Diimplementasikan di |
|---|---|
| Penilaian Risiko (core) | `core-service`: `GET /risk`, `src/domain/` |
| Data Lingkungan (ACL ke Open-Meteo) | `core-service`: `src/clients/openMeteoClient.js`, cache `env_cache` |
| Profil Pengguna | `core-service`: `/me/health-profile`, `/me/locations` |
| Rencana Aktivitas | `core-service`: `/me/plans`, `/me/plans/{id}/recommendation` |
| Identitas dan Akses | `auth-service` (JWT, API key) |
| Notifikasi | aplikasi mobile |

## Cara mendapat akses

| Pemanggil | Cara | Batas pemanggilan (gateway) |
|---|---|---|
| Publik | `GET /risk` dan `GET /profiles` tanpa header apa pun | 30/menit per IP, burst 10 |
| Pengguna aplikasi | daftar `POST /auth/register` atau masuk `POST /auth/login`, lalu kirim `Authorization: Bearer <accessToken>` (berlaku 7 hari) | 30/menit per IP |
| Kelompok lain | minta API key (format `jh_...`) dengan membuka **GitHub Issue** di repositori ini berisi nama kelompok dan kontak; kirim key di header `X-API-Key` | 120/menit per key, burst 30 |

`/auth/login` dan `/auth/register` dibatasi 10/menit per IP (burst 5). Akun uji untuk dosen dan
kelompok lain: `demo@fah.stei.site`; password diberikan bersama API key (tidak ditulis di repositori).
Jika `Authorization` dan `X-API-Key` dikirim bersamaan, yang dipakai JWT.

## Daftar endpoint

Semua path relatif terhadap base URL `https://fah.stei.site/api`.

| Method | Path | Akses | Keterangan |
|---|---|---|---|
| GET | `/health` | publik | status gateway |
| GET | `/core/health`, `/auth/health` | publik | status service dan database-nya |
| POST | `/auth/register` | publik | daftar; respons 201 langsung berisi token |
| POST | `/auth/login` | publik | masuk, mendapat JWT |
| GET | `/auth/me` | JWT | data akun |
| POST, GET | `/auth/api-keys` | JWT admin | terbitkan / daftar API key |
| DELETE | `/auth/api-keys/{id}` | JWT admin | cabut API key |
| GET | `/profiles` | publik, JWT, API key | lima profil kesehatan |
| GET | `/risk?lat=&lon=&profile=` | publik, JWT, API key | prakiraan 24 jam + jam hijau |
| GET, PUT | `/me/health-profile` | JWT | profil kesehatan pengguna (bawaan `umum`) |
| GET, POST | `/me/locations` | JWT | lokasi tersimpan (maks. 50) |
| PUT, DELETE | `/me/locations/{id}` | JWT | ubah / hapus lokasi (rencana di lokasi itu ikut terhapus) |
| GET, POST | `/me/plans` | JWT | rencana aktivitas (maks. 24 jam per rencana, maks. 100) |
| DELETE | `/me/plans/{id}` | JWT | hapus rencana |
| GET | `/me/plans/{id}/recommendation` | JWT | jam hijau terbaik di dalam rentang rencana |
| GET | `/docs`, `/openapi.yaml` | publik | dokumentasi |

Skema request dan respons lengkap ada di Swagger UI.

## Contoh request

Penilaian risiko di Bandung untuk profil asma (tanpa autentikasi):

```sh
curl "https://fah.stei.site/api/risk?lat=-6.8915&lon=107.6107&profile=asma"
```

```json
{
  "location": { "lat": -6.89, "lon": 107.61, "timezone": "Asia/Jakarta" },
  "profile": "asma",
  "generatedAt": "2026-11-22T18:39:00+07:00",
  "greenWindow": null,
  "hours": [
    {
      "time": "2026-11-22T18:00:00+07:00",
      "level": "KUNING",
      "pm25": 61.5, "pm10": 61.7, "uvIndex": 0,
      "temperature": 24.3, "humidity": 85, "heatIndex": 24.7,
      "ispu": 106, "ispuCategory": "Tidak Sehat",
      "factors": {
        "air": { "level": "KUNING", "ispu": 106, "category": "Tidak Sehat", "criticalParameter": "pm25" },
        "uv": { "uvIndex": 0, "level": "HIJAU" },
        "heat": { "heatIndex": 24.7, "category": "NORMAL", "level": "HIJAU" }
      },
      "missing": []
    }
  ]
}
```

(Dipotong: `hours` berisi 24 jam. Respons juga memuat `basis` dan `source`.)

Sebagai kelompok lain, dengan API key:

```sh
curl -H "X-API-Key: jh_..." "https://fah.stei.site/api/risk?lat=-6.2&lon=106.82&profile=lansia"
```

Sebagai pengguna: masuk, lalu menyimpan lokasi dan rencana.

```sh
TOKEN=$(curl -s -X POST https://fah.stei.site/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"demo@fah.stei.site","password":"<password>"}' | jq -r .accessToken)

curl -X POST https://fah.stei.site/api/me/locations \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Taman Ganesha","lat":-6.8915,"lon":107.6107}'

curl -X POST https://fah.stei.site/api/me/plans \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"title":"Jalan pagi","locationId":"<id lokasi>","startAt":"2026-11-28T05:00:00+07:00","endAt":"2026-11-28T09:00:00+07:00"}'

curl -H "Authorization: Bearer $TOKEN" \
  https://fah.stei.site/api/me/plans/<id rencana>/recommendation
```

Semua error memakai format yang sama:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Parameter tidak valid. lat -90..90, lon -180..180, profile salah satu dari: umum, asma, lansia, ibu_hamil, anak.",
    "details": [{ "field": "lat", "issue": "out_of_range" }]
  }
}
```

| HTTP | `code` |
|---|---|
| 400 | `VALIDATION_ERROR` |
| 401 | `UNAUTHENTICATED`, `INVALID_TOKEN`, `INVALID_API_KEY` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` (termasuk data milik pengguna lain) |
| 409 | `CONFLICT` |
| 429 | `RATE_LIMITED` |
| 502, 504 | `BAD_GATEWAY`, `GATEWAY_TIMEOUT` |
| 503 | `UPSTREAM_UNAVAILABLE` (Open-Meteo), `AUTH_UNAVAILABLE` |

## Aturan penilaian risiko

Tingkat satu jam adalah faktor terburuk dari tiga faktor berikut. Jika salah satu data tidak
tersedia, tingkat jam itu `null`; sistem tidak menebak.

| Faktor | Umum | Profil rentan (`asma`, `lansia`, `ibu_hamil`, `anak`) | Sumber |
|---|---|---|---|
| Udara (ISPU PM2.5 & PM10, nilai tertinggi) | Baik, Sedang: HIJAU · Tidak Sehat: KUNING · Sangat Tidak Sehat, Berbahaya: MERAH | Baik: HIJAU · Sedang, Tidak Sehat: KUNING · Sangat Tidak Sehat, Berbahaya: MERAH | Permen LHK No. P.14/MENLHK/SETJEN/KUM.1/7/2020, Lampiran I (batas konsentrasi) dan II (saran per kategori) |
| Indeks UV (dibulatkan) | 0–2: HIJAU · 3–7: KUNING · 8+: MERAH | sama | WHO, *Global Solar UV Index: A Practical Guide* (2002) |
| Panas (heat index) | < 90°F: HIJAU · 90–103°F: KUNING · ≥ 103°F: MERAH | < 80°F: HIJAU · 80–90°F: KUNING · ≥ 90°F: MERAH | NOAA/NWS (regresi Rothfusz, kategori Caution s.d. Extreme Danger) |

Catatan:

- ISPU resmi dihitung dari rata-rata 24 jam. JamHijau memakai konsentrasi per jam sebagai
  **indikasi** agar jam yang berbeda bisa dibandingkan.
- Batas panas yang lebih ketat untuk profil rentan adalah kebijakan JamHijau; NWS tidak memberi
  angka khusus per kelompok.
- Data Open-Meteo adalah prakiraan model, bukan pengukuran stasiun. Prakiraan kualitas udara
  tersedia sekitar 5 hari ke depan; rencana di luar jangkauan itu dijawab `coverage: NONE`.
- Jam hijau di `GET /risk` dicari pukul 05.00–21.00 waktu lokal. Di rekomendasi rencana, jam hijau
  dicari di dalam rentang rencana.
- Koordinat dibulatkan ke 2 desimal (sekitar 1 km) dan data Open-Meteo di-cache 60 menit per area.

## Menjalankan di laptop

Butuh Docker (dengan plugin compose).

```sh
cp .env.example .env    # isi JWT_SECRET dan INTERNAL_TOKEN: berbeda, masing-masing ≥ 32 karakter
docker compose up -d --build
curl http://127.0.0.1:8080/api/health
curl "http://127.0.0.1:8080/api/risk?lat=-6.89&lon=107.61"
```

Swagger UI lokal: http://127.0.0.1:8080/api/docs.

Tes otomatis (butuh Node.js ≥ 22.13):

```sh
(cd core-service && npm install && npm test)
(cd auth-service && npm install && npm test)
(cd mobile && npm install && npm test)
```

Aplikasi mobile: lihat [`mobile/README.md`](mobile/README.md).

## Deploy di STB

Lihat [`docs/DEPLOY-STB.md`](docs/DEPLOY-STB.md) (kebutuhan STB, isi `.env`, Cloudflare Tunnel,
penerbitan API key, backup). Memperbarui kode di STB:

```sh
git pull && docker compose --profile stb up -d --build
```

Profil `stb` menyalakan kontainer `tunnel` (cloudflared).

## Struktur repositori

```
gateway/nginx.conf   routing, rate limit, error JSON
auth-service/        registrasi, login JWT, API key
core-service/        penilaian risiko, data lingkungan, profil, rencana; openapi.yaml
mobile/              aplikasi React Native (Expo)
docs/DEPLOY-STB.md   panduan deploy di STB
scripts/             cek-stb.sh, backup.sh
docker-compose.yml   gateway, auth-service, core-service, tunnel
.env.example         daftar variabel lingkungan (tanpa nilai rahasia)
```

## Anggota

| Nama | NIM | Peran |
|---|---|---|
| Syafaq Jiwa Raharjo | 18224050 | core-service, kontrak API dan dokumentasi, aplikasi mobile |
| Faiz Muhammad Sauqi | 18224086 | STB, Cloudflare Tunnel, gateway, auth-service, docker-compose, deploy |
