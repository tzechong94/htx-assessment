import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { seedSampleTasks } from '../src/db/seed.js';
import { createTestApp } from './helpers.js';

let t: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  t = await createTestApp();
});
afterEach(() => t.close());

describe('reference data', () => {
  it('lists seeded developers with their skills', async () => {
    const res = await t.api.get('/api/developers').expect(200);
    const summary = res.body.map((d: { name: string; skills: { name: string }[] }) => [
      d.name,
      d.skills.map((s) => s.name).sort(),
    ]);
    expect(summary).toEqual([
      ['Alice', ['Frontend']],
      ['Bob', ['Backend']],
      ['Carol', ['Backend', 'Frontend']],
      ['Dave', ['Backend']],
    ]);
  });

  it('reads a single skill with the developers who have it', async () => {
    const res = await t.api.get(`/api/skills/${t.skillId('Backend')}`).expect(200);
    expect(res.body.developers.map((d: { name: string }) => d.name)).toEqual(['Bob', 'Carol', 'Dave']);
  });

  it('returns 404 for unknown ids and 400 for malformed ids', async () => {
    await t.api.get('/api/developers/9999').expect(404);
    await t.api.get('/api/tasks/abc').expect(400);
  });
});

describe('creating tasks', () => {
  it('creates a task with the given skills, unassigned and to-do', async () => {
    const res = await t.api
      .post('/api/tasks')
      .send({ title: '  Build login page  ', skillIds: [t.skillId('Frontend')] })
      .expect(201);

    expect(res.body).toMatchObject({
      title: 'Build login page',
      status: 'todo',
      assignee: null,
      skills: [{ name: 'Frontend' }],
    });
    await t.api.get(`/api/tasks/${res.body.id}`).expect(200);
  });

  it('rejects an empty title and unknown skills', async () => {
    await t.api.post('/api/tasks').send({ title: '   ' }).expect(400);
    const res = await t.api.post('/api/tasks').send({ title: 'x', skillIds: [9999] }).expect(422);
    expect(res.body.error.code).toBe('UNKNOWN_SKILL');
  });
});

describe('assigning tasks', () => {
  async function createTask(skills: string[]) {
    const res = await t.api
      .post('/api/tasks')
      .send({ title: 'Task', skillIds: skills.map(t.skillId) })
      .expect(201);
    return res.body.id as number;
  }

  it('assigns a developer who has every required skill', async () => {
    const id = await createTask(['Frontend', 'Backend']);
    const res = await t.api.patch(`/api/tasks/${id}`).send({ assigneeId: t.developerId('Carol') }).expect(200);
    expect(res.body.assignee).toEqual({ id: t.developerId('Carol'), name: 'Carol' });
  });

  it('rejects a developer missing a required skill', async () => {
    const id = await createTask(['Frontend', 'Backend']);
    const res = await t.api.patch(`/api/tasks/${id}`).send({ assigneeId: t.developerId('Bob') }).expect(422);
    expect(res.body.error).toMatchObject({ code: 'SKILL_MISMATCH' });
    expect(res.body.error.message).toContain('Frontend');

    const after = await t.api.get(`/api/tasks/${id}`);
    expect(after.body.assignee).toBeNull();
  });

  it('unassigns with null and rejects unknown developers', async () => {
    const id = await createTask(['Backend']);
    await t.api.patch(`/api/tasks/${id}`).send({ assigneeId: t.developerId('Dave') }).expect(200);
    const res = await t.api.patch(`/api/tasks/${id}`).send({ assigneeId: null }).expect(200);
    expect(res.body.assignee).toBeNull();
    await t.api.patch(`/api/tasks/${id}`).send({ assigneeId: 9999 }).expect(422);
  });

  it('changes status and rejects invalid statuses or empty updates', async () => {
    const id = await createTask(['Backend']);
    const res = await t.api.patch(`/api/tasks/${id}`).send({ status: 'in_progress' }).expect(200);
    expect(res.body.status).toBe('in_progress');
    await t.api.patch(`/api/tasks/${id}`).send({ status: 'blocked' }).expect(400);
    await t.api.patch(`/api/tasks/${id}`).send({}).expect(400);
    await t.api.patch('/api/tasks/9999').send({ status: 'done' }).expect(404);
  });
});

describe('sample tasks', () => {
  it('seeds the three wireframe tasks once, even when run repeatedly', async () => {
    await seedSampleTasks(t.db);
    await seedSampleTasks(t.db);

    const res = await t.api.get('/api/tasks').expect(200);
    expect(
      res.body.map((task: { skills: { name: string }[]; assignee: { name: string } | null; status: string }) => [
        task.skills.map((s) => s.name),
        task.assignee?.name ?? null,
        task.status,
      ]),
    ).toEqual([
      [['Frontend'], 'Alice', 'todo'],
      [['Backend'], null, 'todo'],
      [['Frontend', 'Backend'], null, 'todo'],
    ]);
  });
});
