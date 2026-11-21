import { errors } from '../errors.js';
import { verifyAccessToken } from '../lib/tokens.js';

export function requireJwt(jwtConfig) {
  return (req, _res, next) => {
    const match = /^Bearer (.+)$/.exec(req.get('authorization') ?? '');
    if (!match) return next(errors.unauthenticated());
    try {
      req.auth = verifyAccessToken(match[1], jwtConfig);
      return next();
    } catch {
      return next(errors.invalidToken());
    }
  };
}

export function requireAdmin(req, _res, next) {
  if (req.auth?.role !== 'admin') return next(errors.forbidden('Hanya admin yang boleh melakukan ini.'));
  return next();
}
