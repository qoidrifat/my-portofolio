/**
 * verify-payrollpro-visuals.mjs
 * ---------------------------------------------------------------------------
 * Drives headless Chrome over the Chrome DevTools Protocol (via Node's native
 * WebSocket — zero package installs) to visually verify the PayrollPro
 * case-study upgrade:
 *
 *   1. Homepage   — PayrollPro project card (element screenshot)
 *   2. Quick View — modal: Overview / Architecture / Tech Stack / Features
 *   3. Case study — hero + every section (Overview, Key Results, Metrics,
 *                   Architecture, Gallery ×2, Technologies, Key Features,
 *                   Challenges, Lessons, Roadmap, Documentation)
 *
 * Output: PNG screenshots + a verification JSON summary to /verification/payrollpro/
 *
 * Usage: node scripts/verify-payrollpro-visuals.mjs
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9333;
const BASE = 'http://localhost:5173';
const OUT = path.resolve('verification/payrollpro');
const PROFILE = path.join(os.tmpdir(), 'pp-verify-profile');

fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Shared mutable handles (cleaned up in finally) ─────────────────────────
let chrome = null;
let ws = null;
const consoleErrors = [];
const exceptions = [];
const results = {};

async function main() {
  // ── Launch Chrome headless ────────────────────────────────────────────────
  chrome = spawn(CHROME, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${PROFILE}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-gpu',
    '--hide-scrollbars',
    'about:blank',
  ], { stdio: 'ignore' });

  async function waitForTarget() {
    for (let i = 0; i < 50; i++) {
      try {
        const res = await fetch(`http://127.0.0.1:${PORT}/json/list`);
        const list = await res.json();
        const page = list.find((t) => t.type === 'page');
        if (page) return page.webSocketDebuggerUrl;
      } catch {}
      await sleep(200);
    }
    throw new Error('Chrome DevTools endpoint never came up');
  }

  // ── CDP client (Node 24 native WebSocket) ─────────────────────────────────
  ws = new WebSocket(await waitForTarget());
  await new Promise((resolve, reject) => {
    ws.addEventListener('open', resolve, { once: true });
    ws.addEventListener('error', reject, { once: true });
  });

  let msgId = 0;
  const pending = new Map();

  ws.addEventListener('message', (e) => {
    const msg = JSON.parse(e.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
    } else if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      consoleErrors.push(msg.params.args.map((a) => a.value ?? a.description ?? '').join(' '));
    } else if (msg.method === 'Runtime.exceptionThrown') {
      exceptions.push(msg.params.exceptionDetails.text);
    }
  });

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++msgId;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    if (res.exceptionDetails) {
      const desc = res.exceptionDetails.exception?.description || res.exceptionDetails.text || 'unknown';
      throw new Error('Runtime.evaluate failed: ' + desc);
    }
    return res.result?.value;
  }

  async function shot(file) {
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, file), Buffer.from(data, 'base64'));
    console.log(`  ✓ ${file}`);
  }

  // Scroll an <h2> (by exact text) into view, then screenshot the viewport.
  async function scrollToHeading(name, file) {
    const found = await evaluate(`(() => {
      const h = [...document.querySelectorAll('h2')].find(x => x.textContent.trim() === ${JSON.stringify(name)});
      if (!h) return false;
      h.scrollIntoView({ block: 'start' });
      const r = h.getBoundingClientRect();
      window.scrollBy(0, r.top - 96); // clear the fixed top nav
      return true;
    })()`);
    if (!found) throw new Error(`heading not found: ${name}`);
    await sleep(1000); // let FadeSection / framer-motion settle
    await shot(file);
  }

  async function waitFor(expression, label, tries = 60) {
    for (let i = 0; i < tries; i++) {
      if (await evaluate(expression)) return true;
      await sleep(250);
    }
    throw new Error(`timeout waiting for: ${label}`);
  }

  // ── Set viewport (2x scale for crisp screenshots) ─────────────────────────
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', {
    width: 1440, height: 900, deviceScaleFactor: 2, mobile: false,
  });

  // ──────────────────────────────────────────────────────────────────────────
  // 1. HOMEPAGE CARD
  // ──────────────────────────────────────────────────────────────────────────
  await send('Page.navigate', { url: `${BASE}/` });
  await waitFor(`document.querySelector('h1') !== null`, 'homepage hero');
  await sleep(2500); // portfolio intro / entrance animations

  // Homepage sections are lazy-mounted (IntersectionObserver). The `#projects`
  // wrapper exists pre-mount, so scroll to it first — that triggers the mount.
  await evaluate(`document.querySelector('#projects')?.scrollIntoView({ block: 'start' })`);
  await sleep(800);

  // Poll until the PayrollPro card h3 exists (lazy chunk + React mount)
  const cardReady = await (async () => {
    for (let i = 0; i < 80; i++) {
      const ok = await evaluate(`(() => {
        const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim().startsWith('PayrollPro'));
        if (!h) return false;
        h.scrollIntoView({ block: 'center' });
        return true;
      })()`);
      if (ok) return true;
      await sleep(250);
    }
    return false;
  })();

  if (!cardReady) {
    const diag = await evaluate(`JSON.stringify({
      url: location.href,
      h1: document.querySelector('h1')?.textContent.slice(0, 60),
      allH3s: [...document.querySelectorAll('h3')].map(h => h.textContent.trim()).slice(0, 40),
      hasProjects: !!document.querySelector('#projects'),
      hasProjectSection: !!document.querySelector('input#project-search'),
      scrollY: window.scrollY,
      bodyHasPayroll: document.body.textContent.includes('PayrollPro'),
      bodyHead: document.body.textContent.trim().slice(0, 60),
    })`);
    console.error('DIAGNOSTICS:', diag);
    throw new Error('PayrollPro card not found on homepage');
  }
  await sleep(1000);

  // Element screenshot of the card (clip in CSS px — captured at 2x scale)
  const rect = await evaluate(`(() => {
    const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim().startsWith('PayrollPro'));
    if (!h) return null;
    let card = h.parentElement;
    while (card && ![...card.classList].includes('group/card')) card = card.parentElement;
    const r = (card || h).getBoundingClientRect();
    return { x: Math.max(0, r.x), y: Math.max(0, r.y), width: r.width, height: r.height };
  })()`);
  if (!rect) throw new Error('card rect not resolvable');
  {
    const { data } = await send('Page.captureScreenshot', {
      format: 'png',
      clip: { x: rect.x, y: rect.y, width: rect.width, height: rect.height, scale: 1 },
    });
    fs.writeFileSync(path.join(OUT, '01-card.png'), Buffer.from(data, 'base64'));
    console.log('  ✓ 01-card.png');
  }

  // Card facts for the summary
  results.card = await evaluate(`(() => {
    const h = [...document.querySelectorAll('h3')].find(x => x.textContent.trim().startsWith('PayrollPro'));
    let card = h ? h.parentElement : null;
    while (card && ![...card.classList].includes('group/card')) card = card.parentElement;
    const txt = (card || h || {}).textContent || '';
    const img = card ? card.querySelector('img') : null;
    return {
      hasStatusBadge: /Production Ready/i.test(txt),
      hasSubtitle: /Modern HR & Payroll Platform/i.test(txt),
      coverLoaded: img ? (img.complete && img.naturalWidth > 0) : false,
      coverSrc: img ? img.getAttribute('src') : null,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
    };
  })()`);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. QUICK VIEW MODAL — Overview / Architecture / Tech Stack / Features
  // ──────────────────────────────────────────────────────────────────────────
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('button[aria-label^="Quick view"]')]
      .find(x => x.getAttribute('aria-label').includes('PayrollPro'));
    if (!b) return false;
    b.click();
    return true;
  })()`);
  await waitFor(`document.querySelector('[role="dialog"]') !== null`, 'modal opens');
  await sleep(900); // spring-in
  await shot('02-modal-overview.png');

  // Architecture tab
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('[role="dialog"] button')]
      .find(x => x.textContent.trim().startsWith('Architecture'));
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(700);
  await shot('03-modal-architecture.png');

  // Tech Stack tab
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('[role="dialog"] button')]
      .find(x => x.textContent.trim().startsWith('Tech Stack'));
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(700);
  await shot('04-modal-tech.png');

  // Features tab
  await evaluate(`(() => {
    const b = [...document.querySelectorAll('[role="dialog"] button')]
      .find(x => x.textContent.trim().startsWith('Features'));
    if (b) b.click();
    return !!b;
  })()`);
  await sleep(700);
  await shot('05-modal-features.png');

  results.modal = await evaluate(`(() => {
    const d = document.querySelector('[role="dialog"]');
    return {
      title: d ? d.querySelector('h2')?.textContent.trim() : null,
      tabLabels: [...(d ? d.querySelectorAll('button') : [])]
        .map(b => b.textContent.trim()).filter(t => ['Overview','Architecture','Tech Stack','Features','Challenges'].some(c => t.startsWith(c))),
    };
  })()`);

  // Close modal
  await evaluate(`document.querySelector('[role="dialog"] button[aria-label="Close modal"]').click()`);
  await sleep(600);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CASE STUDY PAGE — every section
  // ──────────────────────────────────────────────────────────────────────────
  await send('Page.navigate', { url: `${BASE}/projects/payrollpro` });
  await waitFor(
    `document.querySelector('h1')?.textContent.includes('PayrollPro')`,
    'case study h1'
  );
  await sleep(1200);
  await shot('06-hero.png');

  const sections = [
    'Overview', 'Key Results', 'Project Metrics', 'Architecture', 'Gallery',
    'Technologies', 'Key Features', 'Challenges & Solutions', 'Lessons Learned',
    'Future Roadmap', 'Documentation',
  ];

  for (let i = 0; i < sections.length; i++) {
    const base = String(7 + i).padStart(2, '0');
    const slug = sections[i].toLowerCase().replace(/[^a-z]+/g, '-');
    await scrollToHeading(sections[i], `${base}-${slug}.png`);

    // Gallery — screenshot already captured above; just take a second
    // viewport scroll (no Next/Prev arrows in the case study grid gallery).
    if (sections[i] === 'Gallery') {
      await sleep(400);
      await shot(`${base}-gallery-grid.png`);
    }
  }

  // ── Integrity checks ──────────────────────────────────────────────────────
  results.caseStudy = await evaluate(`(() => {
    const h2s = [...document.querySelectorAll('h2')].map(h => h.textContent.trim());
    const imgs = [...document.querySelectorAll('img')];
    const broken = imgs.filter(i => !(i.complete && i.naturalWidth > 0)).length;
    return {
      presentSections: h2s.filter(s => ['Overview','Key Results','Project Metrics','Architecture','Gallery','Technologies','Key Features','Challenges & Solutions','Lessons Learned','Future Roadmap','Documentation'].includes(s)),
      totalImages: imgs.length,
      brokenImages: broken,
      noHorizontalOverflow: document.documentElement.scrollWidth <= window.innerWidth,
      docTitle: document.title,
    };
  })()`);

  results.consoleErrors = consoleErrors;
  results.exceptions = exceptions;

  // ── Write summary ─────────────────────────────────────────────────────────
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(results, null, 2));

  console.log('\n── SUMMARY ──────────────────────────────────────────');
  console.log(JSON.stringify(results, null, 2));
}

// ── Run with guaranteed cleanup ─────────────────────────────────────────────
try {
  await main();
} catch (err) {
  console.error('\nERROR:', err.message);
  process.exitCode = 1;
} finally {
  try { chrome?.kill(); } catch {}
  await sleep(400);
  for (let attempt = 0; attempt < 3; attempt++) {
    try { fs.rmSync(PROFILE, { recursive: true, force: true }); break; } catch { await sleep(300); }
  }
  try { ws?.close(); } catch {}
}
