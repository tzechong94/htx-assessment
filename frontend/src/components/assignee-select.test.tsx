import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { DEVELOPERS, SKILLS } from '@/test/utils';
import { AssigneeSelect } from './assignee-select';

describe('AssigneeSelect', () => {
  it('only enables developers who hold every required skill, and says what the others lack', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<AssigneeSelect assignee={null} requiredSkills={SKILLS} developers={DEVELOPERS} onChange={onChange} />);

    await user.click(screen.getByRole('combobox', { name: 'Assignee' }));

    expect(screen.getByRole('option', { name: /Alice/ })).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('option', { name: /Alice/ })).toHaveTextContent('No Backend');
    expect(screen.getByRole('option', { name: /Bob/ })).toHaveTextContent('No Frontend');
    expect(screen.getByRole('option', { name: /Carol/ })).not.toHaveAttribute('aria-disabled');

    await user.click(screen.getByRole('option', { name: /Carol/ }));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it('unassigns with null', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <AssigneeSelect assignee={{ id: 1, name: 'Alice' }} requiredSkills={[]} developers={DEVELOPERS} onChange={onChange} />,
    );

    await user.click(screen.getByRole('combobox', { name: 'Assignee' }));
    await user.click(screen.getByRole('option', { name: /Unassigned/ }));
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
