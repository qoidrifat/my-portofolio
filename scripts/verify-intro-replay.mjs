/* Verify intro replays on every refresh (no session gating). */
import { execFile } from 'node:child_process';
import WebSocket from 'ws';
import http from 'node:http';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9335;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = execFile(CHROME, [
  `--remote-debugging-port=${PORT}`, '--headless=new', '--disable-gpu', '--no-first-run',
  '--user-data-dir=' + process.env.TEMP + '/chrome-replay-test-' + Date.now(), 'about:blank',
]);

const wsUrl = await new Promise((resolve, reject) => {
  let tries = 0;
  const poll = () => http.get(`http://127.0.0.1:${PORT}/json/list`, (res) => {
    let d = ''; res.on('data', (c) => d += c);
    res.on('end', () => {
      try { resolve(JSON.parse(d).find((t) => t.type === 'page').webSocketDebuggerUrl); }
      catch { if (++tries > 40) reject(new Error('CDP not ready')); else setTimeout(poll, 250); }
    });
  }).on('error', () => { if (++tries > 40) reject(new Error('CDP not ready')); else setTimeout(poll, 250); });
  poll();
});

const ws = new WebSocket(wsUrl);
await new Promise((r) => ws.on('open', r));
let id = 0; const pending = new Map();
ws.on('message', (raw) => {
  const m = JSON.parse(raw);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const send = (method, params = {}) => new Promise((res, rej) => {
  const i = ++id; pending.set(i, (m) => m.error ? rej(new Error(m.error.message)) : res(m.result));
  ws.send(JSON.stringify({ id: i, method, params }));
});
// CDP Runtime.evaluate wrapper — fixed test expressions only, not JS eval()
const evl = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true })).result.value;

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }] });

let pass = 0, fail = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
  ok ? pass++ : fail++;
};

// Visit 1: full run to completion (session flag gets written)
await send('Page.navigate', { url: 'http://localhost:5199/' });
await sleep(1500);
check('visit 1: intro overlay shows', await evl(`!!document.querySelector('[data-intro-overlay]')`));
await sleep(11000);
check('visit 1: intro completes', await evl(`!document.querySelector('[data-intro-overlay]')`));
const flag = await evl(`sessionStorage.getItem('qr-intro-played')`);
check('visit 1: session flag written', flag === '1', `flag=${flag}`);

// Visit 2: refresh — intro must play AGAIN despite flag
await send('Page.navigate', { url: 'http://localhost:5199/' });
await sleep(1500);
check('visit 2 (refresh): intro replays', await evl(`!!document.querySelector('[data-intro-overlay]')`));

console.log(`\n${pass}/${pass + fail} passed`);
ws.close(); chrome.kill();
process.exitCode = fail ? 1 : 0;
