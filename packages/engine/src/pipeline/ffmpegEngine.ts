import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import ffmpegPath from 'ffmpeg-static';
import axios from 'axios';
import { logger } from '../utils/logger';
import { makeError } from '../types/errors';
import { Ayah, TimingData, MediaData } from '../types/index';
import { Payload } from '../validation/payloadSchema';

export interface FfmpegInputs {
  ayahs: Ayah[];
  timing: TimingData;
  media: MediaData;
  assFilePath: string;
  mp3FilePath: string;
  surah: number;
}

const AMBIENT_URLS: Record<string, string> = {
  rain: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg',
  waves: 'https://actions.google.com/sounds/v1/weather/sea_waves.ogg',
  wind: 'https://actions.google.com/sounds/v1/weather/cold_wind_howling.ogg',
  soft: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3'
};

async function ensureAmbientTrack(track: string): Promise<string> {
  const url = AMBIENT_URLS[track];
  if (!url) {
    throw new Error(`Unknown ambient track: ${track}`);
  }
  
  const ext = path.extname(url) || (url.includes('.ogg') ? '.ogg' : '.mp3');
  const dir = path.join(process.cwd(), 'data', 'media', 'ambient');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const localPath = path.join(dir, `${track}${ext}`);
  
  if (fs.existsSync(localPath)) {
    return localPath;
  }
  
  logger.info({ track, url, localPath }, 'Downloading ambient background track');
  const response = await axios({
    method: 'get',
    url: url,
    responseType: 'stream'
  });
  
  const writer = fs.createWriteStream(localPath);
  response.data.pipe(writer);
  
  return new Promise<string>((resolve, reject) => {
    writer.on('finish', () => resolve(localPath));
    writer.on('error', (err) => {
      fs.unlink(localPath, () => {});
      reject(err);
    });
  });
}
const FONT_URLS: Record<string, string> = {
  'Amiri': 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf',
  'Tajawal': 'https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Regular.ttf',
  'Noto Naskh Arabic': 'https://github.com/google/fonts/raw/main/ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf',
  'Lalezar': 'https://github.com/google/fonts/raw/main/ofl/lalezar/Lalezar-Regular.ttf',
  'Inter': 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'
};

async function ensureFontDownloaded(fontName: string): Promise<string | null> {
  const url = FONT_URLS[fontName];
  if (!url) {
    logger.warn({ fontName }, 'Unknown custom font name, skipping download');
    return null;
  }

  const dir = path.join(process.cwd(), 'data', 'fonts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const localPath = path.join(dir, `${fontName.replace(/\s+/g, '')}.ttf`);
  if (fs.existsSync(localPath)) {
    try {
      if (fs.statSync(localPath).size > 0) {
        return localPath;
      }
      logger.warn({ fontName, localPath }, 'Found empty (0-byte) font file. Deleting to trigger re-download.');
      fs.unlinkSync(localPath);
    } catch (e: any) {
      logger.warn({ fontName, error: e.message }, 'Failed to check or delete empty font file');
    }
  }

  logger.info({ fontName, url, localPath }, 'Downloading custom TTF font for subtitles');
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream',
      timeout: 60000
    });

    const writer = fs.createWriteStream(localPath);
    response.data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', (err) => {
        fs.unlink(localPath, () => {});
        reject(err);
      });
    });
    logger.info({ fontName }, 'Successfully downloaded font');
    return localPath;
  } catch (err: any) {
    logger.error({ fontName, error: err.message }, 'Failed to download font file');
    return null;
  }
}

