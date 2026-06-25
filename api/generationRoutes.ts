import { Router } from 'express';
import { getStatements, enqueueGeneration, GeneralMediaAdapter, getDb } from '../packages/engine/src/index';
import { PayloadSchema } from '../packages/engine/src/validation/payloadSchema';
import { logger } from '../packages/engine/src/utils/logger';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { GenerationRow } from '../packages/engine/src/types';

export const generationRouter = Router();

generationRouter.post('/generate', async (req, res) => {
  try {
    const parseResult = PayloadSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: parseResult.error.issues.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
        }
      });
    }

    const jobId = uuidv4();
    const payload = parseResult.data;

    getStatements().insertGeneration.run({
      id: jobId,
      surah: payload.surah,
      ayahFrom: payload.ayahFrom,
      ayahTo: payload.ayahTo,
      reciterId: payload.reciterId,
      format: payload.videoFormat,
      backgroundQuery: payload.backgroundQuery,
    });

    enqueueGeneration(jobId, payload);

    return res.status(202).json({
      success: true,
      jobId
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'POST /api/generate failed');
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: errorMessage }
    });
  }
});

generationRouter.get('/status/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const row = getStatements().getGenerationById.get(jobId) as GenerationRow | undefined;
    
    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job not found' }
      });
    }

    return res.json({
      success: true,
      data: row
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/status failed');
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: errorMessage }
    });
  }
});

generationRouter.get('/download/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const row = getStatements().getGenerationById.get(jobId) as GenerationRow | undefined;

    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Job record not found' }
      });
    }

    if (row.status !== 'done' || !row.output_path) {
      return res.status(400).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Video is not generated or processed yet' }
      });
    }

    const filePath = path.resolve(row.output_path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: { code: 'FILE_ERROR', message: 'Compiled video file was deleted or physically missing from storage' }
      });
    }

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    const filename = `QuranicStudio_Surah${row.surah}_Ayah${row.ayah_from}-${row.ayah_to}.mp4`;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
        'Content-Disposition': `attachment; filename="${filename}"`,
      };
      res.writeHead(200, head);
      fs.createReadStream(filePath).pipe(res);
    }

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/download failed');
    return res.status(500).json({
      success: false,
      error: { code: 'FILE_ERROR', message: errorMessage }
    });
  }
});

generationRouter.get('/history', (req, res) => {
  try {
    const limitVal = req.query.limit ? Number(req.query.limit) : 20;
    const limit = Math.min(Math.max(limitVal, 1), 100);

    const rows = getStatements().listRecentGenerations.all(limit);
    return res.json({
      success: true,
      data: rows
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/history failed');
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: errorMessage }
    });
  }
});

generationRouter.delete('/generation/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const row = getStatements().getGenerationById.get(jobId) as GenerationRow | undefined;

    if (!row) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Generation record not found' }
      });
    }

    if (row.status !== 'done' && row.status !== 'error') {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Active task is processing and cannot be deleted yet' }   
      });
    }

    if (row.output_path && fs.existsSync(row.output_path)) {
      try {
        fs.unlinkSync(row.output_path);
      } catch (fileErr) {
        logger.warn({ error: fileErr, path: row.output_path }, 'Failed to delete obsolete generation output file');
      }
    }

    const db = getDb();
    db.prepare(`DELETE FROM generations WHERE id = ?`).run(jobId);

    return res.json({
      success: true
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'DELETE /api/generation failed');
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: errorMessage }
    });
  }
});

generationRouter.post('/export/:jobId', (req, res) => {
  try {
    const { jobId } = req.params;
    const row = getStatements().getGenerationById.get(jobId) as GenerationRow | undefined;

    if (!row || row.status !== 'done' || !row.output_path) {
      return res.status(404).json({ success: false, error: 'Valid generation record not found' });
    }

    const sourcePath = path.resolve(row.output_path);
    if (!fs.existsSync(sourcePath)) {
      return res.status(404).json({ success: false, error: 'Source video file missing' });
    }

    const exportDir = path.join(process.cwd(), 'data', 'media', 'library', 'exports');
    if (!fs.existsSync(exportDir)) fs.mkdirSync(exportDir, { recursive: true });

    const filename = `QuranicStudio_Surah${row.surah}_Ayah${row.ayah_from}-${row.ayah_to}_${jobId.slice(0, 5)}.mp4`;
    const targetPath = path.join(exportDir, filename);

    fs.copyFileSync(sourcePath, targetPath);

    return res.json({
      success: true,
      message: 'Saved to permanent library',
      exportPath: targetPath
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'POST /api/export failed');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});
