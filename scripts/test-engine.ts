import { runPipeline, getDb } from '../packages/engine/src/index';

async function test() {
  console.log('--- STARTING PIPELINE TEST ---');
  getDb(); // Init DB
  try {
    const result = await runPipeline({
      surah: 1,
      ayahFrom: 3,
      ayahTo: 5,
      reciterId: 1, // Abdul Basit
      videoFormat: 'horizontal',
      backgroundQuery: 'stars'
    }, 'test-job-123');
    console.log('--- PIPELINE SUCCESS ---');
    console.log('Output Path:', result.outputPath);
  } catch (err) {
    console.error('--- PIPELINE FAILED ---');
    console.error(err);
  }
}

test();
