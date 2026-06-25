// FILE: packages/engine/src/index.ts

import fs from 'fs';
import path from 'path';
import { getOutputDir, getTmpDir, cleanup } from './utils/fileManager';
import { Payload, PayloadSchema } from './validation/payloadSchema';
import { QuranAdapter } from './adapters/QuranAdapter';
import { TimingAdapter } from './adapters/TimingAdapter';
import { MediaAdapter } from './adapters/MediaAdapter';
import { generateAssFile } from './pipeline/subtitleGenerator';
import { runFfmpeg } from './pipeline/ffmpegEngine';
import { startMaintenanceScheduler } from './maintenance/scheduler';
import { WazakkirError, WazakkirException } from './types/errors';
import { PipelineResult } from './types/index';
import { logger } from './utils/logger';

// Instantiate adaptors at module load
const quranAdapter = new QuranAdapter();
const timingAdapter = new TimingAdapter();
const mediaAdapter = new MediaAdapter();

export async function runPipeline(
  payload: any,
  jobId: string          // receives jobId from queue
): Promise<PipelineResult> {
  logger.info({ jobId, payload }, 'Executing coordinator video rendering pipeline run');

  const tmpDir = path.join(getTmpDir(), jobId);  // isolated per job
  fs.mkdirSync(tmpDir, { recursive: true });

  const outputPath = path.join(
    getOutputDir(),
    `${jobId}.mp4`
  );

  try {
    // Step 1 — Validate payload Zod safety
    const parsedPayload = PayloadSchema.parse(payload);

    // Step 2 — Fetch resources (all three employ internal withCache adapters)
    const ayahsData = await quranAdapter.fetchAyahs(
      parsedPayload.surah, 
      parsedPayload.ayahFrom, 
      parsedPayload.ayahTo
    );
    
    const timingData = await timingAdapter.fetchTimings(
      parsedPayload.surah, 
      parsedPayload.reciterId
    );
    
    const mediaData = await mediaAdapter.fetchBackgroundVideo(
      parsedPayload.backgroundQuery, 
      parsedPayload.videoFormat
    );

    // Step 3 — Generate subtitle .ass file
    const assPath = path.join(tmpDir, 'subtitles.ass');
    await generateAssFile(ayahsData.ayahs, timingData, parsedPayload, assPath);

    // Ensure reciter audio is fully downloaded for FFmpeg rendering
    const localMp3Path = await timingAdapter.ensureReciterAudioDownloaded(
      parsedPayload.surah,
      parsedPayload.reciterId
    );

    // Step 4 — Run child-process FFmpeg
    const start = Date.now();
    await runFfmpeg(
      { 
        ayahs: ayahsData.ayahs, 
        timing: timingData, 
        media: mediaData, 
        assFilePath: assPath,
        mp3FilePath: localMp3Path,
        surah: parsedPayload.surah
      },
      parsedPayload, 
      outputPath
    );

    // Step 5 — Cleanup intermediate folder while keeping targets
    await cleanup([tmpDir]);

    return {
      outputPath,
      durationMs: Date.now() - start,
      format: parsedPayload.videoFormat,
      surah: parsedPayload.surah,
      ayahFrom: parsedPayload.ayahFrom,
      ayahTo: parsedPayload.ayahTo,
    };

  } catch (err: any) {
    logger.error({ jobId, error: err.message || String(err) }, 'Coordinator pipeline run encountered an unhandled exception');
    
    // Always clean up isolated tmp directories on failure to avoid leaking storage
    await cleanup([tmpDir]).catch(() => {});
    
    if (err.code) {
      throw err;
    }
    
    throw new WazakkirException(
      'ADAPTER_ERROR',
      err instanceof Error ? err.message : String(err),
      { jobId }
    );
  }
}

// Re-export other essential modules for boots and operations
export { getDb, getStatements, updateReciterIdsLive } from './db/database';
export { enqueueGeneration, getQueueStats, bootstrapQueueRecovery } from './queue/generationQueue';
export { startMaintenanceScheduler } from './maintenance/scheduler';
export { GeneralMediaAdapter } from './adapters/MediaAdapter';


