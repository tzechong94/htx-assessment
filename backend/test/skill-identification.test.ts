import { afterEach, describe, expect, it, vi } from 'vitest';
import { createGeminiSkillIdentifier, type IdentifySkills } from '../src/services/skill-identifier.js';
import { createTestApp } from './helpers.js';

describe('creating tasks without skills', () => {
  let t: Awaited<ReturnType<typeof createTestApp>> | undefined;
  afterEach(() => t?.close());

  it('asks the LLM once, only for the nodes without user-specified skills', async () => {
    const identifySkills = vi.fn<IdentifySkills>(async (titles) =>
      titles.map((title) => (title.includes('API') ? ['Backend'] : ['Frontend', 'Backend'])),
    );
    t = await createTestApp({ identifySkills });

    const res = await t.api
      .post('/api/tasks')
      .send({
        title: 'Profile page',
        subtasks: [
          { title: 'Profile form', skillIds: [t.skillId('Frontend')] },
          { title: 'Profile API', subtasks: [] },
        ],
      })
      .expect(201);

    expect(identifySkills).toHaveBeenCalledTimes(1);
    expect(identifySkills).toHaveBeenCalledWith(['Profile page', 'Profile API'], ['Frontend', 'Backend']);

    const [form, api] = res.body.subtasks;
    expect(res.body).toMatchObject({
      skillsIdentifiedByLlm: true,
      skills: [{ name: 'Frontend' }, { name: 'Backend' }],
    });
    expect(form).toMatchObject({ skillsIdentifiedByLlm: false, skills: [{ name: 'Frontend' }] });
    expect(api).toMatchObject({ skillsIdentifiedByLlm: true, skills: [{ name: 'Backend' }] });
  });

  it('does not call the LLM when every node has skills', async () => {
    const identifySkills = vi.fn<IdentifySkills>();
    t = await createTestApp({ identifySkills });
    await t.api.post('/api/tasks').send({ title: 'x', skillIds: [t.skillId('Backend')] }).expect(201);
    expect(identifySkills).not.toHaveBeenCalled();
  });

  it('still creates the task, with no skills, when identification fails', async () => {
    t = await createTestApp({ identifySkills: async (titles) => titles.map(() => null) });
    const res = await t.api.post('/api/tasks').send({ title: 'Something vague' }).expect(201);
    expect(res.body).toMatchObject({ skills: [], skillsIdentifiedByLlm: false });
  });

  it('enforces LLM-identified skills on assignment like any other', async () => {
    t = await createTestApp({ identifySkills: async (titles) => titles.map(() => ['Backend']) });
    const res = await t.api.post('/api/tasks').send({ title: 'Audit logs' }).expect(201);
    await t.api.patch(`/api/tasks/${res.body.id}`).send({ assigneeId: t.developerId('Alice') }).expect(422);
    await t.api.patch(`/api/tasks/${res.body.id}`).send({ assigneeId: t.developerId('Bob') }).expect(200);
  });
});

describe('Gemini skill identifier', () => {
  const skills = ['Frontend', 'Backend'];

  function geminiReply(results: unknown, status = 200) {
    const body = { candidates: [{ content: { parts: [{ text: JSON.stringify({ results }) }] } }] };
    return vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status }));
  }

  it('sends constrained JSON output and maps results back by index', async () => {
    const fetch = geminiReply([
      { index: 1, skills: ['Backend'] },
      { index: 0, skills: ['Frontend', 'Frontend'] },
    ]);
    const identify = createGeminiSkillIdentifier({ apiKey: 'k', model: 'gemini-test', fetch });

    await expect(identify(['Homepage', 'Audit logs'], skills)).resolves.toEqual([['Frontend'], ['Backend']]);

    const [url, init] = fetch.mock.calls[0]!;
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-test:generateContent');
    expect(init?.headers).toMatchObject({ 'x-goog-api-key': 'k' });
    const body = JSON.parse(init!.body as string);
    expect(body.generationConfig.responseMimeType).toBe('application/json');
    expect(body.generationConfig.responseSchema.properties.results.items.properties.skills.items.enum).toEqual(
      skills,
    );
  });

  it('returns null for titles the model skipped or answered with unknown skills', async () => {
    const fetch = geminiReply([{ index: 0, skills: ['DevOps'] }]);
    const identify = createGeminiSkillIdentifier({ apiKey: 'k', model: 'm', fetch });
    await expect(identify(['a', 'b'], skills)).resolves.toEqual([null, null]);
  });

  it('returns nulls without calling the API when no key is configured', async () => {
    const fetch = vi.fn<typeof fetch>();
    const identify = createGeminiSkillIdentifier({ apiKey: undefined, model: 'm', fetch });
    await expect(identify(['a'], skills)).resolves.toEqual([null]);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('returns nulls on HTTP errors, malformed output and network failures', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const failures: (typeof fetch)[] = [
      geminiReply([], 429),
      vi.fn(async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'not json' }] } }] }))),
      vi.fn(async () => {
        throw new TypeError('fetch failed');
      }),
    ];
    for (const fetch of failures) {
      const identify = createGeminiSkillIdentifier({ apiKey: 'k', model: 'm', fetch });
      await expect(identify(['a'], skills)).resolves.toEqual([null]);
    }
  });
});