export async function runFfmpeg(
  inputs: FfmpegInputs,
  payload: Payload,
  outputPath: string
): Promise<void> {
  const binary = ffmpegPath;
  if (!binary) {
    throw makeError('FFMPEG_ERROR', 'static FFmpeg binary path could not be resolved');
  }

  logger.info({ outputPath }, 'Preparing FFmpeg video render pipeline');

  const isVertical = payload.videoFormat === 'vertical';

  // FFmpeg escape subtitle path rules
  const escapedAssPath = inputs.assFilePath.replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:');    

  // Resolve selected font and ensure it is downloaded locally
  let fontFace = payload.subtitleFont ?? 'Amiri';
  if (fontFace === 'Noto Naskh') {
    fontFace = 'Noto Naskh Arabic';
  }
  try {
    await ensureFontDownloaded(fontFace);
  } catch (err: any) {
    logger.error({ font: fontFace, error: err.message }, 'Failed to download font. Continuing with system fallback.');
  }

  const fontsDir = path.join(process.cwd(), 'data', 'fonts');
  const escapedFontsDir = fontsDir.replace(/\\/g, '/').replace(/'/g, "'\\''").replace(/:/g, '\\:');

  // Resolve ambient track
  let ambientLocalPath: string | null = null;
  if (payload.audioAmbientTrack && payload.audioAmbientTrack !== 'none') {
    try {
      ambientLocalPath = await ensureAmbientTrack(payload.audioAmbientTrack);
    } catch (err: any) {
      logger.error({ track: payload.audioAmbientTrack, error: err.message }, 'Failed to download ambient track. Continuing without ambient.');
    }
  }

  // VIDEO FILTERS & EFFECTS:
  const canvasSize = isVertical ? '1080x1920' : '1920x1080';
  const scaleFilter = isVertical 
    ? 'scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920' 
    : 'scale=1920:1080:force_original_aspect_ratio=increase,crop=1920:1080';
  const waveSize = isVertical ? '1080x200' : '1920x150';

  // Resolve visual filter
  let visualFilter = '';
  switch (payload.videoFilter) {
    case 'vintage':
      visualFilter = 'curves=preset=vintage';
      break;
    case 'bnw':
      visualFilter = 'hue=s=0';
      break;
    case 'sepia':
      visualFilter = 'colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131';
      break;
    case 'blur':
      visualFilter = 'boxblur=10:5';
      break;
    case 'warm':
      visualFilter = "curves=red='0/0 0.5/0.55 1/1':blue='0/0 0.5/0.45 1/1'";
      break;
    case 'cool':
      visualFilter = "curves=blue='0/0 0.5/0.55 1/1':red='0/0 0.5/0.45 1/1'";
      break;
    case 'none':
    default:
      visualFilter = 'null';
      break;
  }
  
  // NOTE on filter chain duration control:
  // - The `color` source gets an explicit `d=` (duration) to prevent infinite frame generation
  // - `shortest=1` on the waveform overlay ensures we stop when the finite audio stream ends
  // - The image/video input is looped but will be cut by the finite color base layer
  const buildComplexFilter = (durationSec: number) => {
    const veilOpacity = payload.veilOpacity ?? 40;
    // netOpacity matches the visual blending of the web preview (70% opacity background, black veil overlay on top)
    const netOpacity = 0.70 * (1.0 - (veilOpacity / 100.0));

    let filter = `color=c=black:s=${canvasSize}:d=${durationSec.toFixed(3)}[base];` +
                 `[0:v]fps=25,${scaleFilter},${visualFilter},format=rgba,colorchannelmixer=aa=${netOpacity.toFixed(3)}[bg_opacity];` +
                 `[base][bg_opacity]overlay=format=auto[bg];`;

    const echoFilter = payload.audioEchoEnabled 
      ? `aecho=0.8:0.88:${payload.audioEchoDelay ?? 60}:${payload.audioEchoDecay ?? 0.4}` 
      : 'anull';

    if (payload.waveformEnabled) {
      // Split audio: [awav] feeds the waveform visualizer, [outa] goes to the output
      if (ambientLocalPath) {
        filter += `[1:a]${echoFilter}[rec_filtered];[2:a]volume=${payload.audioAmbientVolume ?? 0.15}[amb_scaled];[rec_filtered][amb_scaled]amix=inputs=2:duration=first:dropout_transition=0,asplit=2[awav][outa];`;
      } else {
        filter += `[1:a]${echoFilter},asplit=2[awav][outa];`;
      }

      const mode = payload.waveformMode ?? 'line';
      const color = payload.waveformColor ?? '#FFFFFF';
      const opacity = payload.waveformOpacity ?? 0.5;
      const waveColor = color.startsWith('#') ? color.replace('#', '0x') : color;

      filter += `[awav]showwaves=s=${waveSize}:mode=${mode}:colors=${waveColor}@${opacity}:r=25:draw=full[wave];[bg][wave]overlay=0:H-h:shortest=1[v1];[v1]subtitles='${escapedAssPath}':fontsdir='${escapedFontsDir}'[outv]`;
    } else {
      // No waveform — route audio directly to [outa] without splitting
      if (ambientLocalPath) {
        filter += `[1:a]${echoFilter}[rec_filtered];[2:a]volume=${payload.audioAmbientVolume ?? 0.15}[amb_scaled];[rec_filtered][amb_scaled]amix=inputs=2:duration=first:dropout_transition=0[outa];`;
      } else {
        filter += `[1:a]${echoFilter}[outa];`;
      }

      filter += `[bg]subtitles='${escapedAssPath}':fontsdir='${escapedFontsDir}'[outv]`;
    }

    return filter;
  };

  // 1. Resolve first and last segments
  const sortedAyahNumbers = inputs.ayahs.map(a => a.number).sort((a, b) => a - b);
  const firstAyahNum = sortedAyahNumbers[0];
  const lastAyahNum = sortedAyahNumbers[sortedAyahNumbers.length - 1];

  let firstSeg = inputs.timing.segments.find(s => s.ayah === firstAyahNum);
  const lastSeg = inputs.timing.segments.find(s => s.ayah === lastAyahNum);

  // SACRED PREAMBLE: Start at 0ms if Ayah 1 is selected (ensures Bismillah intro)
  let offsetMs = firstSeg ? firstSeg.startMs : 0;
  if (firstAyahNum === 1 && inputs.surah !== 1) {
    offsetMs = 0;
  }

  // CALC DURATION: End time of last verse minus our start offset
  const totalEndMs = lastSeg ? lastSeg.endMs : (firstSeg ? firstSeg.endMs : 5000);
  const durationMs = totalEndMs - offsetMs;

  const offsetSec = offsetMs / 1000.0;
  const limitSec = durationMs > 0 ? durationMs / 1000.0 : 5.0;

  logger.info({ firstAyahNum, lastAyahNum, offsetSec, limitSec }, 'Calculated FFmpeg precision range');

  // COMMAND ASSEMBLY:
  const args = [
    '-loglevel', 'verbose',
    '-y',
    // Media Input (Looping)
    ...(inputs.media.type === 'image' 
      ? ['-loop', '1', '-i', inputs.media.localPath] 
      : ['-stream_loop', '-1', '-i', inputs.media.localPath]
    ),
    // Audio Input (Seeked/Trimmed)
    // -f mp3 forces the MP3 demuxer, preventing FFmpeg from trying to decode
    // embedded MJPEG cover art which causes infinite decode error loops
    '-ss', offsetSec.toFixed(3),
    '-t', limitSec.toFixed(3),
    '-f', 'mp3',
    '-i', inputs.mp3FilePath,
    // Ambient Input (Looping if present)
    ...(ambientLocalPath
      ? ['-stream_loop', '-1', '-i', ambientLocalPath]
      : []
    ),
    // Processing
    '-filter_complex', buildComplexFilter(limitSec),
    '-map', '[outv]',
    '-map', '[outa]',
    '-c:v', 'libx264',
    '-preset', 'medium',
    '-crf', '18',
    '-c:a', 'aac',
    '-b:a', '128k',
    '-t', limitSec.toFixed(3), // Limit output duration strictly
    '-metadata', `title=Surah ${payload.surah} (${payload.ayahFrom}-${payload.ayahTo})`,
    '-metadata', 'artist=Quranic Studio',
    '-threads', '0',
    outputPath
  ];

  logger.info({ command: `ffmpeg ${args.join(' ')}` }, 'Spawning FFmpeg process');

  return new Promise<void>((resolve, reject) => {
    const proc = spawn(binary, args);

    // Watchdog timeout - 5 minutes (300,000 ms)
    const watchdog = setTimeout(() => {
      logger.error({ pid: proc.pid }, 'FFmpeg render timed out after 5 minutes. Killing process.');
      proc.kill('SIGKILL');
      reject(makeError('FFMPEG_ERROR', 'FFmpeg video rendering timed out after 5 minutes'));
    }, 300000);

    let stderr = '';
    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    // Handle spawn-level errors (e.g., binary not found, ENOENT)
    proc.on('error', (err) => {
      clearTimeout(watchdog);
      logger.error({ error: err.message }, 'Failed to spawn FFmpeg process');
      reject(makeError('FFMPEG_ERROR', `Failed to spawn FFmpeg: ${err.message}`));
    });

    proc.on('close', (code) => {
      clearTimeout(watchdog);
      if (code !== 0) {
        logger.error({ stderr, code }, 'FFmpeg process exited with error');
        return reject(makeError('FFMPEG_ERROR', `FFmpeg failed with code ${code}: ${stderr.slice(-500)}`));
      }
      logger.info({ ffmpegStderr: stderr }, 'FFmpeg compilation completed successfully');
      resolve();
    });
  });
}
