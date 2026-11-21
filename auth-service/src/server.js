import { loadConfig } from './config.js';
import { openDatabase } from './db/index.js';
import { createApp } from './app.js';
import { seedUsers } from './seed.js';

const config = loadConfig();
const db = openDatabase(config.dbPath);
seedUsers(db, config.seed);
const app = createApp({ config, db });

const server = app.listen(config.port, () => {
  console.log(`[auth-service] berjalan di port ${config.port} (${config.nodeEnv})`);
});

// Docker mengirim SIGTERM saat `docker compose down` / restart.
function shutdown(signal) {
  console.log(`[auth-service] menerima ${signal}, menutup server...`);
  server.close(() => {
    db.close();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
