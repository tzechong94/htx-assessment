import { asc, eq } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { skills } from '../db/schema.js';
import { notFound } from '../lib/errors.js';

const withDevelopers = {
  developerSkills: { with: { developer: { columns: { id: true, name: true } } } },
} as const;

type SkillRow = Awaited<ReturnType<typeof findSkills>>[number];

function findSkills(db: Db, id?: number) {
  return db.query.skills.findMany({
    where: id === undefined ? undefined : eq(skills.id, id),
    with: withDevelopers,
    orderBy: asc(skills.id),
  });
}

function toDto(row: SkillRow) {
  return {
    id: row.id,
    name: row.name,
    developers: row.developerSkills.map((ds) => ds.developer),
  };
}

export async function listSkills(db: Db) {
  return (await findSkills(db)).map(toDto);
}

export async function getSkill(db: Db, id: number) {
  const [row] = await findSkills(db, id);
  if (!row) throw notFound('Skill', id);
  return toDto(row);
}
