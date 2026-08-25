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

import { readFileSync, existsSync } from 'fs';
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

  const summary = metrics.summary;
  const bundles = metrics.bundles || [];
  let hasViolation = false;

  console.log('📊 Performance Budget Check');
  console.log('============================');
  if (budget.baseline?.capturedAt) {
    console.log(`Budget baseline: ${budget.baseline.capturedAt}`);
  }
  console.log();

  for (const item of budget.budget) {
    let actual = 0;
    let skip = false;

    switch (item.resource) {
      case 'total-js':
        actual = summary.totalJsSize;
        break;
      case 'total-css':
        actual = summary.totalCssSize;
        break;
      case 'largest-js-chunk': {
        const jsBundles = bundles.filter((b) => b.type === 'js');
        actual = jsBundles.length ? jsBundles[0].size : 0;
        break;
      }
      case 'largest-css-chunk': {
        const cssBundles = bundles.filter((b) => b.type === 'css');
        actual = cssBundles.length ? cssBundles[0].size : 0;
        break;
      }
      case 'bundle-count':
        actual = summary.totalBundles;
        break;
      default:
        console.warn(`⚠️  Unknown budget resource: ${item.resource} — skipping`);
        skip = true;
    }

    if (skip) continue;

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
