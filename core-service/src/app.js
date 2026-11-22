import express from 'express';
import { healthRouter } from './routes/health.js';
import { placeholderRouter } from './routes/placeholders.js';
import { errorHandler, notFoundHandler } from './errors.js';

// Membuat aplikasi Express tanpa menjalankan server, supaya bisa diuji.
export function createApp({ config, db }) {
  const app = express();

  app.disable('x-powered-by');
  // Satu proxy di depan (Nginx). IP asli diatur Nginx dari CF-Connecting-IP.
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  app.use(healthRouter({ db }));
  app.use(placeholderRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.config = config;
  return app;
}
