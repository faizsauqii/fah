// Migrasi skema core-service. Jangan mengubah migrasi yang sudah diterapkan
// di STB; tambahkan migrasi baru dengan nomor berikutnya.
//
// Data pengguna (akun, password) ada di auth-service. Di sini user_id hanya
// menyimpan `sub` dari JWT, tanpa foreign key ke database lain.

export const migrations = [
  {
    version: 1,
    name: 'skema_awal',
    sql: `
      -- Konteks Data Lingkungan: cache hasil Open-Meteo per area per jam.
      CREATE TABLE env_cache (
        cache_key   TEXT PRIMARY KEY,      -- contoh: "-6.89,107.61"
        payload     TEXT NOT NULL,         -- JSON Kondisi Lingkungan (sudah diterjemahkan)
        fetched_at  TEXT NOT NULL,         -- ISO 8601
        expires_at  TEXT NOT NULL          -- ISO 8601
      ) STRICT;

      -- Konteks Profil Pengguna: profil kesehatan (satu per pengguna).
      CREATE TABLE health_profiles (
        user_id     TEXT PRIMARY KEY,
        profile     TEXT NOT NULL
                    CHECK (profile IN ('umum', 'asma', 'lansia', 'ibu_hamil', 'anak')),
        updated_at  TEXT NOT NULL
      ) STRICT;

      -- Konteks Profil Pengguna: lokasi tersimpan.
      CREATE TABLE saved_locations (
        id          TEXT PRIMARY KEY,
        user_id     TEXT NOT NULL,
        name        TEXT NOT NULL,
        lat         REAL NOT NULL CHECK (lat BETWEEN -90 AND 90),
        lon         REAL NOT NULL CHECK (lon BETWEEN -180 AND 180),
        created_at  TEXT NOT NULL,
        updated_at  TEXT NOT NULL
      ) STRICT;
      CREATE INDEX idx_saved_locations_user ON saved_locations(user_id);

      -- Konteks Rencana Aktivitas.
      CREATE TABLE activity_plans (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        location_id  TEXT NOT NULL REFERENCES saved_locations(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        start_at     TEXT NOT NULL,       -- ISO 8601 dengan offset
        end_at       TEXT NOT NULL,       -- ISO 8601 dengan offset
        created_at   TEXT NOT NULL,
        CHECK (end_at > start_at)
      ) STRICT;
      CREATE INDEX idx_activity_plans_user ON activity_plans(user_id);
    `,
  },
];
