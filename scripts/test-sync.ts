import fs from 'fs';
import path from 'path';
import { getDb, getStatements } from '../packages/engine/src/db/database';
import { QuranAdapter } from '../packages/engine/src/adapters/QuranAdapter';
import { TimingAdapter } from '../packages/engine/src/adapters/TimingAdapter';
import { generateAssFile } from '../packages/engine/src/pipeline/subtitleGenerator';
import { logger } from '../packages/engine/src/utils/logger';

async function testSync() {
  console.log('=== SYNC DIAGNOSTIC TEST ===\n');
  getDb(); // Init DB

  const surah = 1;
  const ayahFrom = 3;
  const ayahTo = 5;
  const reciterId = 1;

  // 1. Fetch ayahs
  const quranAdapter = new QuranAdapter();
  const quranData = await quranAdapter.fetchAyahs(surah, ayahFrom, ayahTo);
  console.log(`\n--- AYAHS (${quranData.ayahs.length}) ---`);
  for (const a of quranData.ayahs) {
    console.log(`  Ayah ${a.number}: "${a.text.substring(0, 40)}..." (surahNumber: ${a.surahNumber})`);
  }

  // 2. Fetch timings
  const timingAdapter = new TimingAdapter();
  const timingData = await timingAdapter.fetchTimings(surah, reciterId);
  console.log(`\n--- ALL TIMING SEGMENTS ---`);
  for (const seg of timingData.segments) {
    console.log(`  Ayah ${seg.ayah}: ${seg.startMs}ms → ${seg.endMs}ms`);
  }

  // 3. Calculate offset (same logic as ffmpegEngine)
  const sortedAyahNums = quranData.ayahs.map(a => a.number).sort((a, b) => a - b);
  const firstAyahNum = sortedAyahNums[0];
  const lastAyahNum = sortedAyahNums[sortedAyahNums.length - 1];
  const firstSeg = timingData.segments.find(s => s.ayah === firstAyahNum);
  const lastSeg = timingData.segments.find(s => s.ayah === lastAyahNum);

  let offsetMs = firstSeg ? firstSeg.startMs : 0;
  if (firstAyahNum === 1 && surah !== 1) {
    offsetMs = 0;
  }
  const totalEndMs = lastSeg ? lastSeg.endMs : (firstSeg ? firstSeg.endMs : 5000);
  const durationMs = totalEndMs - offsetMs;

  console.log(`\n--- FFMPEG PARAMETERS ---`);
  console.log(`  firstAyahNum: ${firstAyahNum}, lastAyahNum: ${lastAyahNum}`);
  console.log(`  offsetMs (audio seek): ${offsetMs}ms = ${(offsetMs / 1000).toFixed(3)}s`);
  console.log(`  durationMs: ${durationMs}ms = ${(durationMs / 1000).toFixed(3)}s`);

  // 4. Generate subtitle file
  const tmpDir = path.join(process.cwd(), 'output', 'test-sync');
  fs.mkdirSync(tmpDir, { recursive: true });
  const assPath = path.join(tmpDir, 'subtitles.ass');
  await generateAssFile(quranData.ayahs, timingData, {
    surah,
    ayahFrom,
    ayahTo,
    reciterId,
    backgroundQuery: 'stars',
    videoFormat: 'horizontal'
  } as any, assPath);

  // 5. Print generated ASS file
  const assContent = fs.readFileSync(assPath, 'utf8');
  console.log(`\n--- GENERATED ASS FILE ---`);
  console.log(assContent);

  // 6. Verify sync alignment
  console.log(`\n--- SYNC VERIFICATION ---`);
  const dialogueLines = assContent.split('\n').filter(l => l.startsWith('Dialogue:'));
  for (const line of dialogueLines) {
    const match = line.match(/Dialogue: \d+,(\d+:\d+:\d+\.\d+),(\d+:\d+:\d+\.\d+),(\w+)/);
    if (match) {
      console.log(`  Style: ${match[3]}, Start: ${match[1]}, End: ${match[2]}`);
    }
  }

  console.log(`\n--- EXPECTED ALIGNMENT ---`);
  for (const ayah of quranData.ayahs) {
    const seg = timingData.segments.find(s => s.ayah === ayah.number);
    if (seg) {
      const startRel = seg.startMs - offsetMs;
      const endRel = seg.endMs - offsetMs;
      console.log(`  Ayah ${ayah.number}: ${startRel}ms → ${endRel}ms (audio-relative)`);
    }
  }

  console.log('\n=== TEST COMPLETE ===');
}

testSync().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
