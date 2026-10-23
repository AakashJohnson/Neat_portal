import { Router } from 'express';
import { db } from '../database/knex.js';

export const healthRouter = Router();

/** Liveness: the process is up. */
healthRouter.get('/live', (_req, res) => res.json({ status: 'ok' }));

/** Readiness: the existing database is reachable (read-only probe). */
healthRouter.get('/ready', async (_req, res) => {
  try {
    await db.raw('select 1');
    res.json({ status: 'ok', database: 'up' });
  } catch {
    res.status(503).json({ status: 'error', database: 'down' });
  }
});
