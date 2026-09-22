import { Router } from 'express';
import type { Db } from '../db/client.js';
import { getDeveloper, listDevelopers } from '../services/developers.js';
import { idParam } from './params.js';

export function developersRouter(db: Db) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await listDevelopers(db));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await getDeveloper(db, id));
  });

  return router;
}
