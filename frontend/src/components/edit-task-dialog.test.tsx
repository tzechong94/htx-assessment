import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { makeTask, renderWithClient, SKILLS } from '@/test/utils';
import { EditTaskDialog } from './edit-task-dialog';

const task = makeTask({ id: 7, title: 'Audit logs', skills: [SKILLS[1]!], skillsIdentifiedByLlm: true });

function mockFetch() {
  const fetchMock = vi.fn<typeof fetch>(async () => new Response(JSON.stringify(task), { status: 200 }));
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

const sentBody = (fetchMock: ReturnType<typeof mockFetch>) => JSON.parse(fetchMock.mock.calls[0]![1]!.body as string);

afterEach(() => vi.unstubAllGlobals());

describe('EditTaskDialog', () => {
  it('sends only the title when skills are untouched, keeping their AI marker', async () => {
    const fetchMock = mockFetch();
    const onOpenChange = vi.fn();
    const { user } = renderWithClient(<EditTaskDialog task={task} open onOpenChange={onOpenChange} />);

    await user.clear(screen.getByLabelText('Title'));
    await user.type(screen.getByLabelText('Title'), 'Audit logs v2');
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(fetchMock).toHaveBeenCalledWith('/api/tasks/7', expect.objectContaining({ method: 'PATCH' }));
    expect(sentBody(fetchMock)).toEqual({ title: 'Audit logs v2' });
  });

  it('sends the new skill set when skills change', async () => {
    const fetchMock = mockFetch();
    const { user } = renderWithClient(<EditTaskDialog task={task} open onOpenChange={vi.fn()} />);

    await user.click(screen.getByRole('button', { name: 'Frontend' }));
    await user.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(sentBody(fetchMock)).toEqual({ skillIds: [2, 1] });
  });

  it('closes without a request when nothing changed', async () => {
    const fetchMock = mockFetch();
    const onOpenChange = vi.fn();
    const { user } = renderWithClient(<EditTaskDialog task={task} open onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('blocks saving a blank title', async () => {
    const fetchMock = mockFetch();
    const { user } = renderWithClient(<EditTaskDialog task={task} open onOpenChange={vi.fn()} />);

    await user.clear(screen.getByLabelText('Title'));
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(screen.getByText('Give the task a title.')).toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
