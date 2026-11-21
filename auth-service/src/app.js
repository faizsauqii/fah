import express from 'express';
import { healthRouter } from './routes/health.js';
import { authRouter } from './routes/auth.js';
import { apiKeysRouter } from './routes/apiKeys.js';
import { internalRouter } from './routes/internal.js';
import { errorHandler, notFoundHandler } from './errors.js';

// Membuat aplikasi Express tanpa menjalankan server, supaya bisa diuji.
export function createApp({ config, db }) {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));

  app.use(healthRouter({ db }));
  app.use(authRouter({ db, config }));
  app.use(apiKeysRouter({ db, config }));
  app.use(internalRouter({ db, config }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
