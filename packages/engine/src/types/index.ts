// FILE: packages/engine/src/types/index.ts

import { Payload } from '../validation/payloadSchema';

export interface PipelineResult {
  outputPath: string;
  durationMs: number;
  format: 'vertical' | 'horizontal';
  surah: number;
  ayahFrom: number;
  ayahTo: number;
}

export interface CacheRow {
  id: string;
  cache_key: string;
  type: 'quran' | 'timing' | 'media';
  data: string;
  local_path: string | null;
  fetched_at: string;
  ttl_seconds: number;
}

export interface GenerationRow {
  id: string;
  surah: number;
  ayah_from: number;
  ayah_to: number;
  reciter_id: number;
  format: 'vertical' | 'horizontal';
  background_query: string;
  status: 'queued' | 'processing' | 'done' | 'error';
  output_path: string | null;
  error_msg: string | null;
  duration_ms: number | null;
  file_size_bytes: number | null;
  created_at: string;
  updated_at: string;
}

export interface ReciterRow {
  id: number;
  name_ar: string;
  name_en: string;
  mp3quran_id: number;
  moshaf_id: number;
  server_url: string;
}

// Quran structures
export interface Ayah {
  number: number;      // absolute Quran-wide or relative within Surah
  text: string;        // Arabic text
  translation: string; // English translation
  surahNumber: number;
}

export interface QuranData {
  surah: number;
  ayahs: Ayah[];
}

// Audio timings
export interface TimingSegment {
  ayah: number; // relative number inside surah
  startMs: number;
  endMs: number;
}

export interface TimingData {
  mp3Url: string;
  mp3LocalPath: string; // timingAdapter downloads MP3 here
  segments: TimingSegment[];
}

// Background media
export interface MediaData {
  url: string;
  localPath: string; // mediaAdapter downloads video/image here
  type: 'video' | 'image';
}
