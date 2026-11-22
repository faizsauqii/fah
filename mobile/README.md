# JamHijau Mobile (kelompok fah)

Aplikasi React Native (Expo SDK 58) untuk JamHijau: kapan aman beraktivitas di
luar ruangan. Memanggil microservice kelompok di `https://fah.stei.site/api`.

## Menjalankan (Expo Go)

Butuh Node.js 22.13+ (syarat `expo@58`: 22.13, 24.3, atau 26 ke atas) dan aplikasi **Expo Go** versi terbaru di HP (Expo Go
hanya mendukung SDK terbaru, saat ini SDK 58).

```bash
cd mobile
npm install
cp .env.example .env        # isi EXPO_PUBLIC_API_URL jika bukan server publik
npx expo start -c           # scan QR code dengan Expo Go
```

Setelah mengubah `.env`, muat ulang penuh aplikasi (goyangkan HP → Reload).

### Backend lokal

Jika server publik belum aktif, jalankan backend di laptop (`docker compose up -d --build`
di root repo). `docker-compose.yml` mem-bind gateway ke `127.0.0.1:8080`, jadi HP
**tidak** bisa menjangkaunya lewat IP laptop. Untuk uji di HP, buat file
`docker-compose.override.yml` di root repo (jangan di-commit) berisi:

```yaml
services:
  gateway:
    ports:
      - "8080:80"
```

lalu isi `EXPO_PUBLIC_API_URL=http://<IP-laptop>:8080/api` di `mobile/.env`.
HP dan laptop harus satu Wi-Fi.

## Akun demo

Email `demo@fah.stei.site`. Password tidak ditulis di repo; minta ke Anggota S.

## Fitur dan layar

| Tab / layar | Isi | Login |
|---|---|---|
| Masuk, Daftar | form dengan validasi yang sama dengan auth-service | – |
| Cek Risiko (tab) | GPS + profil kesehatan → `GET /risk` | tidak |
| Lokasi (tab) → Tambah Lokasi (stack) | daftar dan form lokasi tersimpan | ya |
| Rencana (tab) → Rencana Baru, Detail Rencana (stack) | rencana aktivitas + saran jam hijau | ya |
| Profil (tab) → Tentang (stack) | `GET /auth/me`, profil kesehatan, keluar, status server | ya (Tentang: tidak) |

Tamu ("Lanjut sebagai tamu") hanya bisa memakai Cek Risiko; tab lain menampilkan ajakan masuk.
Token disimpan di `expo-secure-store` dan dicek ulang ke `GET /auth/me` saat aplikasi dibuka.

Saat ini endpoint core-service masih menjawab `501 NOT_IMPLEMENTED`. Aplikasi menampilkan
pesan "Fitur ini belum tersedia" (bukan crash). Bentuk respons yang dipakai layar ditulis
sebagai komentar di tiap layar dan di `src/services/ApiService.js`, dan harus disamakan
dengan `docs/openapi.yaml` saat endpoint dibuat.

## Struktur

```
App.js                  # SafeAreaProvider + AuthProvider + AppNavigator
src/
  navigation/AppNavigator.js   # stack (Masuk/Daftar atau Main + form/detail) + bottom tab
  context/AuthContext.js       # token, user, tamu, login/daftar/keluar, SecureStore
  services/ApiService.js       # request(): base URL, Bearer, timeout, format error bersama
  hooks/useForm.js, useApiData.js
  utils/validators.js, time.js, location.js, constants.js
  components/                  # Button, CustomInput, HeaderBar, StateView, Chips, ...
  screens/
__tests__/              # Jest: validators, ApiService (fetch tiruan), komponen
```

## Testing

```bash
npm test
```

Penanganan kondisi yang diuji: 400 per field, 401, 409, 501, jaringan putus, timeout,
dan halaman HTML dari Cloudflare (mis. 530 saat tunnel mati).
