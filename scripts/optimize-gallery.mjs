import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const GALLERY_SRC = 'public/gallery/original';
const OUTPUT_DIR = 'public/gallery';

// Images currently used in the gallery grid
const galleryImages = [
  'gedung-perkantoran.webp',
  'menara-kembar-my3.webp',
  'cafe.webp',
  'changi-airport.webp',
  'masjid-my.webp',
  'gedung-pencakar-langit-sg.webp',
];

fs.mkdirSync(OUTPUT_DIR, { recursive: true });

async function main() {
  let totalOriginalKB = 0;
  let totalThumbKB = 0;

  for (const file of galleryImages) {
    const srcPath = path.join(GALLERY_SRC, file);
    if (!fs.existsSync(srcPath)) {
      console.log(`SKIP ${file} — not found in ${GALLERY_SRC}`);
      continue;
    }

    const thumbName = `thumb-${file}`;
    const thumbPath = path.join(OUTPUT_DIR, thumbName);

    const meta = await sharp(srcPath).metadata();
    const originalSize = fs.statSync(srcPath).size;

    // Resize to 600px on the longest side, maintaining aspect ratio
    const width = meta.width > meta.height ? 600 : undefined;
    const height = meta.height > meta.width ? 600 : undefined;

    await sharp(srcPath)
      .resize(width, height, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(thumbPath);

    const thumbSize = fs.statSync(thumbPath).size;
    const savings = ((originalSize - thumbSize) / originalSize * 100).toFixed(0);

    totalOriginalKB += originalSize;
    totalThumbKB += thumbSize;

    console.log(
      `${file.padEnd(35)} ${(originalSize / 1024).toFixed(0).padStart(5)} KB → ` +
      `${(thumbSize / 1024).toFixed(0).padStart(4)} KB (${savings}% ↓)`
    );
  }

  console.log('\n' + '─'.repeat(60));
  console.log(
    `TOTAL${' '.repeat(31)} ${(totalOriginalKB / 1024).toFixed(0).padStart(5)} KB → ` +
    `${(totalThumbKB / 1024).toFixed(0).padStart(4)} KB ` +
    `(${((totalOriginalKB - totalThumbKB) / totalOriginalKB * 100).toFixed(0)}% ↓)`
  );
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
