import { Router } from 'express';
import { GeneralMediaAdapter, getStatements } from '../packages/engine/src/index';
import { logger } from '../packages/engine/src/utils/logger';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';

export const mediaRouter = Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'data', 'media', 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['video/mp4', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only MP4, MOV, JPEG, PNG, and WEBP are allowed.'));
    }
  }
});

mediaRouter.post('/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    const fileUrl = `/data/media/uploads/${req.file.filename}`;
    return res.json({
      success: true,
      fileUrl,
      filePath: req.file.path,
      type: req.file.mimetype.startsWith('video') ? 'video' : 'image'
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'POST /api/upload failed');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

mediaRouter.get('/library', (req, res) => {
  try {
    const libraryDir = path.join(process.cwd(), 'data', 'media', 'library');
    const uploadsDir = path.join(process.cwd(), 'data', 'media', 'uploads');

    const getFiles = (dir: string, category: string) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir, { withFileTypes: true })
        .filter(f => f.isFile())
        .map(f => ({
          name: f.name,
          url: `/data/media/${category}/${f.name}`,
          type: f.name.match(/\.(mp4|mov)$/i) ? 'video' : 'image'
        }));
    };

    const library = {
      videos: getFiles(path.join(libraryDir, 'videos'), 'library/videos'),
      images: getFiles(path.join(libraryDir, 'images'), 'library/images'),
      uploads: getFiles(uploadsDir, 'uploads')
    };

    return res.json({ success: true, data: library });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/library failed');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

mediaRouter.get('/videos', async (req, res) => {
  try {
    const query = req.query.query ? String(req.query.query) : 'starry sky';
    const format = req.query.format === 'horizontal' ? 'horizontal' : 'vertical';
    const mediaAdapter = new GeneralMediaAdapter();
    const videoLink = await mediaAdapter.getBackgroundVideo(query, format);
    return res.json({
      success: true,
      videoUrl: videoLink
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/videos failed');
    return res.status(500).json({
      success: false,
      error: { code: 'MEDIA_ERROR', message: errorMessage }
    });
  }
});

export const reciterRouter = Router();

reciterRouter.get('/', (req, res) => {
  try {
    const reciters = getStatements().getAllReciters.all();
    return res.json({
      success: true,
      data: reciters
    });
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'GET /api/reciters failed');
    return res.status(500).json({
      success: false,
      error: { code: 'DB_ERROR', message: errorMessage }
    });
  }
});
