import jwt from 'jsonwebtoken';
import { createHash, randomBytes } from 'node:crypto';

// JWT sesuai kontrak (bagian 3.1): HS256, iss/aud dari config, sub = UUID pengguna, role, exp 7 hari.
export function signAccessToken(user, jwtConfig) {
  return jwt.sign({ role: user.role }, jwtConfig.secret, {
    algorithm: 'HS256',
    subject: user.id,
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
    expiresIn: jwtConfig.expiresInSeconds,
  });
}

export function verifyAccessToken(token, jwtConfig) {
  return jwt.verify(token, jwtConfig.secret, {
    algorithms: ['HS256'],
    issuer: jwtConfig.issuer,
    audience: jwtConfig.audience,
  });
}

// API key (bagian 3.2): "jh_" + 32 karakter base64url. Yang disimpan hanya hash SHA-256.
export function generateApiKey() {
  return `jh_${randomBytes(24).toString('base64url')}`;
}

export function hashApiKey(key) {
  return createHash('sha256').update(key).digest('hex');
}
