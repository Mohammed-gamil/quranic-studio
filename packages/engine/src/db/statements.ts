// FILE: packages/engine/src/db/statements.ts

import Database from 'better-sqlite3';

export function getStatements(db: Database.Database) {
  return {
    insertGeneration: db.prepare(`
      INSERT INTO generations
        (id, surah, ayah_from, ayah_to, reciter_id, format,
         background_query, status, created_at, updated_at)
      VALUES
        (@id, @surah, @ayahFrom, @ayahTo, @reciterId, @format,
         @backgroundQuery, 'queued',
         strftime('%Y-%m-%dT%H:%M:%SZ','now'),
         strftime('%Y-%m-%dT%H:%M:%SZ','now'))
    `),

    updateGenerationStatus: db.prepare(`
      UPDATE generations
      SET status = @status,
          output_path = @outputPath,
          error_msg = @errorMsg,
          duration_ms = @durationMs,
          file_size_bytes = @fileSizeBytes,
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
      WHERE id = @id
    `),

    getGenerationById: db.prepare(`
      SELECT * FROM generations WHERE id = ?
    `),

    listRecentGenerations: db.prepare(`
      SELECT * FROM generations
      ORDER BY created_at DESC
      LIMIT ?
    `),

    getCacheEntry: db.prepare(`
      SELECT * FROM cache_entries
      WHERE cache_key = ?
        AND (
          CAST((julianday('now') - julianday(fetched_at)) * 86400 AS INTEGER)
          < ttl_seconds
        )
    `),

    insertCacheEntry: db.prepare(`
      INSERT OR REPLACE INTO cache_entries
        (id, cache_key, type, data, local_path, fetched_at, ttl_seconds)
      VALUES
        (@id, @cacheKey, @type, @data, @localPath,
         strftime('%Y-%m-%dT%H:%M:%SZ','now'), @ttlSeconds)
    `),

    deleteExpiredCache: db.prepare(`
      DELETE FROM cache_entries
      WHERE CAST((julianday('now') - julianday(fetched_at)) * 86400 AS INTEGER)
            >= ttl_seconds
    `),

    getAllReciters: db.prepare(`SELECT * FROM reciters ORDER BY name_en`),
    getReciterById: db.prepare(`SELECT * FROM reciters WHERE id = ?`)
  };
}
