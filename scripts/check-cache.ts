import { getDb } from '../packages/engine/src/db/database';

const db = getDb();
const rows = db.prepare("SELECT cache_key, type, substr(data, 1, 500) as data_preview FROM cache_entries WHERE type = 'timing'").all();
console.log('--- CACHED TIMING ENTRIES ---');
for (const row of rows as any[]) {
  console.log(`Key: ${row.cache_key}`);
  console.log(`Type: ${row.type}`);
  try {
    const data = JSON.parse(row.data_preview);
    console.log(`Segments (first 5):`, JSON.stringify(data.segments?.slice(0, 5), null, 2));
    console.log(`mp3LocalPath:`, data.mp3LocalPath);
  } catch {
    console.log(`Raw preview: ${row.data_preview}`);
  }
  console.log('---');
}
