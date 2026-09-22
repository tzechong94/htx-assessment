import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Toaster } from '@/components/ui/sonner';
import { makeTask, renderWithClient, SKILLS } from '@/test/utils';
import { IdentifySkillsButton } from './identify-skills-button';

function mockFetch(skills: typeof SKILLS) {
  const task = makeTask({ id: 3, skills, skillsIdentifiedByLlm: skills.length > 0 });
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(task), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const ui = (
  <>
    <IdentifySkillsButton taskId={3} />
    <Toaster />
  </>
);

afterEach(() => vi.unstubAllGlobals());

describe('IdentifySkillsButton', () => {
  it('asks the API to identify skills by sending an empty skill list', async () => {
    const fetchMock = mockFetch([SKILLS[1]!]);
    const { user } = renderWithClient(ui);

    await user.click(screen.getByRole('button', { name: 'Identify skills' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/tasks/3');
    expect(init).toMatchObject({ method: 'PATCH' });
    expect(JSON.parse(init!.body as string)).toEqual({ skillIds: [] });
    expect(screen.queryByText("Couldn't identify skills")).not.toBeInTheDocument();
  });

  it('tells the user when identification comes back empty again', async () => {
    mockFetch([]);
    const { user } = renderWithClient(ui);

    await user.click(screen.getByRole('button', { name: 'Identify skills' }));

    expect(await screen.findByText("Couldn't identify skills")).toBeInTheDocument();
  });
});
