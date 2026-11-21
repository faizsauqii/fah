// SQLite lewat modul bawaan node:sqlite (tanpa kompilasi native, aman untuk STB ARM).
import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { migrations } from './migrations.js';

export function openDatabase(dbPath) {
  if (dbPath !== ':memory:') mkdirSync(dirname(dbPath), { recursive: true });
  const db = new DatabaseSync(dbPath);
  db.exec('PRAGMA foreign_keys = ON;');
  if (dbPath !== ':memory:') db.exec('PRAGMA journal_mode = WAL;');
  db.exec('PRAGMA busy_timeout = 5000;');
  runMigrations(db);
  return db;
}

function runMigrations(db) {
  db.exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
    version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at TEXT NOT NULL
  ) STRICT;`);
  const applied = new Set(db.prepare('SELECT version FROM schema_migrations').all().map((r) => r.version));
  const insert = db.prepare('INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?)');
  for (const m of migrations) {
    if (applied.has(m.version)) continue;
    db.exec('BEGIN');
    try {
      db.exec(m.sql);
      insert.run(m.version, m.name, new Date().toISOString());
      db.exec('COMMIT');
      console.log(`[auth-service] migrasi ${m.version} (${m.name}) diterapkan`);
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  }
}

export function pingDatabase(db) {
  return db.prepare('SELECT 1 AS ok').get()?.ok === 1;
}
