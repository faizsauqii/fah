import jwt from 'jsonwebtoken';
import { errors } from '../errors.js';

const BEARER_RE = /^Bearer\s+(\S+)$/;
const ROLES = ['user', 'admin'];

function verifyJwt(token, jwtConfig) {
  let payload;
  try {
    payload = jwt.verify(token, jwtConfig.secret, {
      algorithms: ['HS256'],
      issuer: jwtConfig.issuer,
      audience: jwtConfig.audience,
    });
  } catch {
    throw errors.invalidToken();
  }
  if (typeof payload.sub !== 'string' || !payload.sub || !ROLES.includes(payload.role)) {
    throw errors.invalidToken();
  }
  return { type: 'jwt', userId: payload.sub, role: payload.role };
}

export function authenticate({ jwt: jwtConfig, authClient }) {
  return async (req, _res, next) => {
    const authorization = req.get('authorization');
    const apiKey = req.get('x-api-key');

    if (authorization !== undefined) {
      const match = BEARER_RE.exec(authorization.trim());
      if (!match || !jwtConfig?.secret) return next(errors.invalidToken());
      try {
        req.auth = verifyJwt(match[1], jwtConfig);
        return next();
      } catch (err) {
        return next(err);
      }
    }

    if (apiKey !== undefined) {
      if (!authClient) return next(errors.authUnavailable());
      try {
        const result = await authClient.verifyApiKey(apiKey);
        if (!result.valid) return next(errors.invalidApiKey());
        req.auth = { type: 'apiKey', keyId: result.keyId, group: result.group, tier: result.tier };
        return next();
      } catch (err) {
        return next(err);
      }
    }

    req.auth = { type: 'anonymous' };
    return next();
  };
}

export function requireUser(req, _res, next) {
  if (req.auth?.type === 'jwt') return next();
  if (req.auth?.type === 'apiKey') {
    return next(errors.unauthenticated('Endpoint ini memerlukan login pengguna (Authorization: Bearer), bukan API key.'));
  }
  return next(errors.unauthenticated('Perlu login. Kirim header Authorization: Bearer <token>.'));
}
