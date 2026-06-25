// FILE: packages/engine/src/cache/withCache.ts

import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import { getStatements } from '../db/database';
import { logger } from '../utils/logger';
import { CacheRow } from '../types/index';

export async function withCache<T>(opts: {
  cacheKey: string;
  type: 'quran' | 'timing' | 'media';
  ttlSeconds?: number;
  localPathKey?: keyof T;     // field to persist separately as local_path
  fetch: () => Promise<T>;
}): Promise<T> {
  const stmts = getStatements();

  // 1. Check DB cache
  const cached = stmts.getCacheEntry.get(opts.cacheKey) as CacheRow | undefined;
  if (cached) {
    try {
      const parsed = JSON.parse(cached.data) as T;
      // If type has a localPath field, check the file still exists
      if (cached.local_path && !fs.existsSync(cached.local_path)) {
        // File was cleaned up — treat as cache miss, fall through
        logger.debug({ cacheKey: opts.cacheKey }, 'local file missing, treating as cache miss');
        stmts.deleteExpiredCache.run();    // opportunistic cleanup
      } else {
        logger.debug({ cacheKey: opts.cacheKey }, 'cache hit');
        return parsed;
      }
    } catch (e) {
      logger.error({ cacheKey: opts.cacheKey, error: e }, 'failed to parse cached json, ignoring');
    }
  }

  // 2. Cache miss — fetch live
  logger.info({ cacheKey: opts.cacheKey }, 'cache miss, fetching fresh resources');
  const result = await opts.fetch();

  // 3. Write to DB cache
  const localPath = opts.localPathKey
    ? String(result[opts.localPathKey])
    : null;

  stmts.insertCacheEntry.run({
    id:          uuidv4(),
    cacheKey:    opts.cacheKey,
    type:        opts.type,
    data:        JSON.stringify(result),
    localPath,
    ttlSeconds:  opts.ttlSeconds ?? 86400,
  });

  return result;
}
