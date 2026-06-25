import { Router } from 'express';
import { quranRouter } from './quranRoutes';
import { mediaRouter, reciterRouter } from './mediaRoutes';
import { generationRouter } from './generationRoutes';

export const apiRouter = Router();

apiRouter.use('/quran', quranRouter);
apiRouter.use('/', mediaRouter);
apiRouter.use('/reciters', reciterRouter);
apiRouter.use('/', generationRouter); // Note: generation router paths do not have prefix like /generation in them except the router itself. We mounted routes directly to root like `/generate`. Let's fix that. Wait, the generationRouter has `/generate`, `/status/:jobId`, `/download/:jobId`, `/history`, `/:jobId` (DELETE), `/export/:jobId`. So it's fine.

