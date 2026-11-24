// @ts-check
// Guards the workbox-build glob chain used for PWA precaching.
//
// `glob@^11.0.1` is the only range workbox-build@7.4.1 accepts, and every
// published 11.x release sits inside the advisory range (9.0.0 - 14.0.1), so a
// package.json override to glob@^14 is load-bearing. If a future workbox or
// dependency bump changes those semantics, the service worker would silently
// precache the wrong set — or nothing. These tests fail loudly in that case.
import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { globSync } from 'glob';

const SW = join(process.cwd(), 'dist', 'sw.js');
const VITE_CFG = readFileSync(join(process.cwd(), 'vite.config.js'), 'utf8');

// Windows glob results use the native separator; workbox normalises with upath.
const posix = (hits) => [...hits].map((h) => h.split('\\').join('/'));

// CI runs `npm test` before `npm run build`, so the build-output assertions
// are skipped when dist/ is absent. Everything else in this file is pure and
// always runs — the dependency contract must hold regardless of build order.
const hasBuild = existsSync(SW);

describe.skipIf(!hasBuild)('PWA precache manifest (real build output)', () => {
  it('dist/sw.js exists and contains a precache manifest', () => {
    expect(existsSync(SW), 'run `npm run build` first').toBe(true);
    const sw = readFileSync(SW, 'utf8');
    const urls = [...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);
    expect(urls.length).toBeGreaterThan(20);
  });

  it('precaches the app shell but never the on-demand media folders', () => {
    const sw = readFileSync(SW, 'utf8');
    const urls = [...sw.matchAll(/url:\s*"([^"]+)"/g)].map((m) => m[1]);

    expect(urls.some((u) => u.includes('index.html'))).toBe(true);
    expect(urls.filter((u) => u.endsWith('.js')).length).toBeGreaterThan(5);
    expect(urls.some((u) => u.endsWith('.woff2'))).toBe(true);

    // globIgnores: gallery/**, projects/** stay out of precache.
    expect(urls.some((u) => u.includes('/gallery/'))).toBe(false);
    expect(urls.some((u) => u.includes('/projects/'))).toBe(false);
    expect(urls.some((u) => u.endsWith('.pdf'))).toBe(false);
  });

  it('honours the exact globIgnores list declared in vite.config.js', () => {
    const block = VITE_CFG.match(/globIgnores:\s*\[([^\]]+)\]/);
    expect(block, 'globIgnores must stay declared').toBeTruthy();
    const patterns = block[1].match(/'[^']+'/g).map((s) => s.slice(1, -1));
    expect(patterns).toContain('gallery/**');
    expect(patterns).toContain('projects/**');
    expect(patterns).toContain('**/*.pdf');
  });
});

describe('resolved glob/minimatch satisfy the workbox-build contract', () => {
  it('glob resolves to a version above the advisory ceiling', () => {
    const lock = JSON.parse(readFileSync(join(process.cwd(), 'package-lock.json'), 'utf8'));
    const globPkg = lock.packages['node_modules/glob'];
    expect(globPkg, 'glob must resolve at the top level via the override').toBeTruthy();

    const [major, minor, patch] = globPkg.version.split('.').map(Number);
    // Advisory vulnerable range is 9.0.0 - 14.0.1.
    const patched =
      major > 14 || (major === 14 && (minor > 0 || patch > 1));
    expect(patched, `glob ${globPkg.version} is still inside the vulnerable range`).toBe(true);
  });

  it('the override stays declared so npm ci reproduces the patched tree', () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg.overrides).toBeTruthy();
    expect(Object.keys(pkg.overrides)).toContain('glob@^11.0.1');
  });

  it('workbox-build still consumes glob (no silent API break)', () => {
    const src = readFileSync(
      join(process.cwd(), 'node_modules/workbox-build/build/lib/get-file-details.js'),
      'utf8'
    );
    // workbox calls globSync directly — if that import changes shape, the
    // override assumption must be re-verified.
    expect(src).toMatch(/require\("glob"\)/);
    expect(src).toMatch(/globSync\)?\(/);
  });
});

describe('glob semantics workbox depends on', () => {
  /** @type {string[]} */
  const made = [];
  afterEach(() => {
    for (const d of made) rmSync(d, { recursive: true, force: true });
    made.length = 0;
  });

  function fixture() {
    const dir = join(tmpdir(), `glob-guard-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    made.push(dir);
    const files = [
      'index.html',
      'app.js',
      'style.css',
      'media/keep.webp',
      'gallery/skip.webp',
      'projects/skip.pdf',
    ];
    for (const rel of files) {
      const full = join(dir, rel);
      mkdirSync(join(full, '..'), { recursive: true });
      writeFileSync(full, 'x');
    }
    return dir;
  }

  it('brace expansion matches the workbox globPatterns shape', () => {
    const dir = fixture();
    const hits = globSync('**/*.{js,css,html}', { cwd: dir });
    expect(posix(hits).sort()).toEqual(['app.js', 'index.html', 'style.css']);
  });

  it('ignores excluded directories the way globIgnores expects', () => {
    const dir = fixture();
    const hits = globSync('**/*.webp', { cwd: dir, ignore: ['gallery/**', 'projects/**'] });
    expect(posix(hits)).toEqual(['media/keep.webp']);
  });

  it('applies the follow/ignore options workbox passes', () => {
    const dir = fixture();
    const hits = posix(
      globSync('**/*', { cwd: dir, nodir: true, follow: true, ignore: ['gallery/**', 'projects/**'] })
    );
    expect(hits).toContain('media/keep.webp');
    expect(hits).not.toContain('gallery/skip.webp');
    expect(hits.filter((h) => h.endsWith('.css'))).toEqual(['style.css']);
  });

  it('does not throw on bracketed directory names (brace/minimatch edge case)', () => {
    const dir = fixture();
    mkdirSync(join(dir, 'a[b]'), { recursive: true });
    writeFileSync(join(dir, 'a[b]', 'x.js'), 'x');
    expect(() => globSync('**/*.js', { cwd: dir })).not.toThrow();
  });
});
