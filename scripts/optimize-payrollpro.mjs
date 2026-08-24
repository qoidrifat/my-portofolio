/**
 * optimize-payrollpro.mjs
 *
 * Converts PayrollPro screenshots from the source repository into optimized
 * WebP assets for the portfolio's project gallery.
 *
 * Usage:  node scripts/optimize-payrollpro.mjs <source-images-dir>
 *   <source-images-dir>  — path to the docs/images directory of a local clone
 *                          of qoidrifat/payrollpro (or an extracted copy)
 *
 * Output: public/projects/payrollpro/*.webp
 */

import { join, resolve } from 'path';
import { mkdirSync, existsSync, statSync } from 'fs';
import sharp from 'sharp';

const sourceDir = resolve(process.argv[2] || '');
const outDir = join(process.cwd(), 'public', 'projects', 'payrollpro');

if (!sourceDir || !existsSync(sourceDir)) {
  console.error('Usage: node scripts/optimize-payrollpro.mjs <source-images-dir>');
  process.exit(1);
}

// [source file name, output name, max width, portrait flag]
const MAP = [
  ['dashboard.png',          'dashboard.webp',          1600, false],
  ['dashboard-dark.png',     'dashboard-dark.webp',     1600, false],
  ['login.png',              'login.webp',              1600, false],
  ['employees.png',          'employees.webp',          1600, false],
  ['employee-detail.png',    'employee-detail.webp',    1600, false],
  ['attendance.png',         'attendance.webp',         1600, false],
  ['my-qr.png',              'my-qr.webp',              1600, false],
  ['payroll.png',            'payroll.webp',            1600, false],
  ['payroll-detail.png',     'payroll-detail.webp',     1600, false],
  ['reports.png',            'reports.webp',            1600, false],
  ['portal-dashboard.png',   'portal-dashboard.webp',   1600, false],
  ['portal-attendance.png',  'portal-attendance.webp',  1600, false],
  ['portal-payroll.png',     'portal-payroll.webp',     1600, false],
  ['portal-tax.png',         'portal-tax.webp',         1600, false],
  ['settings.png',           'settings.webp',           1600, false],
  ['mobile-dashboard.png',   'mobile.webp',              900, true],
];

mkdirSync(outDir, { recursive: true });

async function main() {
  let totalSaved = 0;
  let totalOriginal = 0;

  for (const [src, out, width, portrait] of MAP) {
    const srcPath = join(sourceDir, src);
    if (!existsSync(srcPath)) {
      console.log(`  ⏭  SKIP  ${src} — not found`);
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
      `  ✅  ${out.padEnd(22)} ${(outSize / 1024).toFixed(0).padStart(5)} KB` +
      `  (${pct}% ↓ from ${(originalSize / 1024).toFixed(0)} KB)${portrait ? '  [portrait]' : ''}`
    );
  }

  // Card cover — reuse the dashboard screenshot at 16:9 crop (1600×900)
  const coverSrc = join(sourceDir, 'dashboard.png');
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
