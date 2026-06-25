import fs from 'fs';

const content = fs.readFileSync('src/components/StudioView.tsx', 'utf8');
const lines = content.split('\n');

for (let i = 1115; i < 1140; i++) {
  if (i < lines.length) {
    console.log(`${i + 1}: ${lines[i]}`);
  }
}
