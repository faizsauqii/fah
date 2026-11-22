import { Router } from 'express';
import { pingDatabase } from '../db/index.js';

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
      service: 'core-service',
      database: dbOk ? 'ok' : 'error',
      time: new Date().toISOString(),
    });
  };

  router.get('/healthz', handler);
  router.get('/api/core/health', handler);
  return router;
}
