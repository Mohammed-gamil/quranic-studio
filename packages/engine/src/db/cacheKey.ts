// FILE: packages/engine/src/db/cacheKey.ts

import { createHash } from 'crypto';

export function makeCacheKey(
  type: 'quran' | 'timing' | 'media',
  params: Record<string, string | number>
): string {
  const sorted = Object.keys(params).sort()
    .map(k => `${k}:${params[k]}`)
    .join('|');
  return `${type}::${createHash('sha256').update(sorted).digest('hex').slice(0,16)}`;
}
