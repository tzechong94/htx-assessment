import { screen, within } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { renderWithClient } from '@/test/utils';
import { isDraftValid, newDraft, TaskDraftEditor, toCreateInput, type TaskDraft } from './task-draft-editor';

let latest: TaskDraft;

function Harness() {
  const [draft, setDraft] = useState<TaskDraft>(newDraft);
  latest = draft;
  return <TaskDraftEditor draft={draft} onChange={setDraft} path="" showErrors={false} />;
}

describe('TaskDraftEditor', () => {
  it('renders nested subtask editors with outline numbering, and removes them', async () => {
    const { user } = renderWithClient(<Harness />);
    // Within any editor, its own "Add subtask" button comes after its nested editors.
    const ownAddButton = (scope: HTMLElement = document.body) =>
      within(scope).getAllByRole('button', { name: 'Add subtask' }).at(-1)!;

    await user.click(ownAddButton());
    await user.click(ownAddButton());
    await user.click(ownAddButton(screen.getByRole('group', { name: 'Subtask 1' })));

    expect(screen.getByRole('group', { name: 'Subtask 1' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Subtask 1.1' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Subtask 2' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Remove subtask 1' }));
    // The former Subtask 2 is renumbered to 1, and the removed subtask's child went with it.
    expect(screen.queryByRole('group', { name: 'Subtask 1.1' })).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Subtask 2' })).not.toBeInTheDocument();
    expect(latest.subtasks).toHaveLength(1);
    expect(latest.subtasks[0]!.subtasks).toEqual([]);
  });

  it('builds the nested API payload from what was typed and selected', async () => {
    const { user } = renderWithClient(<Harness />);

    await user.type(screen.getByLabelText('Title'), '  Profile page  ');
    await user.click(screen.getByRole('button', { name: 'Add subtask' }));
    await user.type(screen.getAllByLabelText('Title')[1]!, 'Profile API');
    await user.click(screen.getAllByRole('button', { name: 'Backend' })[1]!);

    expect(toCreateInput(latest)).toEqual({
      title: 'Profile page',
      skillIds: [],
      subtasks: [{ title: 'Profile API', skillIds: [2], subtasks: [] }],
    });
  });

  it('is invalid while any title in the tree is blank', () => {
    const child = { ...newDraft(), title: '' };
    expect(isDraftValid({ ...newDraft(), title: 'Parent', subtasks: [child] })).toBe(false);
    expect(isDraftValid({ ...newDraft(), title: 'Parent', subtasks: [{ ...child, title: 'Child' }] })).toBe(true);
  });
});
