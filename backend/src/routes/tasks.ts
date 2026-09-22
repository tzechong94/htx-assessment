import { Router } from 'express';
import { z } from 'zod';
import type { Db } from '../db/client.js';
import { TASK_STATUSES } from '../db/schema.js';
import { createTask, getTask, listTasks, updateTask } from '../services/tasks.js';
import { idParam } from './params.js';

const createTaskBody = z.object({
  title: z.string().trim().min(1).max(500),
  skillIds: z.array(z.number().int().positive()).default([]),
});

const updateTaskBody = z
  .object({
    status: z.enum(TASK_STATUSES).optional(),
    assigneeId: z.number().int().positive().nullable().optional(),
  })
  .refine((body) => body.status !== undefined || body.assigneeId !== undefined, {
    message: 'Provide at least one of status or assigneeId',
  });

export function tasksRouter(db: Db) {
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
    res.status(201).json(await createTask(db, body));
  });

  router.patch('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    const body = updateTaskBody.parse(req.body);
    res.json(await updateTask(db, id, body));
  });

  return router;
}
