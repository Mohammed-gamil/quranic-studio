import { runPipeline, getDb } from './packages/engine/src/index';

async function test() {
  console.log('--- STARTING HIJR 9 NOTO NASKH PIPELINE TEST ---');
  getDb(); // Init DB
  try {
    const result = await runPipeline({
      surah: 15,
      ayahFrom: 9,
      ayahTo: 9,
      reciterId: 1, // Abdul Basit
      videoFormat: 'horizontal',
      backgroundQuery: 'stars',
      subtitleFont: 'Noto Naskh',
      subtitleFontSize: 90,
      subtitleShowTranslation: false
    }, 'test-hijr-9-noto');
    console.log('--- PIPELINE SUCCESS ---');
    console.log('Output Path:', result.outputPath);
  } catch (err) {
    console.error('--- PIPELINE FAILED ---');
    console.error(err);
  }
}

test();
