#!/usr/bin/env node
/**
 * Performance Budget Checker
 *
 * Reads src/data/performance-metrics.json (committed build artifact) and
 * validates each dimension against performance-budget.json (committed budget).
 * Exits non-zero if any dimension is violated.
 *
 * Run: `npm run check:budget`
 * In CI: `.github/workflows/ci.yml` runs this after `npm run build`.
 *
 * This script intentionally does not invent metrics. It reads only the
 * committed artifacts. If the metrics file is missing, exit 1 with a clear
 * message (run `npm run build` first).
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');

function fmtBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function readMetrics() {
  const metricsPath = join(root, 'src', 'data', 'performance-metrics.json');
  if (!existsSync(metricsPath)) {
    console.error('❌ performance-metrics.json not found at', metricsPath);
    console.error('   Run `npm run build` first — it regenerates this file via scripts/generate-stats.mjs.');
    process.exit(1);
  }
  return JSON.parse(readFileSync(metricsPath, 'utf-8'));
}

/**
 * Measure dist/assets directly instead of trusting the generated JSON.
 *
 * generate-stats.mjs derives the committed metrics from dist/, so the two
 * normally agree — but when dist/ is rebuilt without regenerating, or a stale
 * metrics file is committed, the budget check would validate an old number and
 * pass while the shipped bundle is over budget. Measuring the real output makes
 * that class of false PASS impossible.
 */
function measureDist() {
  const assetsDir = join(root, 'dist', 'assets');
  if (!existsSync(assetsDir)) {
    console.error('❌ dist/assets not found. Run `npm run build` before `npm run check:budget`.');
    process.exit(1);
  }

  let totalJs = 0;
  let totalCss = 0;
  let largestJs = 0;
  let largestCss = 0;
  let count = 0;

  for (const name of readdirSync(assetsDir)) {
    const ext = name.split('.').pop();
    if (ext !== 'js' && ext !== 'css') continue;
    const size = statSync(join(assetsDir, name)).size;
    count++;
    if (ext === 'js') {
      totalJs += size;
      if (size > largestJs) largestJs = size;
    } else {
      totalCss += size;
      if (size > largestCss) largestCss = size;
    }
  }

  // initial-js = exactly what dist/index.html makes the browser download
  // before the page is interactive. Everything else is a lazy chunk fetched on
  // demand and is irrelevant to LCP, so it is governed by total-js instead.
  const indexPath = join(root, 'dist', 'index.html');
  if (!existsSync(indexPath)) {
    console.error('❌ dist/index.html not found. Run `npm run build` first.');
    process.exit(1);
  }
  const html = readFileSync(indexPath, 'utf-8');
  let initialJs = 0;
  for (const m of html.matchAll(/(?:src|href)="(\/assets\/[^"]+\.(?:js|css))"/g)) {
    const size = statSync(join(root, 'dist', m[1])).size;
    if (m[1].endsWith('.js')) initialJs += size;
  }

  return { totalJs, totalCss, largestJs, largestCss, count, initialJs };
}

function readBudget() {
  const budgetPath = join(root, 'performance-budget.json');
  if (!existsSync(budgetPath)) {
    console.error('❌ performance-budget.json not found at', budgetPath);
    process.exit(1);
  }
  return JSON.parse(readFileSync(budgetPath, 'utf-8'));
}

function checkBudget() {
  const metrics = readMetrics();
  const budget = readBudget();
  const measured = measureDist();

  const summary = metrics.summary;
  let hasViolation = false;

  console.log('📊 Performance Budget Check');
  console.log('============================');
  if (budget.baseline?.capturedAt) {
    console.log(`Budget baseline: ${budget.baseline.capturedAt}`);
  }
  console.log('Source: measured from dist/assets (not the committed metrics file)');
  console.log();

  for (const item of budget.budget) {
    let actual = 0;
    let skip = false;

    switch (item.resource) {
      case 'total-js':
        actual = measured.totalJs;
        break;
      case 'initial-js':
        actual = measured.initialJs;
        break;
      case 'total-css':
        actual = measured.totalCss;
        break;
      case 'largest-js-chunk':
        actual = measured.largestJs;
        break;
      case 'largest-css-chunk':
        actual = measured.largestCss;
        break;
      case 'bundle-count':
        actual = measured.count;
        break;
      default:
        console.warn(`⚠️  Unknown budget resource: ${item.resource} — skipping`);
        skip = true;
    }

    if (skip) continue;

    const drift =
      item.resource === 'total-js' ? summary.totalJsSize - measured.totalJs :
      item.resource === 'total-css' ? summary.totalCssSize - measured.totalCss : 0;
    if (drift !== 0) {
      console.warn(
        `⚠️  ${item.resource}: committed metrics (${fmtBytes(item.resource === 'total-js' ? summary.totalJsSize : summary.totalCssSize)}) ` +
        `differ from dist (${fmtBytes(item.resource === 'total-js' ? measured.totalJs : measured.totalCss)}). ` +
        'Using the measured value.'
      );
    }

    const pass = actual <= item.budget;
    const status = pass ? '✅' : '❌';
    if (!pass) hasViolation = true;

    const actualLabel = item.unit === 'bytes' ? fmtBytes(actual) : String(actual);
    const budgetLabel = item.unit === 'bytes' ? fmtBytes(item.budget) : String(item.budget);

    console.log(`${status} ${item.resource.padEnd(22)} ${actualLabel.padStart(10)} / ${budgetLabel.padStart(10)}   ${item.description}`);
  }

  console.log();
  console.log('============================');
  if (hasViolation) {
    console.error('❌ PERFORMANCE BUDGET VIOLATED');
    console.error('   A bundle grew beyond the committed safety margin.');
    console.error('   Either: (a) reduce bundle size, or (b) raise the budget in performance-budget.json with justification.');
    process.exit(1);
  } else {
    console.log('✅ All budgets satisfied');
    process.exit(0);
  }
}

checkBudget();
