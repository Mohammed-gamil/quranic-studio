// FILE: packages/engine/src/queue/generationQueue.ts
// NOTE: We import pipeline dependencies directly instead of from '../index'
// to avoid a circular dependency (index.ts re-exports this module).

import Queue from 'better-queue';
import fs from 'fs';
import { getStatements, getDb } from '../db/database';
import { Payload, PayloadSchema } from '../validation/payloadSchema';
import { WazakkirError } from '../types/errors';
import { logger } from '../utils/logger';

// Lazy import to fully break the circular dependency at module-load time.
// runPipeline is only needed when a task executes, not at import time.
let _runPipeline: ((payload: Payload, jobId: string) => Promise<any>) | null = null;
async function getRunPipeline() {
  if (!_runPipeline) {
    const mod = await import('../index');
    _runPipeline = mod.runPipeline;
  }
  return _runPipeline;
}

interface QueueTask {
  jobId: string;        // uuid — already inserted in DB as 'queued'
  payload: Payload;
}

const queue = new Queue<QueueTask, void>(
  async (task, done) => {
    const stmts = getStatements();
    try {
      logger.info({ jobId: task.jobId }, 'Queue task fetched, marking as processing');
      stmts.updateGenerationStatus.run({
        id: task.jobId,
        status: 'processing',
        outputPath: null,
        errorMsg: null,
        durationMs: null,
        fileSizeBytes: null,
      });

      const runPipeline = await getRunPipeline();
      const result = await runPipeline(task.payload, task.jobId);

      const stat = fs.statSync(result.outputPath);
      stmts.updateGenerationStatus.run({
        id: task.jobId,
        status: 'done',
        outputPath: result.outputPath,
        errorMsg: null,
        durationMs: result.durationMs,
        fileSizeBytes: stat.size,
      });
      
      logger.info({ jobId: task.jobId, fileSizeBytes: stat.size }, 'Queue task finished compiling successfully');
      done(null);
    } catch (err: unknown) {
      const e = err as WazakkirError;
      const errorMsg = e.message || String(err);
      logger.error({ jobId: task.jobId, error: errorMsg }, 'Queue task failed during pipeline execution');
      
      stmts.updateGenerationStatus.run({
        id: task.jobId,
        status: 'error',
        outputPath: null,
        errorMsg: errorMsg,
        durationMs: null,
        fileSizeBytes: null,
      });
      done(e);
    }
  },
  {
    concurrent: 1,          // one video at a time (CPU-bound FFmpeg)
    maxRetries: 0,          // no silent retries — fail fast, show error
    retryDelay: 0,
    afterProcessDelay: 200, // small breathing gap between jobs
  }
);

export function enqueueGeneration(
  jobId: string,
  payload: Payload
): void {
  logger.info({ jobId }, 'Enqueuing task onto better-queue');
  queue.push({ jobId, payload });
}

export function getQueueStats(): { queued: number; running: number } {
  return {
    queued:  (queue as any).length ?? 0,
    running: (queue as any).running ?? 0,
  };
}

export function bootstrapQueueRecovery(): void {
  logger.info('Performing bootstrap queue recovery check...');
  try {
    const db = getDb();
    
    // 1. Mark interrupted processing jobs as crashed
    const procRes = db.prepare(`
      UPDATE generations 
      SET status = 'error', 
          error_msg = 'Server process terminated abruptly during rendering',
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now') 
      WHERE status = 'processing'
    `).run();
    if (procRes.changes > 0) {
      logger.info({ interruptedCount: procRes.changes }, 'Abruptly terminated rendering tasks marked as error');
    }

    // 2. Re-enqueue queued tasks
    const queuedJobs = db.prepare(`
      SELECT id, surah, ayah_from, ayah_to, reciter_id, format, background_query 
      FROM generations 
      WHERE status = 'queued'
    `).all() as any[];

    for (const job of queuedJobs) {
      logger.info({ jobId: job.id }, 'Re-enqueuing task on boot recovery');
      try {
        const fullPayload = PayloadSchema.parse({
          surah: Number(job.surah),
          ayahFrom: Number(job.ayah_from),
          ayahTo: Number(job.ayah_to),
          reciterId: Number(job.reciter_id),
          backgroundQuery: String(job.background_query),
          videoFormat: job.format as 'vertical' | 'horizontal'
        });
        enqueueGeneration(job.id, fullPayload);
      } catch (err: any) {
        logger.error({ jobId: job.id, error: err.message }, 'Failed to parse recovered job payload');
      }
    }
    if (queuedJobs.length > 0) {
      logger.info({ recoveredCount: queuedJobs.length }, 'Successfully re-enqueued outstanding queued tasks');
    }
  } catch (err: any) {
    logger.error({ error: err.message }, 'Failed during bootstrap queue recovery');
  }
}
