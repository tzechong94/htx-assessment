import type { TaskStatus } from './api';

export const STATUSES: { value: TaskStatus; label: string; dot: string }[] = [
  { value: 'todo', label: 'To-do', dot: 'bg-slate-400' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-amber-500' },
  { value: 'done', label: 'Done', dot: 'bg-emerald-500' },
];
