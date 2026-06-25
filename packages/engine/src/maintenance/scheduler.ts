// FILE: packages/engine/src/maintenance/scheduler.ts

import fs from 'fs';
import path from 'path';
import { getDb, getStatements } from '../db/database';
import { getOutputDir } from '../utils/fileManager';
import { logger } from '../utils/logger';

export function runMaintenance(): void {
  logger.info('Starting system maintenance routines...');
  const db = getDb();
  const stmts = getStatements();

  // Task 1 — Purge expired DB cache rows
  try {
    const res = stmts.deleteExpiredCache.run();
    logger.info({ purgedCacheRowsCount: res.changes }, 'Purged expired database cache rows');
  } catch (err) {
    logger.error({ error: err }, 'Maintenance Task 1 (cache purge) failed');
  }

  // Task 2 — Orphan file cleanup (unreferenced output files)
  try {
    const outputDir = getOutputDir();
    if (fs.existsSync(outputDir)) {
      const actualFiles = fs.readdirSync(outputDir).map(file => path.join(outputDir, file));
      
      // Select all referenced files in generations
      const rows = db.prepare(`SELECT output_path FROM generations WHERE status = 'done' AND output_path IS NOT NULL`).all() as { output_path: string }[];
      const referencedFiles = new Set(rows.map(r => path.resolve(r.output_path)));

      let deletedCount = 0;
      for (const file of actualFiles) {
        const resolvedPath = path.resolve(file);
        // Only delete file if it ends with .mp4 and is not listed in DB
        if (file.endsWith('.mp4') && !referencedFiles.has(resolvedPath)) {
          try {
            fs.unlinkSync(file);
            deletedCount++;
          } catch (unlinkErr) {
            logger.warn({ file, error: unlinkErr }, 'Failed to delete orphan file');
          }
        }
      }
      logger.info({ deletedOrphansCount: deletedCount }, 'Orphan output video files deleted');
    }
  } catch (err) {
    logger.error({ error: err }, 'Maintenance Task 2 (orphan cleanup) failed');
  }

  // Task 3 — Clean up stale processing jobs (>30 minutes)
  try {
    const staleTimeThresholdMinutes = 30;
    // Calculate stale threshold using julian day difference in minutes (1 day = 1440 minutes)
    const res = db.prepare(`
      UPDATE generations
      SET status = 'error',
          error_msg = 'Timed out — process may have crashed',
          updated_at = strftime('%Y-%m-%dT%H:%M:%SZ','now')
      WHERE status = 'processing'
        AND CAST((julianday('now') - julianday(updated_at)) * 1440 AS INTEGER) > ?
    `).run(staleTimeThresholdMinutes);
    logger.info({ markedErrorJobsCount: res.changes }, 'Marked stale processing tasks as timed out');
  } catch (err) {
    logger.error({ error: err }, 'Maintenance Task 3 (stale task reset) failed');
  }

  // Task 4 — Clean up old records (>7 days)
  try {
    // Select candidates older than 7 days
    const rows = db.prepare(`
      SELECT id, output_path FROM generations
      WHERE status IN ('done', 'error')
        AND created_at < datetime('now', '-7 days')
    `).all() as { id: string, output_path: string | null }[];

    let deletedFiles = 0;
    let deletedRows = 0;

    const deleteStmt = db.prepare(`DELETE FROM generations WHERE id = ?`);

    db.transaction(() => {
      for (const row of rows) {
        if (row.output_path && fs.existsSync(row.output_path)) {
          try {
            fs.unlinkSync(row.output_path);
            deletedFiles++;
          } catch (fileErr) {
            logger.warn({ path: row.output_path, error: fileErr }, 'Failed to delete historical production file');
          }
        }
        deleteStmt.run(row.id);
        deletedRows++;
      }
    })();

    logger.info({ deletedFiles, deletedRows }, 'Purged historical generations and outputs older than 7 days');
  } catch (err) {
    logger.error({ error: err }, 'Maintenance Task 4 (historical archive purge) failed');
  }

  logger.info('System maintenance completed successfully');
}

export function startMaintenanceScheduler(): void {
  logger.info('Starting scheduled maintenance background loop...');
  // Delay initial run by 5 seconds to avoid race conditions with DB seeding and queue init
  setTimeout(() => {
    try {
      runMaintenance();
    } catch (e) {
      logger.error({ error: e }, 'Deferred initial maintenance run failed');
    }
  }, 5000);
  // Run every 6 hours
  const SIX_HOURS_MS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    try {
      runMaintenance();
    } catch (e) {
      logger.error({ error: e }, 'Scheduled execution of system maintenance failed');
    }
  }, SIX_HOURS_MS);
}
