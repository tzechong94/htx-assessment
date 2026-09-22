import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db/client.js';

const { db, pool } = createDb(config.databaseUrl);
const app = createApp({ db });

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
