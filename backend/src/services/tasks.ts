import { asc, eq, inArray } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { developerSkills, developers, skills, taskSkills, tasks, type TaskStatus } from '../db/schema.js';
import { HttpError, notFound } from '../lib/errors.js';

export type CreateTaskInput = {
  title: string;
  skillIds: number[];
};

export type UpdateTaskInput = {
  status?: TaskStatus;
  assigneeId?: number | null;
};

type TaskRow = Awaited<ReturnType<typeof findTasks>>[number];

function findTasks(db: Db, id?: number) {
  return db.query.tasks.findMany({
    where: id === undefined ? undefined : eq(tasks.id, id),
    with: {
      taskSkills: { with: { skill: true } },
      assignee: { columns: { id: true, name: true } },
    },
    orderBy: asc(tasks.id),
  });
}

function toDto(row: TaskRow) {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    skills: row.taskSkills.map((ts) => ts.skill).sort((a, b) => a.id - b.id),
    assignee: row.assignee,
    createdAt: row.createdAt,
  };
}

export type TaskDto = ReturnType<typeof toDto>;

export async function listTasks(db: Db) {
  return (await findTasks(db)).map(toDto);
}

export async function getTask(db: Db, id: number) {
  const [row] = await findTasks(db, id);
  if (!row) throw notFound('Task', id);
  return toDto(row);
}

async function assertSkillsExist(db: Db, skillIds: number[]) {
  if (skillIds.length === 0) return;
  const found = await db.select({ id: skills.id }).from(skills).where(inArray(skills.id, skillIds));
  const known = new Set(found.map((s) => s.id));
  const unknown = skillIds.filter((id) => !known.has(id));
  if (unknown.length > 0) {
    throw new HttpError(422, 'UNKNOWN_SKILL', `Unknown skill id(s): ${unknown.join(', ')}`);
  }
}

export async function createTask(db: Db, input: CreateTaskInput) {
  const skillIds = [...new Set(input.skillIds)];
  await assertSkillsExist(db, skillIds);

  const id = await db.transaction(async (tx) => {
    const [row] = await tx.insert(tasks).values({ title: input.title }).returning({ id: tasks.id });
    if (skillIds.length > 0) {
      await tx.insert(taskSkills).values(skillIds.map((skillId) => ({ taskId: row!.id, skillId })));
    }
    return row!.id;
  });

  return getTask(db, id);
}

/** A developer qualifies for a task only if they hold every skill the task requires. */
async function assertDeveloperQualifies(tx: Db, taskId: number, developerId: number) {
  const [developer] = await tx.select().from(developers).where(eq(developers.id, developerId));
  if (!developer) {
    throw new HttpError(422, 'UNKNOWN_DEVELOPER', `Developer ${developerId} does not exist`);
  }

  const required = await tx
    .select({ id: skills.id, name: skills.name })
    .from(taskSkills)
    .innerJoin(skills, eq(skills.id, taskSkills.skillId))
    .where(eq(taskSkills.taskId, taskId));
  const held = await tx
    .select({ skillId: developerSkills.skillId })
    .from(developerSkills)
    .where(eq(developerSkills.developerId, developerId));

  const heldIds = new Set(held.map((h) => h.skillId));
  const missing = required.filter((s) => !heldIds.has(s.id));
  if (missing.length > 0) {
    throw new HttpError(
      422,
      'SKILL_MISMATCH',
      `${developer.name} is missing required skill(s): ${missing.map((s) => s.name).join(', ')}`,
    );
  }
}

export async function updateTask(db: Db, id: number, input: UpdateTaskInput) {
  await db.transaction(async (tx) => {
    // Lock the row so concurrent updates to the same task are applied one at a time.
    const [task] = await tx.select().from(tasks).where(eq(tasks.id, id)).for('update');
    if (!task) throw notFound('Task', id);

    if (input.assigneeId != null) {
      await assertDeveloperQualifies(tx, id, input.assigneeId);
    }

    await tx
      .update(tasks)
      .set({
        ...(input.status !== undefined && { status: input.status }),
        ...(input.assigneeId !== undefined && { assigneeId: input.assigneeId }),
      })
      .where(eq(tasks.id, id));
  });

  return getTask(db, id);
}
