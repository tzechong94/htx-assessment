import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { TASK_STATUSES } from '../db/schema.js';
import type { IdentifySkills } from '../services/skill-identifier.js';
import { createTask, getTask, listTasks, updateTask } from '../services/tasks.js';
import { idParam } from './params.js';

// Bounds a single request, since every node is a row insert (and later an LLM classification).
const MAX_TASKS_PER_REQUEST = 50;

const taskNode = z.object({
  title: z.string().trim().min(1).max(500),
  skillIds: z.array(z.number().int().positive()).default([]),
  get subtasks() {
    return z.array(taskNode).default([]);
  },
});

type TaskNode = z.infer<typeof taskNode>;
const countNodes = (node: TaskNode): number => 1 + node.subtasks.reduce((n, s) => n + countNodes(s), 0);

const createTaskBody = taskNode.refine((root) => countNodes(root) <= MAX_TASKS_PER_REQUEST, {
  message: `A task tree may contain at most ${MAX_TASKS_PER_REQUEST} tasks`,
});

const updateTaskBody = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
  })
  .refine((body) => body.status !== undefined || body.assigneeId !== undefined, {
    message: 'Provide at least one of status or assigneeId',
  });

export function tasksRouter(db: Db, identifySkills: IdentifySkills) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await listTasks(db));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await getTask(db, id));
  });

  router.post('/', async (req, res) => {
    const body = createTaskBody.parse(req.body);
    res.status(201).json(await createTask(db, identifySkills, body));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateTaskBody.parse(req.body);
    res.json(await updateTask(db, id, body));
  });

  return router;
}
