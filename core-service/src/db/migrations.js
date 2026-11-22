export const migrations = [
  {
    version: 1,
    name: 'skema_awal',
    sql: `
      CREATE TABLE env_cache (
        cache_key   TEXT PRIMARY KEY,
        payload     TEXT NOT NULL,
        fetched_at  TEXT NOT NULL,
        expires_at  TEXT NOT NULL
      ) STRICT;

      CREATE TABLE health_profiles (
        user_id     TEXT PRIMARY KEY,
        profile     TEXT NOT NULL
                    CHECK (profile IN ('umum', 'asma', 'lansia', 'ibu_hamil', 'anak')),
        updated_at  TEXT NOT NULL
      ) STRICT;

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

      CREATE TABLE activity_plans (
        id           TEXT PRIMARY KEY,
        user_id      TEXT NOT NULL,
        location_id  TEXT NOT NULL REFERENCES saved_locations(id) ON DELETE CASCADE,
        title        TEXT NOT NULL,
        start_at     TEXT NOT NULL,
        end_at       TEXT NOT NULL,
        created_at   TEXT NOT NULL,
        CHECK (end_at > start_at)
      ) STRICT;
      CREATE INDEX idx_activity_plans_user ON activity_plans(user_id);
    `,
  },
  {
    version: 2,
    name: 'offset_waktu_rencana',
    sql: `
      ALTER TABLE activity_plans ADD COLUMN utc_offset_minutes INTEGER NOT NULL DEFAULT 0;
      CREATE INDEX idx_activity_plans_location ON activity_plans(location_id);
    `,
  },
];
