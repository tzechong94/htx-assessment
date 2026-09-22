import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactElement } from 'react';
import { queryKeys } from '@/hooks/queries';
import type { Developer, Skill, Task } from '@/lib/api';

export const SKILLS: Skill[] = [
  { id: 1, name: 'Frontend' },
  { id: 2, name: 'Backend' },
];

const [frontend, backend] = SKILLS as [Skill, Skill];

export const DEVELOPERS: Developer[] = [
  { id: 1, name: 'Alice', skills: [frontend], tasks: [] },
  { id: 2, name: 'Bob', skills: [backend], tasks: [] },
  { id: 3, name: 'Carol', skills: [frontend, backend], tasks: [] },
];

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: 1,
    title: 'Task',
    status: 'todo',
    parentId: null,
    skills: [],
    skillsIdentifiedByLlm: false,
    assignee: null,
    createdAt: '2026-09-22T00:00:00.000Z',
    subtasks: [],
    ...overrides,
  };
}

/** Renders with a query cache pre-filled with reference data, so components never hit the network for it. */
export function renderWithClient(ui: ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.skills, SKILLS);
  queryClient.setQueryData(queryKeys.developers, DEVELOPERS);
  return {
    user: userEvent.setup(),
    queryClient,
    ...render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>),
  };
}
