import { loadConfig } from './config.js';
import { openDatabase } from './db/index.js';
import { createApp } from './app.js';

const config = loadConfig();
const db = openDatabase(config.dbPath);
const app = createApp({ config, db });

const server = app.listen(config.port, () => {
  console.log(`[core-service] berjalan di port ${config.port} (${config.nodeEnv})`);
});

function shutdown(signal) {
  console.log(`[core-service] menerima ${signal}, menutup server...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
