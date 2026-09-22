import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import request from 'supertest';
import { createApp, type AppDeps } from '../src/app.js';
import type { Db } from '../src/db/client.js';
import * as schema from '../src/db/schema.js';
import { seed } from '../src/db/seed.js';

/** Fresh in-memory Postgres with the real migrations and seed applied. */
export async function createTestApp(overrides: Partial<Omit<AppDeps, 'db'>> = {}) {
  // Tests never hit the network: by default the LLM identifies nothing.
  const identifySkills: AppDeps['identifySkills'] = async (titles) => titles.map(() => null);
  const client = new PGlite();
  const db = drizzle(client, { schema }) as unknown as Db;
  await migrate(drizzle(client), { migrationsFolder: './drizzle' });
  await seed(db);

  const app = createApp({ db, identifySkills, ...overrides });
  const developers: { id: number; name: string }[] = (await request(app).get('/api/developers')).body;
  const skills: { id: number; name: string }[] = (await request(app).get('/api/skills')).body;

  return {
    api: request(app),
    db,
    close: () => client.close(),
    developerId: (name: string) => developers.find((d) => d.name === name)!.id,
    skillId: (name: string) => skills.find((s) => s.name === name)!.id,
  };
}
