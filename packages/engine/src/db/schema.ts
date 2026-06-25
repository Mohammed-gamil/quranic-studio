// FILE: packages/engine/src/db/schema.ts

import Database from 'better-sqlite3';
import { logger } from '../utils/logger';

export function applySchema(db: Database.Database): void {
  logger.info('Applying database schema within transaction...');
  db.transaction(() => {
    // 1. generations Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS generations (
        id               TEXT PRIMARY KEY,
        surah            INTEGER NOT NULL,
        ayah_from        INTEGER NOT NULL,
        ayah_to          INTEGER NOT NULL,
        reciter_id       INTEGER NOT NULL,
        format           TEXT NOT NULL CHECK(format IN ('vertical','horizontal')),
        background_query TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','processing','done','error')),
        output_path      TEXT,
        error_msg        TEXT,
        duration_ms      INTEGER,
        file_size_bytes  INTEGER,
        created_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        updated_at       TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now'))
      )
    `).run();

    // 2. cache_entries Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS cache_entries (
        id           TEXT PRIMARY KEY,
        cache_key    TEXT NOT NULL UNIQUE,
        type         TEXT NOT NULL CHECK(type IN ('quran','timing','media')),
        data         TEXT NOT NULL,
        local_path   TEXT,
        fetched_at   TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ','now')),
        ttl_seconds  INTEGER NOT NULL DEFAULT 86400
      )
    `).run();

    // 3. reciters Table
    db.prepare(`
      CREATE TABLE IF NOT EXISTS reciters (
        id           INTEGER PRIMARY KEY,
        name_ar      TEXT NOT NULL,
        name_en      TEXT NOT NULL,
        mp3quran_id  INTEGER NOT NULL UNIQUE,
        moshaf_id    INTEGER,
        server_url   TEXT
      )
    `).run();

    try {
      db.prepare(`ALTER TABLE reciters ADD COLUMN moshaf_id INTEGER`).run();
    } catch (e) { /* ignore */ }

    try {
      db.prepare(`ALTER TABLE reciters ADD COLUMN server_url TEXT`).run();
    } catch (e) { /* ignore */ }

    // Indexes
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_status ON generations(status)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_gen_surah  ON generations(surah, ayah_from, ayah_to)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cache_key  ON cache_entries(cache_key)`).run();
    db.prepare(`CREATE INDEX IF NOT EXISTS idx_cache_type ON cache_entries(type, fetched_at)`).run();
  })();
  logger.info('Database indexes and tables created successfully.');
}
