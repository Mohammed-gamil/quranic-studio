// FILE: packages/engine/src/adapters/TimingAdapter.ts

import fs from 'fs';
import path from 'path';
import { createHttpClient } from '../utils/httpClient';
import { withCache } from '../cache/withCache';
import { makeCacheKey } from '../db/cacheKey';
import { TimingData, TimingSegment } from '../types/index';
import { logger } from '../utils/logger';
import { QuranAdapter } from './QuranAdapter';
import { getStatements } from '../db/database';

const SURAH_VERSE_COUNTS = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, // 1-10
  123, 111, 43, 52, 99, 128, 111, 110, 98, 135, // 11-20
  112, 78, 118, 64, 77, 227, 93, 88, 69, 60,   // 21-30
  34, 30, 73, 54, 45, 83, 182, 88, 75, 85,     // 31-40
  54, 53, 89, 59, 37, 35, 38, 29, 18, 45,      // 41-50
  60, 49, 62, 55, 78, 96, 29, 22, 24, 13,      // 51-60
  14, 11, 11, 18, 12, 12, 30, 52, 52, 44,      // 61-70
  28, 28, 20, 56, 40, 31, 50, 40, 46, 29,      // 71-80
  29, 19, 36, 25, 22, 17, 19, 26, 30, 20,      // 81-90
  15, 21, 11, 8, 8, 19, 5, 8, 8, 11,           // 91-100
  11, 3, 3, 3, 3, 7, 4, 5, 3, 6,               // 101-110
  3, 6, 5, 6                                   // 111-114
];

export class TimingAdapter {
  private client = createHttpClient();
  private quranAdapter = new QuranAdapter();

  // Mappings of the 10 core reciter IDs to their mp3quran.net servers
  private static RECITER_SERVERS: Record<number, string> = {
    1: 'https://server7.mp3quran.net/basit/',
    2: 'https://server13.mp3quran.net/husr/',
    3: 'https://server8.mp3quran.net/afs/',
    4: 'https://server11.mp3quran.net/sds/',
    5: 'https://server7.mp3quran.net/s_gmd/',
    6: 'https://server11.mp3quran.net/yasser/',
    7: 'https://server7.mp3quran.net/shur/',
    8: 'https://server13.mp3quran.net/jhn/',
    9: 'https://server8.mp3quran.net/lhdan/',
    10: 'https://server11.mp3quran.net/qtm/'
  };

  public async fetchTimings(surah: number, reciterId: number): Promise<TimingData> {
    const cacheKey = makeCacheKey('timing', { surah, reciterId, version: 'v7_official' });
    return withCache<TimingData>({
      cacheKey,
      type: 'timing',
      ttlSeconds: Number(process.env.CACHE_TTL_TIMING ?? 604800), // 7 days
      localPathKey: 'mp3LocalPath',
      fetch: () => this._fetchFromApi(surah, reciterId)
    });
  }

