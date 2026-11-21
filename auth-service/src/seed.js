import { randomUUID } from 'node:crypto';
import { hashPassword } from './lib/password.js';

// Membuat akun admin dan akun uji dari .env saat start, jika belum ada.
// Password tidak pernah ditulis di kode atau repo.
export function seedUsers(db, seed) {
  const accounts = [
    { email: seed.adminEmail, password: seed.adminPassword, name: 'Admin JamHijau', role: 'admin' },
    { email: seed.demoEmail, password: seed.demoPassword, name: 'Akun Uji', role: 'user' },
  ];
  const exists = db.prepare('SELECT 1 FROM users WHERE email = ?');
  const insert = db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );
  for (const a of accounts) {
    if (!a.email || !a.password) continue;
    const email = a.email.trim().toLowerCase();
    if (exists.get(email)) continue;
    insert.run(randomUUID(), email, a.name, hashPassword(a.password), a.role, new Date().toISOString());
    console.log(`[auth-service] akun ${a.role} ${email} dibuat`);
  }
}
