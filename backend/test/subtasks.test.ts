import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createTestApp } from './helpers.js';

let t: Awaited<ReturnType<typeof createTestApp>>;

beforeEach(async () => {
  t = await createTestApp();
});
afterEach(() => t.close());

type Node = { id: number; title: string; parentId: number | null; subtasks: Node[] };

async function createTree() {
  const res = await t.api
    .post('/api/tasks')
    .send({
      title: 'Profile page',
      skillIds: [t.skillId('Frontend'), t.skillId('Backend')],
      subtasks: [
        { title: 'Profile form', skillIds: [t.skillId('Frontend')] },
        {
          title: 'Profile API',
          skillIds: [t.skillId('Backend')],
          subtasks: [{ title: 'Avatar upload', skillIds: [t.skillId('Backend')] }],
        },
      ],
    })
    .expect(201);
  const root: Node = res.body;
  const [form, api] = root.subtasks as [Node, Node];
  return { root, form, api, avatar: api.subtasks[0]! };
}

const setStatus = (id: number, status: string) => t.api.patch(`/api/tasks/${id}`).send({ status });

describe('creating subtasks', () => {
  it('creates a nested tree in one request and reads it back', async () => {
    const { root, api, avatar } = await createTree();
    expect(root.parentId).toBeNull();
    expect(root.subtasks.map((s) => s.title)).toEqual(['Profile form', 'Profile API']);
    expect(avatar).toMatchObject({ title: 'Avatar upload', parentId: api.id, subtasks: [] });

    const single = await t.api.get(`/api/tasks/${api.id}`).expect(200);
    expect(single.body.subtasks.map((s: Node) => s.title)).toEqual(['Avatar upload']);
  });

  it('lists only top-level tasks, with subtasks nested beneath them', async () => {
    await createTree();
    const res = await t.api.get('/api/tasks').expect(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].subtasks).toHaveLength(2);
  });

  it('gives subtasks the same rules as tasks', async () => {
    const { avatar } = await createTree();
    await t.api.patch(`/api/tasks/${avatar.id}`).send({ assigneeId: t.developerId('Alice') }).expect(422);
    await t.api.patch(`/api/tasks/${avatar.id}`).send({ assigneeId: t.developerId('Dave') }).expect(200);
  });

  it('rolls back the whole tree when any node is invalid', async () => {
    await t.api
      .post('/api/tasks')
      .send({ title: 'Parent', subtasks: [{ title: 'ok' }, { title: 'bad', skillIds: [9999] }] })
      .expect(422);
    expect((await t.api.get('/api/tasks')).body).toEqual([]);
  });

  it('rejects trees above the size limit and blank subtask titles', async () => {
    const subtasks = Array.from({ length: 50 }, (_, i) => ({ title: `Subtask ${i}` }));
    await t.api.post('/api/tasks').send({ title: 'Too big', subtasks }).expect(400);
    await t.api.post('/api/tasks').send({ title: 'Parent', subtasks: [{ title: '' }] }).expect(400);
  });
});

describe('completing tasks with subtasks', () => {
  it('blocks Done while any direct subtask is not Done', async () => {
    const { root, form } = await createTree();
    await setStatus(form.id, 'done').expect(200);

    const res = await setStatus(root.id, 'done').expect(409);
    expect(res.body.error).toEqual({ code: 'SUBTASKS_NOT_DONE', message: '1 subtask is not Done yet.' });
    expect((await t.api.get(`/api/tasks/${root.id}`)).body.status).toBe('todo');
  });

  it('applies the rule at every level of nesting', async () => {
    const { root, form, api, avatar } = await createTree();
    await setStatus(form.id, 'done').expect(200);
    await setStatus(api.id, 'done').expect(409);

    await setStatus(avatar.id, 'done').expect(200);
    await setStatus(api.id, 'done').expect(200);
    await setStatus(root.id, 'done').expect(200);
  });

  it('allows other statuses regardless of subtasks', async () => {
    const { root } = await createTree();
    await setStatus(root.id, 'in_progress').expect(200);
  });

  it('blocks reopening a subtask while its parent is Done, preserving the invariant', async () => {
    const { root, form, api, avatar } = await createTree();
    for (const id of [form.id, avatar.id, api.id, root.id]) await setStatus(id, 'done').expect(200);

    const res = await setStatus(form.id, 'todo').expect(409);
    expect(res.body.error.code).toBe('PARENT_DONE');

    await setStatus(root.id, 'in_progress').expect(200);
    await setStatus(form.id, 'todo').expect(200);
  });
});