  private async _fetchFromApi(surah: number, reciterId: number): Promise<TimingData> {
    logger.info({ surah, reciterId }, 'Downloading and preparing Quran recitation timings');
    
    // 1. Resolve URL and identifiers dynamically from DB
    let baseUrl = TimingAdapter.RECITER_SERVERS[reciterId];
    let moshafId: number | null = null;
    try {
      const rec = getStatements().getReciterById.get(reciterId) as any;
      if (rec) {
        if (rec.server_url) baseUrl = rec.server_url;
        if (rec.moshaf_id) moshafId = rec.moshaf_id;
      }
    } catch (e: any) {
      logger.warn({ reciterId }, 'Could not read reciter from database statement, using local fallback URL map.');
    }
    if (!baseUrl) {
      baseUrl = TimingAdapter.RECITER_SERVERS[7];
    }

    const paddedSurah = String(surah).padStart(3, '0');
    let mp3Url = `${baseUrl}${paddedSurah}.mp3`;

    // 2. Attempt to fetch real timings from API v3 (Official ayat_timing)
    let segments: TimingSegment[] = [];
    if (moshafId) {
      try {
        logger.info({ surah, moshafId }, 'Fetching official verse timings from MP3Quran API');
        const timingRes = await this.client.get('https://mp3quran.net/api/v3/ayat_timing', {
          params: { surah, read: moshafId }
        });
        
        const apiSegments = timingRes.data as any[];

        if (apiSegments && Array.isArray(apiSegments)) {
          // Sort segments by start time
          const sortedApiSegs = apiSegments
            .map(s => ({
              startMs: Number(s.start_time),
              endMs: Number(s.end_time),
              rawAyah: Number(s.ayah)
            }))
            .sort((a, b) => a.startMs - b.startMs);

          // Universal API Mapping Rule:
          // The MP3Quran API returns segments with a raw `ayah` number.
          // Let's map them to the 1-indexed relative verse number in the Uthmani Quran.
          const hasZeroAyah = sortedApiSegs.some(s => s.rawAyah === 0);

          const mappedSegs = sortedApiSegs.map(s => {
            let ayahNum = s.rawAyah;
            if (surah === 1) {
              // For Surah 1: Bismillah is Verse 1.
              if (hasZeroAyah) {
                // If API starts with rawAyah 0, then 0 corresponds to Verse 1,
                // 1 to 5 correspond to Verses 2 to 6, and 6+ corresponds to Verse 7.
                if (s.rawAyah === 0) {
                  ayahNum = 1;
                } else if (s.rawAyah >= 1 && s.rawAyah <= 5) {
                  ayahNum = s.rawAyah + 1;
                } else if (s.rawAyah >= 6) {
                  ayahNum = 7;
                }
              } else {
                // If API does not have rawAyah 0, then rawAyah is already the relative verse number (1 to 7).
                // Let's ensure any extra/split segments (e.g. 7, 8+) are capped/grouped into Verse 7.
                ayahNum = Math.min(s.rawAyah, 7);
              }
            } else {
              // For other Surahs, rawAyah is already the correct relative verse number,
              // and rawAyah === 0 represents the preamble.
              ayahNum = s.rawAyah;
            }
            return {
              ayah: ayahNum,
              startMs: s.startMs,
              endMs: s.endMs
            };
          });

          // Group by ayah number and merge timings (min startMs, max endMs)
          // This elegantly handles any split verses (e.g. Verse 7 in Surah 1)
          const merged: Record<number, TimingSegment> = {};
          for (const s of mappedSegs) {
            if (merged[s.ayah] === undefined) {
              merged[s.ayah] = { ...s };
            } else {
              merged[s.ayah].startMs = Math.min(merged[s.ayah].startMs, s.startMs);
              merged[s.ayah].endMs = Math.max(merged[s.ayah].endMs, s.endMs);
            }
          }
          
          segments = Object.values(merged).sort((a, b) => a.ayah - b.ayah);
          logger.info({ count: segments.length, surah }, 'Successfully retrieved and normalized official timings');
        }
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Official timing API unavailable, falling back to heuristic');
      }
    }

    // Ensure audio data directory exists
    const audioDir = path.join(process.cwd(), 'data', 'media', 'audio');
    const mp3LocalPath = path.join(audioDir, `reciter_${reciterId}_surah_${paddedSurah}.mp3`);

    // 4. Heuristic Fallback: Estimate timings using verse length proportional weights if API segments missing
    if (segments.length === 0) {
      logger.info('Calculating heuristic character-weight timings');
      
      let durationMs = 300000; // 5 min default fallback
      try {
        const headRes = await this.client.head(mp3Url, { timeout: 10000 });
        const contentLength = Number(headRes.headers['content-length'] ?? 0);
        if (contentLength > 0) {
          const estDurationSec = contentLength / 16000;
          durationMs = Math.round(estDurationSec * 1000);
        }
      } catch (err: any) {
        logger.warn({ error: err.message }, 'Failed to fetch content-length for duration estimation, using default 5 mins');
      }

      const maxVerses = SURAH_VERSE_COUNTS[surah - 1] || 286;
      const quranData = await this.quranAdapter.fetchAyahs(surah, 1, maxVerses);
      const ayahsInSurah = quranData.ayahs;
      const totalCharsInSurah = ayahsInSurah.reduce((sum, a) => sum + (a.text?.length ?? 0), 0) || 1;

      let elapsedMs = 0;
      for (let i = 0; i < ayahsInSurah.length; i++) {
        const ayah = ayahsInSurah[i];
        const weight = (ayah.text?.length ?? 0) / totalCharsInSurah;
        const verseDuration = Math.round(durationMs * weight);
        const startMs = elapsedMs;
        const endMs = (i === ayahsInSurah.length - 1) ? durationMs : elapsedMs + verseDuration;

        segments.push({ ayah: ayah.number, startMs, endMs });
        elapsedMs = endMs;
      }
    }

    return {
      mp3Url,
      mp3LocalPath,
      segments
    };
  }

  public async ensureReciterAudioDownloaded(surah: number, reciterId: number): Promise<string> {
    let baseUrl = TimingAdapter.RECITER_SERVERS[reciterId];
    try {
      const rec = getStatements().getReciterById.get(reciterId) as any;
      if (rec && rec.server_url) baseUrl = rec.server_url;
    } catch (e) {}
    if (!baseUrl) baseUrl = TimingAdapter.RECITER_SERVERS[7];

    const paddedSurah = String(surah).padStart(3, '0');
    const mp3Url = `${baseUrl}${paddedSurah}.mp3`;

    const audioDir = path.join(process.cwd(), 'data', 'media', 'audio');
    fs.mkdirSync(audioDir, { recursive: true });
    const mp3LocalPath = path.join(audioDir, `reciter_${reciterId}_surah_${paddedSurah}.mp3`);

    if (fs.existsSync(mp3LocalPath)) {
      logger.info({ mp3LocalPath }, 'Reciter MP3 file already exists, skipping download');
      return mp3LocalPath;
    }

    logger.info({ mp3Url, mp3LocalPath }, 'Downloading reciter MP3 file for video generation');
    const writer = fs.createWriteStream(mp3LocalPath);
    const response = await this.client.get(mp3Url, { responseType: 'stream', timeout: 600000 });
    (response.data as any).pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        fs.unlink(mp3LocalPath, () => {});
        reject(err);
      });
      response.data.on('error', (err: any) => {
        fs.unlink(mp3LocalPath, () => {});
        reject(err);
      });
    });

    return mp3LocalPath;
  }
}
