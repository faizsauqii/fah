# Deploy JamHijau di STB (Anggota S)

## Arsitektur
Internet -> Cloudflare (fah.stei.site) -> `tunnel` (cloudflared) -> `gateway` (Nginx :80)
-> `/api/auth/*` ke `auth-service:3001`, `/api/*` lain ke `core-service:3000`.
Hanya `tunnel` yang keluar ke internet. Tidak ada port database yang dibuka.
Port `127.0.0.1:8080` di gateway hanya untuk cek dari dalam STB (lewat SSH).

| Service | Image / build | mem_limit | cpus |
|---|---|---|---|
| gateway | nginx:1.28-alpine | 64m | 0.25 |
| auth-service | ./auth-service (node:22-bookworm-slim) | 128m | 0.25 |
| core-service | ./core-service (node:22-bookworm-slim) | 256m | 0.5 |
| tunnel | cloudflare/cloudflared (profil `stb`) | 64m | 0.25 |

Semua service: `restart: unless-stopped`, data SQLite di named volume `auth-data` dan `core-data`.

## Langkah pertama kali
1. Cek STB: `./scripts/cek-stb.sh` (perlu `aarch64`/`x86_64`, Docker + plugin compose).
2. `git clone https://github.com/faizsauqii/fah.git && cd fah && cp .env.example .env`, lalu isi `.env`:
   - `JWT_SECRET`: `openssl rand -base64 48`
   - `INTERNAL_TOKEN`: jalankan perintah yang sama sekali lagi (harus beda dari `JWT_SECRET`)
   - `ADMIN_PASSWORD`, `DEMO_PASSWORD`: password kuat
   - `TUNNEL_TOKEN`: dari Cloudflare Zero Trust > Networks > Tunnels.
     Public Hostname `fah.stei.site` -> Service `http://gateway:80`.
3. `docker compose --profile stb up -d --build`
4. Cek: `docker compose ps` (semua healthy), lalu
   `curl http://127.0.0.1:8080/api/health` dan `curl https://fah.stei.site/api/health`.

## Update kode
`git pull && docker compose --profile stb up -d --build`

## Menerbitkan API key untuk kelompok lain
```sh
TOKEN=$(curl -s -X POST https://fah.stei.site/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"<ADMIN_EMAIL>","password":"<ADMIN_PASSWORD>"}' | jq -r .accessToken)
curl -s -X POST https://fah.stei.site/api/auth/api-keys \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"group":"nama-kelompok","contact":"email@std.stei.itb.ac.id"}'
```
Key (`jh_...`) hanya tampil sekali. Daftar: `GET /api/auth/api-keys`, cabut: `DELETE /api/auth/api-keys/<id>`.

## Backup
`./scripts/backup.sh` menyalin `auth.db` dan `core.db` ke `backups/` (7 salinan terakhir disimpan).
Cron harian jam 02.00: `0 2 * * * cd ~/fah && ./scripts/backup.sh >> backups/backup.log 2>&1`

## Rate limit (gateway)
| Pemanggil | Batas |
|---|---|
| Anonim (per IP asli, CF-Connecting-IP) | 30/menit, burst 10 |
| Membawa X-API-Key (per key) | 120/menit, burst 30 |
| /api/auth/login dan /register (per IP) | 10/menit, burst 5 |

Semua error dari gateway berformat `{"error":{"code","message"}}` (RATE_LIMITED, BAD_GATEWAY, GATEWAY_TIMEOUT, NOT_FOUND).

## Endpoint milik auth-service
| Method | Path | Akses |
|---|---|---|
| POST | /api/auth/register | publik |
| POST | /api/auth/login | publik |
| GET | /api/auth/me | JWT |
| POST/GET | /api/auth/api-keys | JWT admin |
| DELETE | /api/auth/api-keys/:id | JWT admin |
| GET | /api/auth/health | publik |
| POST | /internal/api-keys/verify | hanya jaringan Docker (diblokir gateway) + header `X-Internal-Token` |

## Log
`docker compose logs -f gateway` (atau `auth-service`, `core-service`, `tunnel`).
