/**
 * optimize-explore-bali.mjs
 *
 * Converts Explore Bali screenshots (captured by capture-explore-bali.mjs
 * into the OS temp dir) into optimized WebP assets for the portfolio's
 * project gallery.
 *
 * Usage:  node scripts/optimize-explore-bali.mjs
 *
 * Input:  <os tmp>/explore-bali-captures/*.png   (or --dir=<path> override)
 * Output: public/projects/explore-bali/*.webp
 */

import { join, resolve } from 'path';
import { mkdirSync, existsSync, statSync, readdirSync } from 'fs';
import os from 'node:os';
import sharp from 'sharp';

const flag = process.argv.find((a) => a.startsWith('--dir='));
const sourceDir = flag ? resolve(flag.slice(6)) : join(os.tmpdir(), 'explore-bali-captures');
const outDir = join(process.cwd(), 'public', 'projects', 'explore-bali');

if (!existsSync(sourceDir)) {
  console.error('Source dir not found:', sourceDir);
  console.error('Run scripts/capture-explore-bali.mjs first.');
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

// [capture file, output name, max width, portrait flag]
const MAP = [
  ['home.png',                 'home.webp',                1600, false],
  ['destinations.png',         'destinations.webp',        1600, false],
  ['destination-detail.png',   'destination-detail.webp',  1600, false],
  ['transport.png',            'transport.webp',           1600, false],
  ['ticket-menu.png',          'ticket-menu.webp',         1600, false],
  ['hotel-booking.png',        'hotel-booking.webp',       1600, false],
  ['car-rental.png',           'car-rental.webp',          1600, false],
  ['flight-results.png',       'flight-results.webp',      1600, false],
  ['hotel-results.png',        'hotel-results.webp',       1600, false],
  ['bus-results.png',          'bus-results.webp',         1600, false],
  ['visa.png',                 'visa.webp',                1600, false],
  ['contact.png',              'contact.webp',             1600, false],
  ['about.png',                'about.webp',               1600, false],
  ['mobile-home.png',          'mobile-home.webp',          900, true],
  ['mobile-destinations.png',  'mobile-destinations.webp',  900, true],
  ['mobile-tickets.png',       'mobile-tickets.webp',       900, true],
];

async function main() {
  let totalSaved = 0;
  let totalOriginal = 0;
  const available = new Set(readdirSync(sourceDir));

  for (const [src, out, width, portrait] of MAP) {
    const srcPath = join(sourceDir, src);
    if (!available.has(src)) {
      console.log(`  ⏭  SKIP  ${src} — not in capture dir`);
      continue;
    }

    const originalSize = statSync(srcPath).size;
    const outPath = join(outDir, out);

    const pipeline = sharp(srcPath).resize({ width, withoutEnlargement: true });
    await pipeline.webp({ quality: 82, effort: 6 }).toFile(outPath);

    const outSize = statSync(outPath).size;
    const pct = ((originalSize - outSize) / originalSize * 100).toFixed(0);
    totalSaved += outSize;
    totalOriginal += originalSize;

    console.log(
      `  ✅  ${out.padEnd(24)} ${(outSize / 1024).toFixed(0).padStart(5)} KB` +
      `  (${pct}% ↓ from ${(originalSize / 1024).toFixed(0)} KB)${portrait ? '  [portrait]' : ''}`
    );
  }

  // Card cover — reuse the home hero screenshot at 16:9 crop (1600×900)
  const coverSrc = join(sourceDir, 'home.png');
  if (existsSync(coverSrc)) {
    await sharp(coverSrc)
      .resize({ width: 1600, height: 900, fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 6 })
      .toFile(join(outDir, 'cover.webp'));
    const size = statSync(join(outDir, 'cover.webp')).size;
    console.log(`  ✅  cover.webp`.padEnd(28) + ` ${(size / 1024).toFixed(0).padStart(5)} KB`);
    totalSaved += size;
  }

  console.log(`\n── Summary ──`);
  console.log(`  Output: ${outDir}`);
  console.log(`  ${((totalOriginal - totalSaved) / 1024 / 1024).toFixed(1)} MB → ${(totalSaved / 1024 / 1024).toFixed(1)} MB saved`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
