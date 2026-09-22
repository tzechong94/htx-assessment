import { pathToFileURL } from 'node:url';
import type { Db } from './client.js';
import { developerSkills, developers, skills } from './schema.js';

const SKILLS = ['Frontend', 'Backend'];

const DEVELOPERS: { name: string; skills: string[] }[] = [
  { name: 'Alice', skills: ['Frontend'] },
  { name: 'Bob', skills: ['Backend'] },
  { name: 'Carol', skills: ['Frontend', 'Backend'] },
  { name: 'Dave', skills: ['Backend'] },
];

/** Idempotent: skills are upserted by name, developers are only inserted into an empty table. */
export async function seed(db: Db) {
  await db
    .insert(skills)
    .values(SKILLS.map((name) => ({ name })))
    .onConflictDoNothing({ target: skills.name });

  await db.transaction(async (tx) => {
    const existing = await tx.select({ id: developers.id }).from(developers).limit(1);
    if (existing.length > 0) return;

    const skillRows = await tx.select().from(skills);
    const skillIdByName = new Map(skillRows.map((s) => [s.name, s.id]));

    for (const dev of DEVELOPERS) {
      const [row] = await tx.insert(developers).values({ name: dev.name }).returning({ id: developers.id });
      await tx.insert(developerSkills).values(
        dev.skills.map((name) => ({ developerId: row!.id, skillId: skillIdByName.get(name)! })),
      );
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const { config } = await import('../config.js');
  const { createDb } = await import('./client.js');
  const { db, pool } = createDb(config.databaseUrl);
  await seed(db);
  await pool.end();
  console.log('Seed complete');
}
