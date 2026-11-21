import { Router } from 'express';
import { pingDatabase } from '../db/index.js';

// GET /healthz: healthcheck Docker di jaringan internal.
// GET /api/auth/health: sama, bisa dicek dari luar lewat gateway.
export function healthRouter({ db }) {
  const router = Router();
  const handler = (_req, res) => {
    let dbOk = false;
    try {
      dbOk = pingDatabase(db);
    } catch {
      dbOk = false;
    }
    res.status(dbOk ? 200 : 503).json({
      status: dbOk ? 'ok' : 'degraded',
      service: 'auth-service',
      database: dbOk ? 'ok' : 'error',
      time: new Date().toISOString(),
    });
  };
  router.get('/healthz', handler);
  router.get('/api/auth/health', handler);
  return router;
}
