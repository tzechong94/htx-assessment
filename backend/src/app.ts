import express, { type ErrorRequestHandler } from 'express';
import { ZodError } from 'zod';
import type { Db } from './db/client.js';
import { HttpError } from './lib/errors.js';
import { developersRouter } from './routes/developers.js';
import { skillsRouter } from './routes/skills.js';
import { tasksRouter } from './routes/tasks.js';
import type { IdentifySkills } from './services/skill-identifier.js';

export type AppDeps = {
  db: Db;
  identifySkills: IdentifySkills;
};

const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request is invalid',
        issues: err.issues.map((i) => ({ path: i.path.join('.'), message: i.message })),
      },
    });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: { code: err.code, message: err.message } });
    return;
  }
  // Malformed JSON bodies surface from express.json() as a 400 with `type` set.
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: { code: 'INVALID_JSON', message: 'Request body is not valid JSON' } });
    return;
  }
  console.error(err);
  res.status(500).json({ error: { code: 'INTERNAL', message: 'Something went wrong' } });
};

export function createApp({ db, identifySkills }: AppDeps) {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });
  app.use('/api/skills', skillsRouter(db));
  app.use('/api/developers', developersRouter(db));
  app.use('/api/tasks', tasksRouter(db, identifySkills));

  app.use('/api', (_req, res) => {
    res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Route not found' } });
  });
  app.use(errorHandler);

  return app;
}
