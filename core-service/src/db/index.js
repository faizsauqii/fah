// Koneksi SQLite memakai modul bawaan node:sqlite (tanpa kompilasi native,
// aman untuk STB ARM). Skema dibuat lewat migrasi berurutan di migrations.js.

import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrations } from './migrations.js';

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') {
    mkdirSync(dirname(dbPath), { recursive: true });
  }

  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') {
    // WAL: baca dan tulis bisa jalan bersamaan, lebih tahan jika listrik padam.
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA busy_timeout = 5000;');

  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      applied_at TEXT NOT NULL
    ) STRICT;
  `);

  const applied = new Set(
    db.prepare('SELECT version FROM schema_migrations').all().map((row) => row.version),
  );

  const insert = db.prepare(
    'INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)',
  );

  for (const migration of migrations) {
    if (applied.has(migration.version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(migration.sql);
      insert.run(migration.version, migration.name, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`[core-service] migrasi ${migration.version} (${migration.name}) diterapkan`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function pingDatabase(db) {
  return db.prepare('SELECT 1 AS ok').get()?.ok === 1;
}
