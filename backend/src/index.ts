import { createApp } from './app.js';
import { config } from './config.js';
import { createDb } from './db/client.js';
import { createGeminiSkillIdentifier } from './services/skill-identifier.js';

const { db, pool } = createDb(config.databaseUrl);
const identifySkills = createGeminiSkillIdentifier({ apiKey: config.geminiApiKey, model: config.geminiModel });
const app = createApp({ db, identifySkills });

if (!config.geminiApiKey) {
  console.warn('GEMINI_API_KEY is not set: tasks created without skills will be saved with none.');
}

const server = app.listen(config.port, () => {
  console.log(`API listening on http://localhost:${config.port}`);
});

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => void pool.end().then(() => process.exit(0)));
  });
}
