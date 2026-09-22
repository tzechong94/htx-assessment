import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { developers, tasks } from '../db/schema.js';
import { notFound } from '../lib/errors.js';

type DeveloperRow = Awaited<ReturnType<typeof findDevelopers>>[number];

function findDevelopers(db: Db, id?: number) {
  return db.query.developers.findMany({
    where: id === undefined ? undefined : eq(developers.id, id),
    with: {
      developerSkills: { with: { skill: true } },
      tasks: { columns: { id: true, title: true, status: true }, orderBy: asc(tasks.id) },
    },
    orderBy: asc(developers.id),
  });
}

function toDto(row: DeveloperRow) {
  return {
    id: row.id,
    name: row.name,
    skills: row.developerSkills.map((ds) => ds.skill),
    tasks: row.tasks,
  };
}

export async function listDevelopers(db: Db) {
  return (await findDevelopers(db)).map(toDto);
}

export async function getDeveloper(db: Db, id: number) {
  const [row] = await findDevelopers(db, id);
  if (!row) throw notFound('Developer', id);
  return toDto(row);
}
