import { Router } from 'express';
import { authRouter } from './auth.routes.js';
import { verificationRouter } from './verification.routes.js';
import { grievanceRouter } from './grievance.routes.js';
import { courseRouter } from './course.routes.js';
import { studentRouter } from './student.routes.js';
import { instituteRouter } from './institute.routes.js';
import { adminRouter } from './admin.routes.js';
import { companyRouter } from './company.routes.js';
import { fileRouter } from './file.routes.js';

// Mounted at /api (Laravel RouteServiceProvider: prefix "api", api middleware group).
// Feature routers are added here batch by batch; see migration-docs/API_MAPPING.md.
export const apiRouter = Router();

apiRouter.use(authRouter);
apiRouter.use(verificationRouter);
apiRouter.use(grievanceRouter);
apiRouter.use(courseRouter);
apiRouter.use(studentRouter);
apiRouter.use(instituteRouter);
apiRouter.use(adminRouter);
apiRouter.use(companyRouter);
apiRouter.use(fileRouter);
