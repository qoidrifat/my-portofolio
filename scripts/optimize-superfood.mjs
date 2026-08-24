/**
 * optimize-superfood.mjs
 *
 * Converts SuperFood OFD Scraper screenshots from the source repository
 * into optimized WebP assets for the portfolio's project gallery.
 *
 * Usage:  node scripts/optimize-superfood.mjs <source-repo-path>
 *   <source-repo-path>  — path to a local clone of qoidrifat/superfood-ofd-scraper
 *
 * Output: public/projects/superfood/*.webp
 *   - cover.webp        — 1600w card cover (analytics dashboard)
 *   - landing.webp      — 1600w landing page
 *   - dashboard.webp    — 1600w dashboard with sidebar
 *   - restaurants.webp  — 1600w restaurants filters
 *   - results.webp      — 1600w results table
 *   - analytics.webp    — 1600w analytics dashboard
 *   - mobile.webp       — 900w mobile dashboard
 *   - merchant.webp     — 1600w merchant portal (accounts list)
 */

import { join, resolve, basename, extname } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import sharp from 'sharp';

const sourceRepo = resolve(process.argv[2] || '');
const outDir = join(process.cwd(), 'public', 'projects', 'superfood');

if (!sourceRepo || !existsSync(sourceRepo)) {
  console.error('Usage: node scripts/optimize-superfood.mjs <source-repo-path>');
  process.exit(1);
}

const screenshotsDir = join(sourceRepo, 'portfolio-assets', 'screenshots');

// [source file name, output name, max width]
const MAP = [
  ['01-landing-page.png',        'landing.webp',     1600],
  ['02-dashboard-with-sidebar.png', 'dashboard.webp', 1600],
  ['03-restaurants-filters.png', 'restaurants.webp', 1600],
  ['04-results-table.png',       'results.webp',     1600],
  ['05-analytics-dashboard.png', 'analytics.webp',   1600],
  ['06-mobile-dashboard.png',    'mobile.webp',       900],
  ['03-merchant-accounts-list.png', 'merchant.webp', 1600],
];

mkdirSync(outDir, { recursive: true });

async function main() {
  let totalSaved = 0;
  let totalOriginal = 0;

  for (const [src, out, width] of MAP) {
    const srcPath = join(screenshotsDir, src);
    if (!existsSync(srcPath)) {
      console.log(`  ⏭  SKIP  ${src} — not found`);
      continue;
    }

    const originalSize = statSync(srcPath).size;
    const outPath = join(outDir, out);

    await sharp(srcPath)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 82, effort: 6 })
      .toFile(outPath);

    const outSize = statSync(outPath).size;
    const pct = ((originalSize - outSize) / originalSize * 100).toFixed(0);
    totalSaved += outSize;
    totalOriginal += originalSize;

    console.log(
      `  ✅  ${out.padEnd(18)} ${(outSize / 1024).toFixed(0).padStart(5)} KB` +
      `  (${pct}% ↓ from ${(originalSize / 1024).toFixed(0)} KB)`
    );
  }

  // Card cover — reuse the dashboard screenshot at 16:9 crop (1600×900)
  const coverSrc = join(screenshotsDir, '02-dashboard-with-sidebar.png');
  if (existsSync(coverSrc)) {
    await sharp(coverSrc)
      .resize({ width: 1600, height: 900, fit: 'cover', position: 'centre' })
      .webp({ quality: 82, effort: 6 })
      .toFile(join(outDir, 'cover.webp'));
    const size = statSync(join(outDir, 'cover.webp')).size;
    console.log(`  ✅  cover.webp`.padEnd(27) + ` ${(size / 1024).toFixed(0).padStart(5)} KB`);
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
