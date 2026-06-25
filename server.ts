// FILE: server.ts

import express from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import axios from 'axios';
import { getDb, getStatements, enqueueGeneration, startMaintenanceScheduler, updateReciterIdsLive, GeneralMediaAdapter, bootstrapQueueRecovery } from './packages/engine/src/index';
import { GenerationRow } from './packages/engine/src/types/index';
import { PayloadSchema } from './packages/engine/src/validation/payloadSchema';
import { logger } from './packages/engine/src/utils/logger';

const ALLOWED_MIME_MAP: Record<string, string[]> = {
  'video/mp4': ['.mp4'],
  'video/quicktime': ['.mov'],
  'image/jpeg': ['.jpeg', '.jpg'],
  'image/png': ['.png'],
  'image/webp': ['.webp']
};

// Configure multer for local uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'media', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const validExtensions = ALLOWED_MIME_MAP[file.mimetype] || [];
    // Fallback to the first allowed extension if the uploaded extension is invalid/missing
    const safeExt = validExtensions.includes(ext) ? ext : (validExtensions[0] || '.bin');
    cb(null, `${uuidv4()}${safeExt}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype in ALLOWED_MIME_MAP) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, JPEG, PNG, and WEBP are allowed.'));
    }
  }
});

// Simple in-memory rate limiter to prevent DoS on writing endpoints
function createRateLimiter(windowMs: number, maxRequests: number, message: string) {
  const ipCache = new Map<string, { count: number; resetTime: number }>();
  
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    
    let record = ipCache.get(ip);
    if (!record || now > record.resetTime) {
      record = { count: 0, resetTime: now + windowMs };
    }
    
    record.count++;
    ipCache.set(ip, record);
    
    if (record.count > maxRequests) {
      return res.status(429).json({ success: false, error: message });
    }
    
    next();
  };
}

const uploadLimiter = createRateLimiter(15 * 60 * 1000, 10, 'Too many file uploads from this IP. Please try again after 15 minutes.');
const generateLimiter = createRateLimiter(60 * 1000, 5, 'Too many generation requests from this IP. Please try again in a minute.');

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // ────────────────────────────────────────────────────────
  // § 9.4 API ENDPOINTS (Consolidated for Reliability)
  // ────────────────────────────────────────────────────────
  
  const api = express.Router();

  // Health check
  api.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

  // Quran Proxy Routes
  api.get('/quran/chapters', async (req, res) => {
    try {
      const response = await axios.get('https://api.quran.com/api/v4/chapters?language=ar');
      return res.json(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMessage }, 'Proxy: Failed to fetch chapters');
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  api.get('/quran/verses/uthmani', async (req, res) => {
    try {
      const { chapter_number } = req.query;
      const response = await axios.get(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapter_number}`);
      return res.json(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  api.get('/quran/translations/20', async (req, res) => {
    try {
      const { chapter_number } = req.query;
      const response = await axios.get(`https://api.quran.com/api/v4/quran/translations/20?chapter_number=${chapter_number}`);
      return res.json(response.data);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Unified Sync Route for accurate frontend playback mapping
  api.get('/quran/sync', async (req, res) => {
    try {
      const surah = Number(req.query.surah);
      const reciterId = Number(req.query.reciterId);
      const from = Number(req.query.from) || 1;
      const to = Number(req.query.to) || 286;

      if (!surah || !reciterId) return res.status(400).json({ error: 'surah and reciterId are required' });

      const { QuranAdapter } = await import('./packages/engine/src/adapters/QuranAdapter');
      const { TimingAdapter } = await import('./packages/engine/src/adapters/TimingAdapter');

      const quranAdapter = new QuranAdapter();
      const timingAdapter = new TimingAdapter();

      const [quranData, timingData] = await Promise.all([
        quranAdapter.fetchAyahs(surah, from, to),
        timingAdapter.fetchTimings(surah, reciterId)
      ]);

      // Calculate offset — MUST match ffmpegEngine.ts and subtitleGenerator.ts exactly
      const firstVerseNum = from;
      let audioOffsetMs = 0;
      if (firstVerseNum === 1 && surah !== 1) {
        audioOffsetMs = 0;
      } else {
        const firstSeg = timingData.segments.find(t => t.ayah === firstVerseNum);
        if (firstSeg) audioOffsetMs = firstSeg.startMs;
      }

      const lastSeg = timingData.segments.find(t => t.ayah === to);
      const totalDurationMs = lastSeg ? (lastSeg.endMs - audioOffsetMs) : 0;

      // Return ABSOLUTE timing (matching the untrimmed frontend audio playback coordinate system)
      const syncedVerses = quranData.ayahs.map(ayah => {
        const timing = timingData.segments.find(t => t.ayah === ayah.number);
        return {
          ...ayah,
          startMs: timing ? timing.startMs : 0,
          endMs: timing ? timing.endMs : 0
        };
      });

      return res.json({
        success: true,
        data: {
          surah,
          reciterId,
          audioUrl: timingData.mp3Url,
          audioOffsetMs,
          totalDurationMs,
          verses: syncedVerses
        }
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      logger.error({ error: errorMessage }, 'Failed to fetch unified sync data');
      return res.status(500).json({ success: false, error: errorMessage });
    }
  });

  // Media & Reciters
  api.get('/reciters', (req, res) => {
    try {
      const reciters = getStatements().getAllReciters.all();
      return res.json({ success: true, data: reciters });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.get('/videos', async (req, res) => {
    try {
      const query = req.query.query ? String(req.query.query) : 'starry sky';
      const format = req.query.format === 'horizontal' ? 'horizontal' : 'vertical';
      const mediaAdapter = new GeneralMediaAdapter();
      const videoLink = await mediaAdapter.getBackgroundVideo(query, format);
      return res.json({ success: true, videoUrl: videoLink });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.get('/library', (req, res) => {
    try {
      const libraryDir = path.join(process.cwd(), 'data', 'media', 'library');
      const uploadsDir = path.join(process.cwd(), 'data', 'media', 'uploads');
      const getFiles = (dir: string, category: string) => {
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir, { withFileTypes: true }).filter(f => f.isFile()).map(f => ({
          name: f.name,
          url: `/data/media/${category}/${f.name}`,
          type: f.name.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
        }));
      };
      return res.json({ success: true, data: {
        videos: getFiles(path.join(libraryDir, 'videos'), 'library/videos'),
        images: getFiles(path.join(libraryDir, 'images'), 'library/images'),
        uploads: getFiles(uploadsDir, 'uploads')
      }});
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.post('/upload', uploadLimiter, upload.single('file'), (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ success: false, error: 'No file uploaded' });
      return res.json({ success: true, fileUrl: `/data/media/uploads/${req.file.filename}`, type: req.file.mimetype.startsWith('video') ? 'video' : 'image' });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  // Generation Pipeline
  api.post('/generate', generateLimiter, async (req, res) => {
    try {
      const parseResult = PayloadSchema.safeParse(req.body);
      if (!parseResult.success) return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Invalid payload' } });
      const jobId = uuidv4();
      getStatements().insertGeneration.run({ id: jobId, surah: parseResult.data.surah, ayahFrom: parseResult.data.ayahFrom, ayahTo: parseResult.data.ayahTo, reciterId: parseResult.data.reciterId, format: parseResult.data.videoFormat, backgroundQuery: parseResult.data.backgroundQuery });
      enqueueGeneration(jobId, parseResult.data);
      return res.status(202).json({ success: true, jobId });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.get('/status/:jobId', (req, res) => {
    try {
      const row = getStatements().getGenerationById.get(req.params.jobId) as GenerationRow | undefined;
      return row ? res.json({ success: true, data: row }) : res.status(404).json({ success: false, error: 'Not found' });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.get('/history', (req, res) => {
    try {
      const rows = getStatements().listRecentGenerations.all(20);
      return res.json({ success: true, data: rows });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.delete('/generation/:jobId', (req, res) => {
    try {
      const row = getStatements().getGenerationById.get(req.params.jobId) as GenerationRow | undefined;
      if (!row) return res.status(404).json({ success: false });
      if (row.output_path && fs.existsSync(row.output_path)) fs.unlinkSync(row.output_path);
      getDb().prepare(`DELETE FROM generations WHERE id = ?`).run(req.params.jobId);
      return res.json({ success: true });
    } catch (err: unknown) {
      return res.status(500).json({ success: false, error: String(err) });
    }
  });

  api.post('/export/:jobId', (req, res) => {
    try {
      const { jobId } = req.params;
      logger.info({ jobId }, 'Export request received');
      
      const row = getStatements().getGenerationById.get(jobId) as GenerationRow | undefined;
      
      if (!row) {
        logger.warn({ jobId }, 'Export failed: Job not found');
        return res.status(404).json({ success: false, error: 'Job not found' });
      }

      if (row.status !== 'done') {
        logger.warn({ jobId, status: row.status }, 'Export failed: Job not yet completed');
        return res.status(409).json({ success: false, error: `Job is still ${row.status}, cannot export` });
      }

      if (!row.output_path || !fs.existsSync(row.output_path)) {
        logger.warn({ jobId, path: row.output_path }, 'Export failed: Output file missing');
        return res.status(404).json({ success: false, error: 'Output file missing' });
      }

      const exportDir = path.join(process.cwd(), 'data', 'media', 'library', 'exports');
      if (!fs.existsSync(exportDir)) {
        fs.mkdirSync(exportDir, { recursive: true });
        logger.info({ exportDir }, 'Created export directory');
      }

      const filename = `QuranicStudio_Surah${row.surah}_Ayah${row.ayah_from}-${row.ayah_to}_${jobId.slice(0, 5)}.mp4`;
      const targetPath = path.join(exportDir, filename);

      logger.info({ from: row.output_path, to: targetPath }, 'Copying file to library');
      fs.copyFileSync(row.output_path, targetPath);

      return res.json({ 
        success: true, 
        message: 'Saved to library',
        filename,
        url: `/data/media/library/exports/${filename}`
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      logger.error({ error: msg }, 'Export route failed');
      return res.status(500).json({ success: false, error: msg });
    }
  });

  api.get('/download/:jobId', (req, res) => {
    try {
      const row = getStatements().getGenerationById.get(req.params.jobId) as GenerationRow | undefined;
      if (!row || !row.output_path || !fs.existsSync(row.output_path)) return res.status(404).send('Not found');
      const filePath = path.resolve(row.output_path);
      const stat = fs.statSync(filePath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const filename = `QuranicStudio_Surah${row.surah}_Ayah${row.ayah_from}-${row.ayah_to}.mp4`;
      if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${fileSize}`, 'Accept-Ranges': 'bytes', 'Content-Length': (end - start) + 1, 'Content-Type': 'video/mp4', 'Content-Disposition': `inline; filename="${filename}"` });
        fs.createReadStream(filePath, { start, end }).pipe(res);
      } else {
        res.writeHead(200, { 'Content-Length': fileSize, 'Content-Type': 'video/mp4', 'Content-Disposition': `attachment; filename="${filename}"` });
        fs.createReadStream(filePath).pipe(res);
      }
    } catch (err: unknown) {
      return res.status(500).send('Error');
    }
  });

  // API 404 Handler - MUST be after all routes
  api.all('*', (req, res) => {
    res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
  });

  app.use('/api', api);

  // Initialize DB connection and fire the background maintenance loops on boot
  logger.info('Performing startup provisions...');
  getDb();
  bootstrapQueueRecovery();
  startMaintenanceScheduler();
  updateReciterIdsLive().catch(err => logger.error({ err }, 'Failed background sync'));

  const staticOutputDir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(staticOutputDir)) fs.mkdirSync(staticOutputDir, { recursive: true });
  app.use('/output', express.static(staticOutputDir));
  app.use('/data/media', express.static(path.join(process.cwd(), 'data', 'media')));

  if (process.env.NODE_ENV !== 'production') {
    logger.info('Mounting dev-mode Vite asset server middleware');
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    logger.info('Starting production-mode static index serving loops');
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => res.sendFile(path.join(distPath, 'index.html')));
  }

  app.listen(PORT, '0.0.0.0', () => {
    logger.info(`Server bound to http://localhost:${PORT}`);
    console.log('\n==================================================');
    console.log(`🚀 Quranic Studio is running at: http://localhost:${PORT}`);
    console.log('==================================================\n');
  });
}

startServer();
