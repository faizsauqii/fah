// Migrasi berurutan. Tambah migrasi baru di akhir, jangan ubah yang sudah ada.
export const migrations = [
  {
    version: 1,
    name: 'users_dan_api_keys',
    sql: `
      CREATE TABLE users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
        created_at TEXT NOT NULL
      ) STRICT;

      CREATE TABLE api_keys (
        id TEXT PRIMARY KEY,
        key_hash TEXT NOT NULL UNIQUE,
        key_prefix TEXT NOT NULL,
        group_name TEXT NOT NULL,
        contact TEXT NOT NULL,
        tier TEXT NOT NULL DEFAULT 'partner',
        created_at TEXT NOT NULL,
        revoked_at TEXT
      ) STRICT;
    `,
  },
];
