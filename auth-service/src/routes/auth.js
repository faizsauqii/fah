import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { errors } from '../errors.js';
import { hashPassword, verifyPassword } from '../lib/password.js';
import { signAccessToken } from '../lib/tokens.js';
import { requireJwt } from './middleware.js';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const publicUser = (u) => ({ id: u.id, email: u.email, name: u.name, role: u.role });

// Format respons login sesuai kontrak (bagian 3.1).
function tokenResponse(user, jwtConfig) {
  return {
    accessToken: signAccessToken(user, jwtConfig),
    tokenType: 'Bearer',
    expiresIn: jwtConfig.expiresInSeconds,
    user: publicUser(user),
  };
}

export function authRouter({ db, config }) {
  const router = Router();
  const findByEmail = db.prepare('SELECT * FROM users WHERE email = ?');
  const findById = db.prepare('SELECT * FROM users WHERE id = ?');
  const insertUser = db.prepare(
    'INSERT INTO users (id, email, name, password_hash, role, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  );

  router.post('/api/auth/register', (req, res) => {
    const { email, password, name } = req.body ?? {};
    const details = [];
    if (typeof email !== 'string' || !EMAIL_RE.test(email.trim())) details.push({ field: 'email', issue: 'invalid_format' });
    if (typeof password !== 'string' || password.length < 8) details.push({ field: 'password', issue: 'too_short' });
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 80) details.push({ field: 'name', issue: 'required_max_80' });
    if (details.length) throw errors.validation('Data pendaftaran tidak valid.', details);

    const normEmail = email.trim().toLowerCase();
    if (findByEmail.get(normEmail)) throw errors.conflict('Email sudah terdaftar.');

    const user = { id: randomUUID(), email: normEmail, name: name.trim(), role: 'user' };
    insertUser.run(user.id, user.email, user.name, hashPassword(password), user.role, new Date().toISOString());
    res.status(201).json(tokenResponse(user, config.jwt));
  });

  router.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body ?? {};
    if (typeof email !== 'string' || typeof password !== 'string') {
      throw errors.validation('Email dan password wajib diisi.', [
        ...(typeof email !== 'string' ? [{ field: 'email', issue: 'required' }] : []),
        ...(typeof password !== 'string' ? [{ field: 'password', issue: 'required' }] : []),
      ]);
    }
    const user = findByEmail.get(email.trim().toLowerCase());
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw errors.unauthenticated('Email atau password salah.');
    }
    res.json(tokenResponse(user, config.jwt));
  });

  router.get('/api/auth/me', requireJwt(config.jwt), (req, res) => {
    const user = findById.get(req.auth.sub);
    if (!user) throw errors.notFound('Pengguna tidak ditemukan.');
    res.json({ user: publicUser(user) });
  });

  return router;
}
