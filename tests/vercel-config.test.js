// @ts-check
// Guards the SPA rewrite in vercel.json.
//
// Two separate bugs produced the same symptom — /projects/:slug returned
// Vercel's 404 — and both are pinned here:
//
//  1. The rewrite used a nested negative lookahead
//     `/((?!assets/|projects/|...).*)`. Vercel compiles `source` with
//     path-to-regexp, not raw regex, so that pattern never matched: even
//     /contact returned 404. Confirmed on the deployed edge.
//  2. public/projects/<slug>/ existed as a real directory, so with cleanUrls on
//     Vercel treated /projects/<slug> as a filesystem resource and 404'd.
//     Assets now live under public/media/.
//
// The rewrite is now a plain catch-all. Vercel serves existing files before
// applying rewrites, so a catch-all cannot shadow assets.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cfg = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
const rewrite = cfg.rewrites?.[0];

describe('vercel.json SPA rewrite', () => {
  it('is a catch-all with no negative lookahead', () => {
    expect(rewrite).toBeTruthy();
    expect(rewrite.source).toBe('/(.*)');
    expect(rewrite.destination).toBe('/index.html');
    // A lookahead here is compiled by path-to-regexp and silently matches
    // nothing, which is exactly the failure this test exists to prevent.
    expect(rewrite.source).not.toMatch(/\(\?!/);
  });

  it('declares exactly one rewrite so behaviour cannot drift per route', () => {
    expect(cfg.rewrites).toHaveLength(1);
  });

  it('never sets cleanUrls', () => {
    // cleanUrls makes Vercel 308-redirect /index.html to /, which breaks a
    // rewrite whose destination is /index.html. Symptom on the deployed edge:
    // / returned 200 while every other path returned 404.
    expect(cfg.cleanUrls).toBeUndefined();
  });
});

describe('project assets no longer collide with the route prefix', () => {
  it('references only /media/ for screenshots, never /projects/', () => {
    const data = readFileSync(join(process.cwd(), 'src', 'lib', 'projects-data.js'), 'utf8');
    const stale = data.match(/'\/projects\/[^']*'/g) || [];
    expect(stale, 'project assets must not be served from /projects/').toEqual([]);
    expect(data).toMatch(/'\/media\//);
  });

  it('the built output has no projects/ directory that could shadow the route', async () => {
    const { existsSync } = await import('node:fs');
    const dist = join(process.cwd(), 'dist');
    if (!existsSync(dist)) return; // build not run yet
    expect(existsSync(join(dist, 'projects'))).toBe(false);
    expect(existsSync(join(dist, 'media'))).toBe(true);
  });
});

describe('security headers', () => {
  it('declares the eight expected headers', () => {
    const keys = cfg.headers.flatMap((b) => b.headers.map((h) => h.key));
    for (const h of [
      'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options',
      'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security',
      'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy',
    ]) {
      expect(keys).toContain(h);
    }
  });

  it('keeps HSTS without includeSubDomains or preload', () => {
    const hsts = cfg.headers
      .flatMap((b) => b.headers)
      .find((h) => h.key === 'Strict-Transport-Security').value;
    expect(hsts).toBe('max-age=63072000');
    expect(hsts).not.toMatch(/includeSubDomains|preload/);
  });

  it('never uses unsafe-eval and never allows inline script', () => {
    const csp = cfg.headers
      .flatMap((b) => b.headers)
      .find((h) => h.key === 'Content-Security-Policy').value;
    expect(csp).not.toMatch(/unsafe-eval/);
    const scriptSrc = csp.split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '));
    expect(scriptSrc).not.toMatch(/unsafe-inline/);
    expect(scriptSrc).toContain("'self'");
  });
});
