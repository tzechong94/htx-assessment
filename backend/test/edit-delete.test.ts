import { afterEach, describe, expect, it, vi } from 'vitest';
import type { IdentifySkills } from '../src/services/skill-identifier.js';
import { createTestApp } from './helpers.js';

let t: Awaited<ReturnType<typeof createTestApp>>;
afterEach(() => t.close());

async function createTask(skills: string[], extra: object = {}) {
  const res = await t.api
    .post('/api/tasks')
    .send({ title: 'Original title', skillIds: skills.map(t.skillId), ...extra })
    .expect(201);
  return res.body as { id: number; subtasks: { id: number }[] };
}

const patch = (id: number, body: object) => t.api.patch(`/api/tasks/${id}`).send(body);

describe('editing tasks', () => {
  it('updates the title and rejects a blank one', async () => {
    t = await createTestApp();
    const { id } = await createTask(['Frontend']);
    const res = await patch(id, { title: '  Renamed  ' }).expect(200);
    expect(res.body.title).toBe('Renamed');
    await patch(id, { title: '   ' }).expect(400);
  });

  it('replaces skills and marks them as user-chosen', async () => {
    t = await createTestApp({ identifySkills: async (titles) => titles.map(() => ['Backend']) });
    const res = await t.api.post('/api/tasks').send({ title: 'AI classified' }).expect(201);
    expect(res.body.skillsIdentifiedByLlm).toBe(true);

    const edited = await patch(res.body.id, { skillIds: [t.skillId('Frontend')] }).expect(200);
    expect(edited.body).toMatchObject({ skills: [{ name: 'Frontend' }], skillsIdentifiedByLlm: false });
    await patch(res.body.id, { skillIds: [9999] }).expect(422);
  });

  it('rejects a skill change the current assignee does not cover, leaving the task unchanged', async () => {
    t = await createTestApp();
    const { id } = await createTask(['Frontend']);
    await patch(id, { assigneeId: t.developerId('Alice') }).expect(200);

    const res = await patch(id, { skillIds: [t.skillId('Frontend'), t.skillId('Backend')] }).expect(422);
    expect(res.body.error).toEqual({ code: 'SKILL_MISMATCH', message: 'Alice is missing required skill(s): Backend' });

    const after = await t.api.get(`/api/tasks/${id}`);
    expect(after.body.skills.map((s: { name: string }) => s.name)).toEqual(['Frontend']);
  });

  it('checks the resulting state when skills and assignee change together', async () => {
    t = await createTestApp();
    const { id } = await createTask(['Frontend']);
    await patch(id, { assigneeId: t.developerId('Alice') }).expect(200);

    const res = await patch(id, {
      skillIds: [t.skillId('Frontend'), t.skillId('Backend')],
      assigneeId: t.developerId('Carol'),
    }).expect(200);
    expect(res.body.assignee.name).toBe('Carol');
  });

  it('asks the LLM again, using the latest title, when skills are cleared', async () => {
    const identifySkills = vi.fn<IdentifySkills>(async (titles) => titles.map(() => ['Backend']));
    t = await createTestApp({ identifySkills });
    const { id } = await createTask(['Frontend']);

    const res = await patch(id, { title: 'Add audit logging', skillIds: [] }).expect(200);
    expect(identifySkills).toHaveBeenCalledWith(['Add audit logging'], ['Frontend', 'Backend']);
    expect(res.body).toMatchObject({ skills: [{ name: 'Backend' }], skillsIdentifiedByLlm: true });
  });

  it('leaves the task with no skills when re-identification fails', async () => {
    t = await createTestApp();
    const { id } = await createTask(['Frontend']);
    const res = await patch(id, { skillIds: [] }).expect(200);
    expect(res.body).toMatchObject({ skills: [], skillsIdentifiedByLlm: false });
  });

  it('does not touch skills when only the title changes', async () => {
    const identifySkills = vi.fn<IdentifySkills>();
    t = await createTestApp({ identifySkills });
    const { id } = await createTask(['Backend']);
    const res = await patch(id, { title: 'New title' }).expect(200);
    expect(res.body.skills.map((s: { name: string }) => s.name)).toEqual(['Backend']);
    expect(identifySkills).not.toHaveBeenCalled();
  });
});

describe('deleting tasks', () => {
  it('deletes a task together with its whole subtree', async () => {
    t = await createTestApp();
    const root = await createTask([], {
      skillIds: [t.skillId('Frontend')],
      subtasks: [{ title: 'Child', skillIds: [t.skillId('Frontend')], subtasks: [{ title: 'Grandchild', skillIds: [t.skillId('Frontend')] }] }],
    });

    await t.api.delete(`/api/tasks/${root.id}`).expect(204);
    expect((await t.api.get('/api/tasks')).body).toEqual([]);
    await t.api.get(`/api/tasks/${root.subtasks[0]!.id}`).expect(404);
    await t.api.delete(`/api/tasks/${root.id}`).expect(404);
  });

  it('deleting the last open subtask lets the parent be completed', async () => {
    t = await createTestApp();
    const root = await createTask(['Frontend'], {
      subtasks: [
        { title: 'Done one', skillIds: [t.skillId('Frontend')] },
        { title: 'Abandoned', skillIds: [t.skillId('Frontend')] },
      ],
    });
    const [done, abandoned] = root.subtasks as [{ id: number }, { id: number }];
    await patch(done.id, { status: 'done' }).expect(200);
    await patch(root.id, { status: 'done' }).expect(409);

    await t.api.delete(`/api/tasks/${abandoned.id}`).expect(204);
    await patch(root.id, { status: 'done' }).expect(200);
  });
});
