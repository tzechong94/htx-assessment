import { type SQL, and, asc, eq, inArray, ne } from 'drizzle-orm';
import type { Db } from '../db/client.js';
import { developerSkills, developers, skills, taskSkills, tasks, type TaskStatus } from '../db/schema.js';
import { HttpError, notFound } from '../lib/errors.js';
import type { IdentifySkills } from './skill-identifier.js';

export type CreateTaskInput = {
  title: string;
  skillIds: number[];
  subtasks: CreateTaskInput[];
};

export type UpdateTaskInput = {
  status?: TaskStatus;
  assigneeId?: number | null;
};

type TaskRow = Awaited<ReturnType<typeof findTasks>>[number];

function findTasks(db: Db, where?: SQL) {
  return db.query.tasks.findMany({
    where,
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
    parentId: row.parentId,
    skills: row.taskSkills.map((ts) => ts.skill).sort((a, b) => a.id - b.id),
    skillsIdentifiedByLlm: row.skillsIdentifiedByLlm,
    assignee: row.assignee,
    createdAt: row.createdAt,
  };
}

export type TaskDto = ReturnType<typeof toDto> & { subtasks: TaskDto[] };

/** Nests flat rows under their parents; rows whose parent is not in the set become roots. */
function buildTree(rows: TaskRow[]): TaskDto[] {
  const nodes = new Map<number, TaskDto>(rows.map((row) => [row.id, { ...toDto(row), subtasks: [] }]));
  const roots: TaskDto[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? undefined : nodes.get(node.parentId);
    (parent ? parent.subtasks : roots).push(node);
  }
  return roots;
}

/** All top-level tasks, each with its full subtask tree. */
export async function listTasks(db: Db) {
  return buildTree(await findTasks(db));
}

/** One task with its full subtask tree, loaded one level per query. */
export async function getTask(db: Db, id: number) {
  const rows = await findTasks(db, eq(tasks.id, id));
  if (rows.length === 0) throw notFound('Task', id);

  let frontier = rows.map((r) => r.id);
  while (frontier.length > 0) {
    const children = await findTasks(db, inArray(tasks.parentId, frontier));
    rows.push(...children);
    frontier = children.map((c) => c.id);
  }
  return buildTree(rows)[0]!;
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

function flatten(input: CreateTaskInput): CreateTaskInput[] {
  return [input, ...input.subtasks.flatMap(flatten)];
}

/** Skill ids chosen by the LLM, keyed by the input node they belong to. */
type IdentifiedSkills = Map<CreateTaskInput, number[]>;

async function insertTree(
  tx: Db,
  input: CreateTaskInput,
  parentId: number | null,
  identified: IdentifiedSkills,
): Promise<number> {
  const llmSkillIds = identified.get(input);
  const [row] = await tx
    .insert(tasks)
    .values({ title: input.title, parentId, skillsIdentifiedByLlm: llmSkillIds !== undefined })
    .returning({ id: tasks.id });
  const skillIds = llmSkillIds ?? [...new Set(input.skillIds)];
  if (skillIds.length > 0) {
    await tx.insert(taskSkills).values(skillIds.map((skillId) => ({ taskId: row!.id, skillId })));
  }
  for (const subtask of input.subtasks) {
    await insertTree(tx, subtask, row!.id, identified);
  }
  return row!.id;
}

/** One batched LLM call for every node the user left without skills. */
async function identifyMissingSkills(db: Db, identifySkills: IdentifySkills, nodes: CreateTaskInput[]) {
  const identified: IdentifiedSkills = new Map();
  const pending = nodes.filter((node) => node.skillIds.length === 0);
  if (pending.length === 0) return identified;

  const allSkills = await db.select().from(skills);
  const idByName = new Map(allSkills.map((s) => [s.name, s.id]));
  const results = await identifySkills(
    pending.map((node) => node.title),
    allSkills.map((s) => s.name),
  );

  pending.forEach((node, i) => {
    const ids = results[i]?.flatMap((name) => idByName.get(name) ?? []);
    if (ids && ids.length > 0) identified.set(node, ids);
  });
  return identified;
}

/**
 * Creates a task and its nested subtasks atomically. Nodes without user-chosen skills get them
 * from the LLM first, outside the transaction, so a slow network call never holds row locks.
 */
export async function createTask(db: Db, identifySkills: IdentifySkills, input: CreateTaskInput) {
  const nodes = flatten(input);
  await assertSkillsExist(db, [...new Set(nodes.flatMap((t) => t.skillIds))]);
  const identified = await identifyMissingSkills(db, identifySkills, nodes);
  const id = await db.transaction((tx) => insertTree(tx, input, null, identified));
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

/**
 * Invariant: a Done task has only Done subtasks. It is kept by two checks, which always lock the
 * parent row before the child so a concurrent "complete parent" and "reopen child" serialize.
 */
export async function updateTask(db: Db, id: number, input: UpdateTaskInput) {
  await db.transaction(async (tx) => {
    // parent_id never changes after creation, so reading it before taking locks is safe.
    const [current] = await tx.select({ parentId: tasks.parentId }).from(tasks).where(eq(tasks.id, id));
    if (!current) throw notFound('Task', id);

    if (input.status !== undefined && input.status !== 'done' && current.parentId !== null) {
      const [parent] = await tx
        .select({ status: tasks.status })
        .from(tasks)
        .where(eq(tasks.id, current.parentId))
        .for('update');
      if (parent?.status === 'done') {
        throw new HttpError(409, 'PARENT_DONE', 'The parent task is Done. Reopen it before reopening this subtask.');
      }
    }

    const [task] = await tx.select().from(tasks).where(eq(tasks.id, id)).for('update');
    if (!task) throw notFound('Task', id);

    if (input.status === 'done') {
      const open = await tx
        .select({ id: tasks.id })
        .from(tasks)
        .where(and(eq(tasks.parentId, id), ne(tasks.status, 'done')));
      if (open.length > 0) {
        throw new HttpError(
          409,
          'SUBTASKS_NOT_DONE',
          `${open.length} subtask${open.length === 1 ? ' is' : 's are'} not Done yet.`,
        );
      }
    }

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
