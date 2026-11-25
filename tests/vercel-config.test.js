// @ts-check
// Guards the SPA rewrite in vercel.json.
//
// A /projects/:slug route and a /projects/<name>/cover.webp asset share a path
// prefix. The rewrite's negative lookahead previously excluded the whole
// `projects/` prefix, so deep links returned Vercel's 404 instead of index.html.
// That shipped unnoticed because the local harness never requested a SPA route
// from a static server using Vercel's rewrite semantics.
//
// Vercel evaluates rewrites only after a filesystem check, so real files are
// already safe; the lookahead exists for paths that must never be rewritten
// even when a file is missing.
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const cfg = JSON.parse(readFileSync(join(process.cwd(), 'vercel.json'), 'utf8'));
const rewrite = cfg.rewrites?.[0];
// source looks like /((?!a/|b/|c).*)$ — strip the group and the leading `?!`
const lookahead = rewrite.source.match(/^\/\(\((.*)\)\.\*\)$/)?.[1].replace(/^\?!/, '') ?? '';
const alternatives = lookahead.split('|').filter(Boolean);

/** Mirror Vercel's prefix test for one negative-lookahead alternative. */
function isExcluded(pathname) {
  const rest = pathname.replace(/^\//, '');
  return alternatives.some((alt) => {
    try {
      return new RegExp('^' + alt).test(rest);
    } catch {
      return false;
    }
  });
}

describe('vercel.json SPA rewrite', () => {
  it('rewrites SPA routes to index.html', () => {
    for (const route of ['/', '/projects/payrollpro', '/projects/explore-bali', '/nonexistent-xyz']) {
      expect(isExcluded(route), `${route} must fall through to index.html`).toBe(false);
    }
  });

  it('never rewrites hashed assets', () => {
    for (const asset of ['/assets/index-abc123.js', '/assets/index-abc123.css']) {
      expect(isExcluded(asset), `${asset} must not be rewritten`).toBe(true);
    }
  });

  it('never rewrites files under projects/ and gallery/', () => {
    for (const file of [
      '/projects/payrollpro/cover.webp',
      '/projects/explore-bali/about.avif',
      '/gallery/thumb-cafe.webp',
    ]) {
      expect(isExcluded(file), `${file} must not be rewritten`).toBe(true);
    }
  });

  it('never rewrites PWA and metadata files', () => {
    for (const file of ['/sw.js', '/manifest.webmanifest', '/robots.txt', '/sitemap.xml', '/registerSW.js']) {
      expect(isExcluded(file), `${file} must not be rewritten`).toBe(true);
    }
  });

  it('never rewrites fonts, icons, images or the CV', () => {
    for (const file of [
      '/fonts/inter/Inter-normal-400.woff2',
      '/icon-192.png',
      '/profile.webp',
      '/og-image.png',
      '/Qoid-Rifat-CV.pdf',
    ]) {
      expect(isExcluded(file), `${file} must not be rewritten`).toBe(true);
    }
  });

  it('keeps the projects/ exclusion scoped to file paths, not the whole prefix', () => {
    // The exact regression: a bare `projects/` alternative swallowed every
    // /projects/:slug deep link.
    expect(alternatives).not.toContain('projects/');
    expect(alternatives).not.toContain('gallery/');
    expect(alternatives.some((a) => a.startsWith('projects/'))).toBe(true);
    expect(alternatives.some((a) => a.startsWith('gallery/'))).toBe(true);
  });

  it('declares the eight security headers and no includeSubDomains', () => {
    const keys = cfg.headers.flatMap((b) => b.headers.map((h) => h.key));
    for (const h of [
      'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options',
      'Referrer-Policy', 'Permissions-Policy', 'Strict-Transport-Security',
      'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy',
    ]) {
      expect(keys).toContain(h);
    }
    const hsts = cfg.headers
      .flatMap((b) => b.headers)
      .find((h) => h.key === 'Strict-Transport-Security').value;
    expect(hsts).toBe('max-age=63072000');
    expect(hsts).not.toMatch(/includeSubDomains|preload/);
  });
});
