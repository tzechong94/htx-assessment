export type TaskStatus = 'todo' | 'in_progress' | 'done';

export type Skill = { id: number; name: string };

export type DeveloperRef = { id: number; name: string };

export type Developer = DeveloperRef & {
  skills: Skill[];
  tasks: { id: number; title: string; status: TaskStatus }[];
};

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  parentId: number | null;
  skills: Skill[];
  skillsIdentifiedByLlm: boolean;
  assignee: DeveloperRef | null;
  createdAt: string;
  subtasks: Task[];
};

export type CreateTaskInput = { title: string; skillIds: number[]; subtasks: CreateTaskInput[] };

export type UpdateTaskInput = { status?: TaskStatus; assigneeId?: number | null };

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, body?.error?.code ?? 'UNKNOWN', body?.error?.message ?? res.statusText);
  }
  return body as T;
}

export const api = {
  listTasks: () => request<Task[]>('/tasks'),
  listDevelopers: () => request<Developer[]>('/developers'),
  listSkills: () => request<Skill[]>('/skills'),
  createTask: (input: CreateTaskInput) =>
    request<Task>('/tasks', { method: 'POST', body: JSON.stringify(input) }),
  updateTask: (id: number, input: UpdateTaskInput) =>
    request<Task>(`/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(input) }),
};
