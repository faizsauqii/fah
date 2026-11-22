import express from 'express';
import { healthRouter } from './routes/health.js';
import { riskRouter } from './routes/risk.js';
import { placeholderRouter } from './routes/placeholders.js';
import { errorHandler, notFoundHandler } from './errors.js';
import { createOpenMeteoClient } from './clients/openMeteoClient.js';
import { createEnvCache } from './services/envCache.js';
import { createRiskService } from './services/riskService.js';

export function createApp({ config, db, openMeteo, now = () => Date.now() }) {
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '32kb' }));

  const riskService = createRiskService({
    openMeteo:
      openMeteo ??
      createOpenMeteoClient({
        userAgent: config.openMeteo?.userAgent,
        timeoutMs: config.openMeteo?.timeoutMs,
      }),
    envCache: createEnvCache({ db, ttlMinutes: config.envCacheTtlMinutes ?? 60, now }),
    now,
  });

  app.use(healthRouter({ db }));
  app.use(riskRouter({ riskService }));
  app.use(placeholderRouter());

  app.use(notFoundHandler);
  app.use(errorHandler);

  app.locals.config = config;
  return app;
}
