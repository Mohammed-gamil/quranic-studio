import { Router } from 'express';
import { QuranAdapter } from '../packages/engine/src/adapters/QuranAdapter';
import { TimingAdapter } from '../packages/engine/src/adapters/TimingAdapter';
import axios from 'axios';
import { logger } from '../packages/engine/src/utils/logger';

export const quranRouter = Router();
const quranAdapter = new QuranAdapter();
const timingAdapter = new TimingAdapter();

quranRouter.get('/chapters', async (req, res) => {
  try {
    const response = await axios.get('https://api.quran.com/api/v4/chapters?language=ar');
    return res.json(response.data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'Failed to fetch chapters');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

quranRouter.get('/verses/uthmani', async (req, res) => {
  try {
    const { chapter_number } = req.query;
    if (!chapter_number) return res.status(400).json({ error: 'chapter_number is required' });
    const response = await axios.get(`https://api.quran.com/api/v4/quran/verses/uthmani?chapter_number=${chapter_number}`);
    return res.json(response.data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'Failed to fetch verses');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

quranRouter.get('/translations/20', async (req, res) => {
  try {
    const { chapter_number } = req.query;
    if (!chapter_number) return res.status(400).json({ error: 'chapter_number is required' });
    const response = await axios.get(`https://api.quran.com/api/v4/quran/translations/20?chapter_number=${chapter_number}`);
    return res.json(response.data);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'Failed to fetch translations');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});

quranRouter.get('/sync', async (req, res) => {
  try {
    const surah = Number(req.query.surah);
    const reciterId = Number(req.query.reciterId);
    const from = Number(req.query.from) || 1;
    const to = Number(req.query.to) || 286;
    
    if (!surah || !reciterId) return res.status(400).json({ error: 'surah and reciterId are required' });

    // Fetch both datasets concurrently
    const [quranData, timingData] = await Promise.all([
      quranAdapter.fetchAyahs(surah, from, to),
      timingAdapter.fetchTimings(surah, reciterId)
    ]);

    // Zip them together
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
        verses: syncedVerses
      }
    });

  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    logger.error({ error: errorMessage }, 'Failed to fetch unified sync data');
    return res.status(500).json({ success: false, error: errorMessage });
  }
});
