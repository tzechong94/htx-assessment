import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, it, vi } from 'vitest';
import { StatusSelect } from './status-select';

it('disables blocked statuses with the reason and still allows the rest', async () => {
  const user = userEvent.setup();
  const onChange = vi.fn();
  render(<StatusSelect value="todo" onChange={onChange} blocked={{ done: 'Subtasks open' }} />);

  await user.click(screen.getByRole('combobox', { name: 'Status' }));
  const done = screen.getByRole('option', { name: /Done/ });
  expect(done).toHaveAttribute('aria-disabled', 'true');
  expect(done).toHaveTextContent('Subtasks open');

  await user.click(screen.getByRole('option', { name: /In Progress/ }));
  expect(onChange).toHaveBeenCalledWith('in_progress');
});
