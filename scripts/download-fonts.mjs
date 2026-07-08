import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';

const FONT_DIR = 'public/fonts/inter';

// Ensure directory exists
fs.mkdirSync(FONT_DIR, { recursive: true });

const cssUrl = 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap';

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36'
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        const size = fs.statSync(dest).size;
        resolve(size);
      });
    }).on('error', err => {
      fs.unlinkSync(dest);
      reject(err);
    });
  });
}

async function main() {
  console.log('Fetching Google Fonts CSS...');
  const css = await fetch(cssUrl);
  fs.writeFileSync(path.join(FONT_DIR, 'google-fonts-full.css'), css);

  // Parse @font-face blocks that contain 'latin' subset and woff2 format
  const blocks = css.split('@font-face').filter(b => b.includes('latin') && b.includes('woff2'));
  console.log(`Found ${blocks.length} Latin subset @font-face blocks`);

  const results = [];

  for (const block of blocks) {
    const weight = (block.match(/font-weight:\s*(\d+)/) || [])[1] || '400';
    const style = (block.match(/font-style:\s*(\w+)/) || [])[1] || 'normal';
    const url = (block.match(/url\(([^)]+\.woff2)\)/) || [])[1];

    if (!url) {
      console.log(`SKIP weight=${weight} style=${style} (no woff2 URL found)`);
      continue;
    }

    const filename = `Inter-${style}-${weight}.woff2`;
    const dest = path.join(FONT_DIR, filename);

    console.log(`Downloading ${filename}...`);
    const size = await download(url, dest);
    results.push({ filename, size, weight, style });
    console.log(`  OK ${filename} (${(size / 1024).toFixed(1)} KB)`);
  }

  console.log('\n=== DOWNLOAD COMPLETE ===');
  let totalSizeKB = 0;
  for (const r of results) {
    totalSizeKB += r.size;
    console.log(`${r.filename.padEnd(25)} ${(r.size / 1024).toFixed(1).padStart(6)} KB`);
  }
  console.log(`${'TOTAL'.padEnd(25)} ${(totalSizeKB / 1024).toFixed(1).padStart(6)} KB`);
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
