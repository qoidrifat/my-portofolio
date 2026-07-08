/**
 * optimize-images.mjs
 *
 * Batch-converts images in public/ to WebP and AVIF using sharp.
 *
 * Usage:  node scripts/optimize-images.mjs
 *
 * Quality targets:
 *   - Photos / project images  → lossy q80 (WebP), q65 (AVIF)
 *   - Icons / logos            → lossless (WebP), no AVIF needed
 */

import { readdirSync, statSync, mkdirSync, existsSync } from 'fs';
import { join, extname, basename } from 'path';
import sharp from 'sharp';

const PUBLIC = join(import.meta.dirname, '..', 'public');

// Extensions to process
const EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);

// Files to skip (e.g. already optimized, or not worth converting)
const SKIP = new Set([]);

// Quality settings
const PHOTO_QUALITY_WEBP = 80;   // high-quality WebP for photos
const PHOTO_QUALITY_AVIF = 65;   // smaller AVIF for photos
const LOSSLESS_WEBP = false;     // lossless for icons/logos

function isPhoto(filename) {
  // Photos are anything except icons/logos
  const lower = filename.toLowerCase();
  return !lower.includes('icon') && !lower.includes('logo');
}

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walk(full));
    } else if (EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function convert() {
  const files = walk(PUBLIC);
  console.log(`Found ${files.length} images to optimize.\n`);

  let totalOriginal = 0;
  let totalWebP = 0;
  let totalAvif = 0;

  for (const file of files) {
    const name = basename(file);
    if (SKIP.has(name)) {
      console.log(`  ⏭  SKIP  ${name}`);
      continue;
    }

    const outDir = join(PUBLIC); // same directory
    const base = basename(file, extname(file));
    const originalSize = statSync(file).size;
    totalOriginal += originalSize;

    const photo = isPhoto(name);

    // -- WebP --
    const webpPath = join(outDir, `${base}.webp`);
    let webpSize = 0;

    if (photo) {
      // Lossy WebP q80 for photos
      await sharp(file)
        .webp({ quality: PHOTO_QUALITY_WEBP })
        .toFile(webpPath);
      webpSize = statSync(webpPath).size;
      totalWebP += webpSize;
    } else {
      // Lossless for icons/logos
      await sharp(file)
        .webp({ lossless: true })
        .toFile(webpPath);
      webpSize = statSync(webpPath).size;
      totalWebP += webpSize;
    }

    // -- AVIF (photos only, only if WebP saved at least 20%) --
    let avifPath = null;
    let avifSize = 0;
    const savingPct = ((originalSize - webpSize) / originalSize) * 100;

    // Only create AVIF for photos with significant savings
    if (photo && savingPct > 10 && originalSize > 100 * 1024) {
      avifPath = join(outDir, `${base}.avif`);
      await sharp(file)
        .avif({ quality: PHOTO_QUALITY_AVIF })
        .toFile(avifPath);
      avifSize = statSync(avifPath).size;
      totalAvif += avifSize;
    }

    // Log results
    const originalKb = (originalSize / 1024).toFixed(1);
    const webpKb = (webpSize / 1024).toFixed(1);
    const webpPct = ((originalSize - webpSize) / originalSize * 100).toFixed(1);
    const avifKb = avifPath ? (avifSize / 1024).toFixed(1) : '—';
    const avifPct = avifPath ? ((originalSize - avifSize) / originalSize * 100).toFixed(1) : '—';

    console.log(`  ✅  ${name}`);
    console.log(`      Original: ${originalKb.padStart(8)} KB  →  WebP: ${webpKb.padStart(8)} KB  (${webpPct}% saving)`);
    if (avifPath) {
      console.log(`                                   →  AVIF: ${avifKb.padStart(8)} KB  (${avifPct}% saving)`);
    }
  }

  console.log(`\n── Summary ──`);
  console.log(`  Original total: ${(totalOriginal / 1024 / 1024).toFixed(1)} MB`);
  console.log(`  WebP total:     ${(totalWebP / 1024 / 1024).toFixed(1)} MB  (${((totalOriginal - totalWebP) / totalOriginal * 100).toFixed(1)}% saved)`);
  if (totalAvif > 0) {
    console.log(`  AVIF total:     ${(totalAvif / 1024 / 1024).toFixed(1)} MB  (${((totalOriginal - totalAvif) / totalOriginal * 100).toFixed(1)}% saved)`);
  }
}

convert().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
