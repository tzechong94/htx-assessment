import type { Task, TaskStatus } from './api';

export const flattenTasks = (tasks: Task[]): Task[] => tasks.flatMap((t) => [t, ...flattenTasks(t.subtasks)]);

/**
 * Client-side mirror of the API's invariant (a Done task has only Done subtasks), used to disable
 * options up front. The API remains the source of truth.
 */
export function blockedStatuses(task: Task, parent: Task | undefined): Partial<Record<TaskStatus, string>> {
  const blocked: Partial<Record<TaskStatus, string>> = {};
  if (task.subtasks.some((s) => s.status !== 'done')) {
    blocked.done = 'Subtasks open';
  }
  if (parent?.status === 'done') {
    blocked.todo = 'Parent is Done';
    blocked.in_progress = 'Parent is Done';
  }
  return blocked;
}
