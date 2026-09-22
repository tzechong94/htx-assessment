import { Router } from 'express';
import type { Db } from '../db/client.js';
import { getSkill, listSkills } from '../services/skills.js';
import { idParam } from './params.js';

export function skillsRouter(db: Db) {
  const router = Router();

  router.get('/', async (_req, res) => {
    res.json(await listSkills(db));
  });

  router.get('/:id', async (req, res) => {
    const { id } = idParam.parse(req.params);
    res.json(await getSkill(db, id));
  });

  return router;
}
