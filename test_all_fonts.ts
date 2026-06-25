import { runPipeline, getDb } from './packages/engine/src/index';
import path from 'path';
import fs from 'fs';
import axios from 'axios';

const FONT_URLS: Record<string, string> = {
  'Amiri': 'https://github.com/google/fonts/raw/main/ofl/amiri/Amiri-Regular.ttf',
  'Tajawal': 'https://github.com/google/fonts/raw/main/ofl/tajawal/Tajawal-Regular.ttf',
  'Noto Naskh Arabic': 'https://github.com/google/fonts/raw/main/ofl/notonaskharabic/NotoNaskhArabic%5Bwght%5D.ttf',
  'Lalezar': 'https://github.com/google/fonts/raw/main/ofl/lalezar/Lalezar-Regular.ttf',
  'Inter': 'https://github.com/google/fonts/raw/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf'
};

async function testDownloads() {
  console.log('--- TESTING ALL FONT DOWNLOADS ---');
  const dir = path.join(process.cwd(), 'data', 'fonts');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  for (const [fontName, url] of Object.entries(FONT_URLS)) {
    const localPath = path.join(dir, `${fontName.replace(/\s+/g, '')}.ttf`);
    console.log(`Downloading ${fontName}...`);
    try {
      if (fs.existsSync(localPath)) {
        fs.unlinkSync(localPath);
      }
      const response = await axios({
        method: 'get',
        url: url,
        responseType: 'stream',
        timeout: 60000
      });

      const writer = fs.createWriteStream(localPath);
      response.data.pipe(writer);

      await new Promise<void>((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });

      const size = fs.statSync(localPath).size;
      console.log(`Successfully downloaded ${fontName}: ${size} bytes`);
      if (size === 0) {
        console.error(`ERROR: ${fontName} downloaded as 0 bytes!`);
      }
    } catch (err: any) {
      console.error(`FAILED to download ${fontName}:`, err.message);
    }
  }
}

testDownloads();
