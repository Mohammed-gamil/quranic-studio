// FILE: packages/engine/src/db/database.ts

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { applySchema } from './schema';
import { getStatements as _getStatements } from './statements';
import { logger } from '../utils/logger';

let _db: Database.Database | null = null;
let _stmts: ReturnType<typeof _getStatements> | null = null;

const dbPath = process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'wazakkir.db');

export function getDb(): Database.Database {
  if (!_db) {
    logger.info({ dbPath }, 'Initializing SQLite connection');
    const dir = path.dirname(dbPath);
    fs.mkdirSync(dir, { recursive: true });

    _db = new Database(dbPath);
    _db.pragma('journal_mode = WAL');   // concurrent reads + writes
    _db.pragma('foreign_keys = ON');
    _db.pragma('synchronous = NORMAL'); // safe + faster than FULL

    applySchema(_db);
    seedReciters(_db);                  // idempotent INSERT OR IGNORE
  }
  return _db;
}

export function getStatements() {
  if (!_stmts) {
    _stmts = _getStatements(getDb());
  }
  return _stmts;
}

function seedReciters(db: Database.Database): void {
  // Verified MP3Quran v3 Murattal (Standard) Read IDs for highest precision synchronization
  const reciters = [
    { id: 1, name_ar: 'عبد الباسط عبد الصمد',  name_en: 'Abdul Basit',       mp3quran_id: 54,  moshaf_id: 53,  server_url: 'https://server7.mp3quran.net/basit/' },
    { id: 2, name_ar: 'محمود خليل الحصري',      name_en: 'Mahmoud Al-Husary', mp3quran_id: 85,  moshaf_id: 118, server_url: 'https://server13.mp3quran.net/husr/' },
    { id: 3, name_ar: 'مشاري راشد العفاسي',     name_en: 'Mishary Alafasy',   mp3quran_id: 91,  moshaf_id: 123, server_url: 'https://server8.mp3quran.net/afs/' },
    { id: 4, name_ar: 'عبد الرحمن السديس',      name_en: 'Abdurrahman Al-Sudais', mp3quran_id: 57, moshaf_id: 122, server_url: 'https://server11.mp3quran.net/sds/' },
    { id: 5, name_ar: 'سعد الغامدي',            name_en: 'Saad Al-Ghamdi',    mp3quran_id: 63,  moshaf_id: 135, server_url: 'https://server7.mp3quran.net/s_gmd/' },
    { id: 6, name_ar: 'ياسر الدوسري',           name_en: 'Yasser Al-Dosari',  mp3quran_id: 104, moshaf_id: 211, server_url: 'https://server11.mp3quran.net/yasser/' },
    { id: 7, name_ar: 'سعود الشريم',            name_en: 'Saoud Ash-Shoureim',mp3quran_id: 65,  moshaf_id: 138, server_url: 'https://server7.mp3quran.net/shur/' },
    { id: 8, name_ar: 'عبد الله الجهني',        name_en: 'Abdullah Al-Juhany',mp3quran_id: 71,  moshaf_id: 148, server_url: 'https://server13.mp3quran.net/jhn/' },
    { id: 9, name_ar: 'محمد اللحيدان',          name_en: 'Mohammad Al-Luhaidan',mp3quran_id: 93, moshaf_id: 187, server_url: 'https://server8.mp3quran.net/lhdan/' },
    { id: 10, name_ar: 'ناصر القطامي',           name_en: 'Nasser Al-Qatami',  mp3quran_id: 101, moshaf_id: 206, server_url: 'https://server11.mp3quran.net/qtm/' }
  ];

  logger.info('Seeding database reciters with official Murattal API v3 IDs...');
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO reciters (id, name_ar, name_en, mp3quran_id, moshaf_id, server_url)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  db.transaction(() => {
    for (const r of reciters) {
      stmt.run(r.id, r.name_ar, r.name_en, r.mp3quran_id, r.moshaf_id, r.server_url);
    }
  })();
}

export async function updateReciterIdsLive(): Promise<void> {
  logger.info('[ReciterUpdate] Syncing against MP3Quran v3 Timing IDs...');
  try {
    // 1. Fetch the official list of reads enabled for timing
    const timingReadsRes = await axios.get('https://www.mp3quran.net/api/v3/ayat_timing/reads', {
      timeout: 10000
    });
    const timingList = timingReadsRes.data;

    if (!timingList || !Array.isArray(timingList)) {
      logger.warn('[ReciterUpdate] Could not fetch official timing reads list.');
      return;
    }

    const db = getDb();
    const updateStmt = db.prepare('UPDATE reciters SET moshaf_id = ?, server_url = ? WHERE id = ?');

    // We match by folder_url/server_url to ensure we pair the exact audio stream with its timing ID
    const reciterMap = [
      { id: 1, folder: 'basit/' },
      { id: 2, folder: 'husr/' },
      { id: 3, folder: 'afs/' },
      { id: 4, folder: 'sds/' },
      { id: 5, folder: 's_gmd/' },
      { id: 6, folder: 'yasser/' },
      { id: 7, folder: 'shur/' },
      { id: 8, folder: 'jhn/' },
      { id: 9, folder: 'lhdan/' },
      { id: 10, folder: 'qtm/' }
    ];

    db.transaction(() => {
      for (const target of reciterMap) {
        // Strict matching: folder must end with the target name, or be the exact name
        // This avoids matching "basit/Almusshaf-Al-Mojawwad/" when we want "basit/"
        const match = timingList.find((r: any) => {
          if (!r.folder_url) return false;
          const url = r.folder_url.toLowerCase();
          return url.endsWith(`/${target.folder}`) || url.endsWith(`/${target.folder.slice(0, -1)}`);
        });
        
        if (match && match.id) {
          logger.info({ id: target.id, timing_id: match.id, url: match.folder_url }, '[ReciterUpdate] Synchronized timing-enabled mushaf');
          updateStmt.run(Number(match.id), match.folder_url, target.id);
        }
      }
    })();

    logger.info('[ReciterUpdate] Timing IDs synchronized successfully.');
  } catch (err: any) {
    logger.error({ error: err.message }, '[ReciterUpdate] Sync failed');
  }
}
