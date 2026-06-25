// FILE: packages/engine/src/adapters/MediaAdapter.ts

import fs from 'fs';
import path from 'path';
import { createHttpClient } from '../utils/httpClient';
import { withCache } from '../cache/withCache';
import { makeCacheKey } from '../db/cacheKey';
import { MediaData } from '../types/index';
import { logger } from '../utils/logger';

export class MediaAdapter {
  private client = createHttpClient();

  public async fetchBackgroundVideo(query: string, format: 'vertical' | 'horizontal'): Promise<MediaData> {
    const cacheKey = makeCacheKey('media', { query, format, version: 'v3_png_strict' });
    return withCache<MediaData>({
      cacheKey,
      type: 'media',
      ttlSeconds: Number(process.env.CACHE_TTL_MEDIA ?? 3600), // 1 hour
      localPathKey: 'localPath',
      fetch: () => this._fetchFromApi(query, format)
    });
  }

  public async getBackgroundVideo(query: string, format: 'vertical' | 'horizontal'): Promise<string> {
    const media = await this.fetchBackgroundVideo(query, format);
    return this.toPublicMediaUrl(media);
  }

  private toPublicMediaUrl(media: MediaData): string {
    if (media.url?.startsWith('http')) return media.url;
    if (media.url?.startsWith('/data/media/')) return media.url;
    if (media.localPath) return this.toMediaUrl(media.localPath) || media.url || '';
    if (media.url?.startsWith('/')) return media.url;
    return media.url || '';
  }

  private toMediaUrl(localPath: string): string | null {
    const mediaRoot = path.join(process.cwd(), 'data', 'media');
    const relative = path.relative(mediaRoot, localPath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) return null;
    return `/data/media/${relative.replace(/\\/g, '/')}`;
  }

