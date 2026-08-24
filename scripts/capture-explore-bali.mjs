/**
 * capture-explore-bali.mjs
 * ---------------------------------------------------------------------------
 * Captures real screenshots of the Explore Bali PHP application served by
 * Laragon Apache at http://localhost/explore-bali.
 *
 * Strategy: Chrome's built-in `--headless --screenshot` CLI flag, with a
 * FRESH Chrome process per page. This avoids the CDP-WebSocket fragility seen
 * earlier (connection wedging after heavy pages, orphaned-Chrome port locks)
 * because there is no long-lived connection and no fixed debugging port.
 *
 * Output: raw PNG screenshots to /tmp/explore-bali-captures/
 * (then scripts/optimize-explore-bali.mjs converts them to WebP assets.)
 *
 * Usage: node scripts/capture-explore-bali.mjs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost/explore-bali';
const OUT = path.join(os.tmpdir(), 'explore-bali-captures');
const TMP = path.join(os.tmpdir(), `eb-cli-${process.pid}`);

// Fresh output dir per run — a stale PNG from a previous run would otherwise
// be resolved by the poll before Chrome writes the new capture.
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];

// [url, output file name, width, height, scale factor]
const SHOTS = [
  ['index.php',                     'home.png',                1440, 900, 2],
  ['destination.php',               'destinations.png',        1440, 900, 2],
  ['detail.php?id=1',               'destination-detail.png',  1440, 900, 2],
  ['transport.php',                 'transport.png',           1440, 900, 2],
  ['tiket.php',                     'ticket-menu.png',         1440, 900, 2],
  ['booking.hotel.php',             'hotel-booking.png',       1440, 900, 2],
  ['sewa.mobil.php',                'car-rental.png',          1440, 900, 2],
  ['hasil.pesawat.php?from=1&to=2&departure-date=2024-07-15&return-date=2024-07-17&passengers=1', 'flight-results.png', 1440, 900, 2],
  ['hasil.hotel.php?destination=2&check-in-date=2024-07-15&check-out-date=2024-07-17&rooms=1', 'hotel-results.png', 1440, 900, 2],
  ['hasil.bus.php?from=1&to=2&departure-date=2024-07-15&return-date=2024-07-17&passengers=1', 'bus-results.png', 1440, 900, 2],
  ['visa.php',                      'visa.png',                1440, 900, 2],
  ['contact.php',                   'contact.png',             1440, 900, 2],
  ['about.php',                     'about.png',               1440, 900, 2],
  // Mobile responsive captures (portrait phone viewport)
  ['index.php',                     'mobile-home.png',          390, 844, 3],
  ['destination.php',               'mobile-destinations.png',  390, 844, 3],
  ['tiket.php',                     'mobile-tickets.png',       390, 844, 3],
];

// Capture one page with a dedicated Chrome process. Chrome's --screenshot
// writes the PNG, then the process exits. We wait for the file to appear.
function captureOne(url, file, width, height, scale) {
  return new Promise((resolve) => {
    const profile = path.join(TMP, `prof-${results.length}`);
    const outPath = path.join(OUT, file);

    const child = spawn(CHROME, [
      '--headless=new',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--hide-scrollbars',
      `--user-data-dir=${profile}`,
      `--window-size=${width},${height}`,
      `--force-device-scale-factor=${scale}`,
      `--screenshot=${outPath}`,
      '--virtual-time-budget=9000',
      `${BASE}/${url}`,
    ], { stdio: 'ignore' });

    const timer = setTimeout(() => {
      try { child.kill(); } catch {}
      resolve({ file, url, error: 'process timeout (40s)' });
    }, 40000);

    const poll = () => {
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        clearTimeout(timer);
        try {
          const size = fs.statSync(outPath).size;
          resolve({ file, url, sizeKB: Math.round(size / 1024) });
        } finally {
          try { child.kill(); } catch {}
        }
        return;
      }
      setTimeout(poll, 400);
    };
    child.on('exit', () => {
      clearTimeout(timer);
      if (fs.existsSync(outPath) && fs.statSync(outPath).size > 1000) {
        resolve({ file, url, sizeKB: Math.round(fs.statSync(outPath).size / 1024) });
      } else {
        resolve({ file, url, error: 'chrome exited without output' });
      }
    });
    poll();
  });
}

async function main() {
  for (const [url, file, width, height, scale] of SHOTS) {
    const res = await captureOne(url, file, width, height, scale);
    results.push(res);
    if (res.error) console.log(`  ✗ ${file.padEnd(22)} FAILED — ${res.error}`);
    else console.log(`  ✓ ${file.padEnd(22)} ${res.sizeKB} KB`);
  }

  fs.writeFileSync(path.join(OUT, 'capture-summary.json'), JSON.stringify(results, null, 2));
  const ok = results.filter((r) => !r.error).length;
  console.log(`\n── Captured ${ok}/${results.length} screenshots → ${OUT}`);
}

try {
  await main();
  if (results.some((r) => r.error)) process.exitCode = 1;
} catch (err) {
  console.error('\nERROR:', err.message);
  process.exitCode = 1;
} finally {
  await sleep(500);
  for (let attempt = 0; attempt < 3; attempt++) {
    try { fs.rmSync(TMP, { recursive: true, force: true }); break; } catch { await sleep(300); }
  }
}
