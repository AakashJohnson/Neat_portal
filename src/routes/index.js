import { Router } from 'express';
import { authRouter } from './auth.routes.js';

// Mounted at /api (Laravel RouteServiceProvider: prefix "api", api middleware group).
// Feature routers are added here batch by batch; see migration-docs/API_MAPPING.md.
export const apiRouter = Router();

apiRouter.use(authRouter);
