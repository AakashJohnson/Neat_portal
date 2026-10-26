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
import { paymentRouter } from './payment.routes.js';
import { stockRouter } from './stock.routes.js';
import { panelRouter } from './panel.routes.js';
import { recoveredRouter } from './recovered.routes.js';


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
apiRouter.use(paymentRouter);
apiRouter.use(stockRouter);
apiRouter.use(panelRouter);
apiRouter.use(recoveredRouter);