  private async _fetchFromApi(query: string, format: 'vertical' | 'horizontal'): Promise<MediaData> {
    logger.info({ query, format }, 'Searching for background media');
    
    // 1. Check if the query is a direct local path (e.g. from an upload or library selection)
    if (query.startsWith('/') || query.includes('\\') || query.includes('data/media')) {
      const absolutePath = path.isAbsolute(query) ? query : path.resolve(process.cwd(), query.startsWith('/') ? query.slice(1) : query);
      
      if (fs.existsSync(absolutePath)) {
        logger.info({ absolutePath }, 'Using direct local media path');
        const isVideo = absolutePath.match(/\.(mp4|mov)$/i);
        return {
          url: query,
          localPath: absolutePath,
          type: isVideo ? 'video' : 'image'
        };
      }
    }

    let mediaUrl: string | null = null;
    let type: 'video' | 'image' = 'video';

    const pexelsKey = process.env.PEXELS_API_KEY;
    const pixabayKey = process.env.PIXABAY_API_KEY;

    try {
      if (pexelsKey) {
        logger.info('Using Pexels Video Search API');
        const pexelsRes = await this.client.get('https://api.pexels.com/videos/search', {
          headers: { Authorization: pexelsKey },
          params: {
            query,
            orientation: format === 'vertical' ? 'portrait' : 'landscape',
            per_page: 5,
            size: 'medium'
          }
        });

        const videos = pexelsRes.data?.videos;
        if (videos && videos.length > 0) {
          // Find the best MP4 file (usually 720p or 1080p is perfect for web processing)
          const videoFiles = videos[0].video_files as any[];
          const mp4File = videoFiles.find(f => f.file_type === 'video/mp4' && f.width && f.width >= 720) ?? videoFiles[0];
          if (mp4File) {
            mediaUrl = mp4File.link;
            type = 'video';
          }
        }
      } else if (pixabayKey) {
        logger.info('Using Pixabay Video Search API');
        const pixabayRes = await this.client.get('https://pixabay.com/api/videos/', {
          params: {
            key: pixabayKey,
            q: query,
            per_page: 5
          }
        });

        const hits = pixabayRes.data?.hits;
        if (hits && hits.length > 0) {
          // Select high/medium size video
          const videos = hits[0].videos;
          const videoFile = videos?.medium ?? videos?.small ?? videos?.large;
          if (videoFile?.url) {
            mediaUrl = videoFile.url;
            type = 'video';
          }
        }
      }
    } catch (apiError: any) {
      logger.error({ error: apiError.message }, 'Background Search API failed; falling back to dynamic libraries');
    }

    // Default Cinematic visuals guaranteed to load nicely without requiring third-party API keys upfront
    if (!mediaUrl) {
      logger.info('Using categorized public domain visual fallbacks');
      const q = query.toLowerCase();

      // Categorized high-quality loopable visuals
      if (q.includes('star') || q.includes('sky') || q.includes('night') || q.includes('galaxy')) {
        mediaUrl = 'https://images.unsplash.com/photo-1506318137071-a8e063b4bec0?fit=crop&w=1920&q=80&fm=png';
      } else if (q.includes('forest') || q.includes('tree') || q.includes('nature') || q.includes('green')) {
        mediaUrl = 'https://images.unsplash.com/photo-1511497584788-876760111969?fit=crop&w=1920&q=80&fm=png';
      } else if (q.includes('mountain') || q.includes('hill') || q.includes('rock') || q.includes('snow')) {
        mediaUrl = 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?fit=crop&w=1920&q=80&fm=png';
      } else if (q.includes('ocean') || q.includes('sea') || q.includes('water') || q.includes('beach')) {
        mediaUrl = 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?fit=crop&w=1920&q=80&fm=png';
      } else if (q.includes('sun') || q.includes('light') || q.includes('bright') || q.includes('gold')) {
        mediaUrl = 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?fit=crop&w=1920&q=80&fm=png';
      } else if (q.includes('prayer') || q.includes('mosque') || q.includes('peace') || q.includes('silent')) {
        mediaUrl = 'https://images.unsplash.com/photo-1542838132-92c53300491e?fit=crop&w=1920&q=80&fm=png';
      } else {
        // Universal cinematic default (Space/Earth)
        mediaUrl = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?fit=crop&w=1920&q=80&fm=png';
      }
      type = 'image';
    }

    // Prepare local storage path
    const backgroundDir = path.join(process.cwd(), 'data', 'media', 'backgrounds');
    fs.mkdirSync(backgroundDir, { recursive: true });

    let localPath = '';

    // Download file using Axios streaming to prevent large visual files from inflating heap memory
    try {
      logger.info({ mediaUrl }, 'Starting download of background file');
      const response = await this.client.get(mediaUrl, { responseType: 'stream', timeout: 600000 });
      
      const contentType = String(response.headers['content-type'] || '');
      let fileExt = type === 'video' ? 'mp4' : 'jpg';
      if (contentType.includes('image/png')) {
        fileExt = 'png';
      } else if (contentType.includes('image/webp')) {
        fileExt = 'webp';
      } else if (contentType.includes('image/jpeg')) {
        fileExt = 'jpg';
      } else if (contentType.includes('video/mp4')) {
        fileExt = 'mp4';
      } else if (contentType.includes('video/quicktime')) {
        fileExt = 'mov';
      }

      localPath = path.join(backgroundDir, `bg_${format}_${Date.now()}.${fileExt}`);
      logger.info({ mediaUrl, localPath, contentType }, 'Downloading selected background file');

      const writer = fs.createWriteStream(localPath);
      (response.data as any).pipe(writer);
      
      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', (err) => {
          fs.unlink(localPath, () => {});
          reject(err);
        });
        response.data.on('error', (err: any) => {
          fs.unlink(localPath, () => {});
          reject(err);
        });
      });
    } catch (downloadErr: any) {
      logger.error({ error: downloadErr.message, url: mediaUrl }, 'Failed to download background media. Generating high-quality fallback image.');
      const fallbackLocalPath = path.join(backgroundDir, `bg_${format}_${Date.now()}_fallback.png`);
      
      // Fetch a reliable cinematic landscape from Unsplash as the ultimate zero-cost fallback in PNG format
      try {
        const writer = fs.createWriteStream(fallbackLocalPath);
        const fallbackRes = await this.client.get('https://images.unsplash.com/photo-1501854140801-50d01698950b?fit=crop&w=1920&q=80&fm=png', { responseType: 'stream', timeout: 600000 });
        (fallbackRes.data as any).pipe(writer);
        
        await new Promise<void>((resolve, reject) => {
          writer.on('finish', resolve);
          writer.on('error', (err) => {
            fs.unlink(fallbackLocalPath, () => {});
            reject(err);
          });
          fallbackRes.data.on('error', (err: any) => {
            fs.unlink(fallbackLocalPath, () => {});
            reject(err);
          });
        });
      } catch (e) {
        // Absolute last resort: Tiny black PNG pixel (if internet is completely down)
        const blackPngPixel = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk4AIAAgEADa7h31sAAAAASUVORK5CYII=';
        fs.writeFileSync(fallbackLocalPath, Buffer.from(blackPngPixel, 'base64'));
      }

      return {
        url: mediaUrl,
        localPath: fallbackLocalPath,
        type: 'image'
      };
    }

    return {
      url: mediaUrl,
      localPath,
      type
    };
  }
}

export const GeneralMediaAdapter = MediaAdapter;
