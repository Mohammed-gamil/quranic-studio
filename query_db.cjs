const Database = require('better-sqlite3');
const db = new Database('D:\\pojects\\quranic-studio\\data\\wazakkir.db');

const rows = db.prepare("SELECT cache_key, data FROM cache_entries WHERE cache_key LIKE 'quran::%'").all();
console.log(`Found ${rows.length} cache entries.`);

for (const row of rows) {
  console.log(`Key: ${row.cache_key}`);
  const parsed = JSON.parse(row.data);
  const verses = parsed.ayahs || parsed.verses || [];
  console.log(`Found ${verses.length} verses.`);
  for (const v of verses) {
    if (v.number === 9) {
      console.log(`Verse: ${v.number}`);
      console.log(`Text: ${v.text}`);
      console.log(`Hex: ${[...v.text].map(c => 'U+' + c.charCodeAt(0).toString(16).padStart(4, '0')).join(' ')}`);
    }
  }
}
