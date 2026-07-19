/* Intro verification via raw CDP (uses transitive `ws` dep).
 * Scenarios:
 *  1. Full intro run — console must be clean, intro completes, hero visible
 *  2. Reduced motion — completes < ~1.5s
 *  3. Mobile 375px — terminal fits viewport
 *  4. ESC skip mid-typing — fast exit, no errors
 */
import { execFile } from 'node:child_process';
import WebSocket from 'ws';
import http from 'node:http';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const URL_APP = 'http://localhost:5199/';
const PORT = 9333;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function launchChrome(extraArgs = []) {
  const child = execFile(CHROME, [
    `--remote-debugging-port=${PORT}`,
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--user-data-dir=' + process.env.TEMP + '/chrome-intro-test-' + Date.now(),
    ...extraArgs,
    'about:blank',
  ]);
  return child;
}

function getWsUrl() {
  return new Promise((resolve, reject) => {
    let tries = 0;
    const poll = () => {
      http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
        let data = '';
        res.on('data', (c) => (data += c));
        res.on('end', () => {
          try {
            const pages = JSON.parse(data).filter((t) => t.type === 'page');
            if (pages.length) return resolve(pages[0].webSocketDebuggerUrl);
            throw new Error('no page');
          } catch {
            if (++tries > 40) return reject(new Error('CDP not ready'));
            setTimeout(poll, 250);
          }
        });
      }).on('error', () => {
        if (++tries > 40) return reject(new Error('CDP not ready'));
        setTimeout(poll, 250);
      });
    };
    poll();
  });
}

class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.consoleMsgs = []; this.exceptions = [];
    ws.on('message', (raw) => {
      const msg = JSON.parse(raw);
      if (msg.id && this.pending.has(msg.id)) { this.pending.get(msg.id)(msg); this.pending.delete(msg.id); }
      if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
        this.consoleMsgs.push(`${msg.params.type}: ${msg.params.args.map((a) => a.value ?? a.description ?? '').join(' ')}`);
      }
      if (msg.method === 'Runtime.exceptionThrown') {
        this.exceptions.push(msg.params.exceptionDetails.text + ' ' + (msg.params.exceptionDetails.exception?.description ?? ''));
      }
    });
  }
  send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++this.id;
      this.pending.set(id, (msg) => (msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result)));
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  // NOTE: not JS eval() — thin wrapper around CDP Runtime.evaluate, executing
  // fixed test expressions in the automated Chrome instance (standard practice
  // for browser test harnesses; input is hardcoded in this script, never user data).
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true });
    return r.result.value;
  }
}

async function connect() {
  const wsUrl = await getWsUrl();
  const ws = new WebSocket(wsUrl, { maxPayload: 100 * 1024 * 1024 });
  await new Promise((r) => ws.on('open', r));
  const cdp = new CDP(ws);
  await cdp.send('Runtime.enable');
  await cdp.send('Page.enable');
  return { cdp, ws };
}

const results = [];
function report(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function scenarioFull(cdp) {
  // Host OS has reduced-motion enabled — force full-motion for cinematic scenarios
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  // Warm-up: first dev-server load pays Vite's on-demand compile cost, which
  // would skew the timing assertions below. Load once, then measure fresh.
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(6000);
  await cdp.eval(`sessionStorage.clear()`);
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(2500);
  const hasOverlayEarly = await cdp.eval(`!!document.querySelector('[data-intro-overlay]')`);
  report('full: overlay present early', hasOverlayEarly);

  // terminal card appears (traffic lights)
  await sleep(2000); // ~4.5s in — terminal should be mounted, boot typing underway
  const hasTerminal = await cdp.eval(`document.body.innerText.includes('boot portfolio') || document.body.innerText.includes('Terminal')`);
  report('full: terminal visible mid-sequence', hasTerminal);

  // check lifecycle reaches spinner/✔ stage
  await sleep(3500); // ~8s in — first checks should be done
  const hasCheck = await cdp.eval(`document.body.innerText.includes('✔')`);
  report('full: check marks appear', hasCheck);

  // wait for completion (terminal ~14s + pre-roll ~2.4s + exit ~1s + margin)
  await sleep(13000);
  const overlayGone = await cdp.eval(`!document.querySelector('[data-intro-overlay]')`);
  report('full: intro completed, overlay removed', overlayGone);
  const heroVisible = await cdp.eval(`!!document.getElementById('hero-name')`);
  report('full: hero name present', heroVisible);
  const scrollUnlocked = await cdp.eval(`document.body.style.overflow === '' && document.documentElement.style.overflow === ''`);
  report('full: scroll unlocked', scrollUnlocked);

  const errs = cdp.consoleMsgs.filter((m) =>
    !m.includes('Download the React DevTools') &&
    !m.includes('[vite]') &&
    // pre-existing issue in TechStackSection (TechCard missing forwardRef) — not intro scope
    !m.includes('PopChild'));
  report('full: console clean', errs.length === 0 && cdp.exceptions.length === 0,
    errs.concat(cdp.exceptions).slice(0, 5).join(' | '));
}

async function scenarioReduced(cdp) {
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
  await cdp.eval(`sessionStorage.clear()`);
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(2200);
  const overlayGone = await cdp.eval(`!document.querySelector('[data-intro-overlay]')`);
  report('reduced-motion: completed under ~2s', overlayGone);
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: '' }] });
}

async function scenarioMobile(cdp) {
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp.send('Emulation.setDeviceMetricsOverride', { width: 375, height: 720, deviceScaleFactor: 2, mobile: true });
  await cdp.eval(`sessionStorage.clear()`);
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(5200); // terminal mounted
  const fits = await cdp.eval(`(() => {
    const cards = [...document.querySelectorAll('[data-intro-overlay] *')].filter(e => getComputedStyle(e).borderRadius === '24px');
    if (!cards.length) return 'no-card';
    const r = cards[0].getBoundingClientRect();
    return r.left >= 0 && r.right <= 375 ? 'fits' : 'overflow ' + JSON.stringify({l: r.left, r: r.right});
  })()`);
  report('mobile 375px: terminal fits viewport', fits === 'fits', String(fits));
  await cdp.send('Emulation.clearDeviceMetricsOverride');
}

async function scenarioSkip(cdp) {
  await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });
  await cdp.eval(`sessionStorage.clear()`);
  await cdp.send('Page.navigate', { url: URL_APP });
  await sleep(3500); // mid-sequence
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(1200);
  const overlayGone = await cdp.eval(`!document.querySelector('[data-intro-overlay]')`);
  report('skip: ESC mid-sequence exits fast', overlayGone);
  const errs = cdp.exceptions.length;
  report('skip: no exceptions', errs === 0, cdp.exceptions.slice(0, 3).join(' | '));
}

const chrome = launchChrome();
try {
  const { cdp, ws } = await connect();
  await scenarioFull(cdp);
  await scenarioReduced(cdp);
  await scenarioMobile(cdp);
  await scenarioSkip(cdp);
  ws.close();
} catch (e) {
  console.error('HARNESS ERROR:', e.message);
  process.exitCode = 2;
} finally {
  chrome.kill();
}
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exitCode = failed ? 1 : (process.exitCode ?? 0);
