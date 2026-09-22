import { pathToFileURL } from 'node:url';
import type { Db } from './client.js';
import { eq } from 'drizzle-orm';
import { developerSkills, developers, skills, taskSkills, tasks } from './schema.js';

const SKILLS = ['Frontend', 'Backend'];

const DEVELOPERS: { name: string; skills: string[] }[] = [
  { name: 'Alice', skills: ['Frontend'] },
  { name: 'Bob', skills: ['Backend'] },
  { name: 'Carol', skills: ['Frontend', 'Backend'] },
  { name: 'Dave', skills: ['Backend'] },
];

// The three example tasks from the Task List wireframe.
const SAMPLE_TASKS: { title: string; skills: string[]; assignee?: string }[] = [
  {
    title:
      'As a visitor, I want to see a responsive homepage so that I can easily navigate on both desktop and mobile devices.',
    skills: ['Frontend'],
    assignee: 'Alice',
  },
  {
    title:
      'As a system administrator, I want audit logs of all data access and modifications so that I can ensure compliance with data protection regulations and investigate any security incidents.',
    skills: ['Backend'],
  },
  {
    title:
      'As a logged-in user, I want to update my profile information and upload a profile picture so that my account details are accurate and personalized.',
    skills: ['Frontend', 'Backend'],
  },
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

/**
 * Demo data, kept out of `seed` so tests start with no tasks. Idempotent: each task is skipped if
 * a task with the same title already exists, so it is safe to run against a database in use.
 */
export async function seedSampleTasks(db: Db) {
  await db.transaction(async (tx) => {
    const skillIdByName = new Map((await tx.select().from(skills)).map((s) => [s.name, s.id]));
    const developerIdByName = new Map((await tx.select().from(developers)).map((d) => [d.name, d.id]));

    for (const task of SAMPLE_TASKS) {
      const existing = await tx.select({ id: tasks.id }).from(tasks).where(eq(tasks.title, task.title)).limit(1);
      if (existing.length > 0) continue;

      const [row] = await tx
        .insert(tasks)
        .values({ title: task.title, assigneeId: task.assignee ? developerIdByName.get(task.assignee) : null })
        .returning({ id: tasks.id });
      await tx
        .insert(taskSkills)
        .values(task.skills.map((name) => ({ taskId: row!.id, skillId: skillIdByName.get(name)! })));
    }
  });
}

if (import.meta.url === pathToFileURL(process.argv[1]!).href) {
  const { config } = await import('../config.js');
  const { createDb } = await import('./client.js');
  const { db, pool } = createDb(config.databaseUrl);
  await seed(db);
  await seedSampleTasks(db);
  await pool.end();
  console.log('Seed complete');
}
