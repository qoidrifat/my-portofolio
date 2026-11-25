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

  it('never rewrites files under media/ and gallery/', () => {
    for (const file of [
      '/media/payrollpro/cover.webp',
      '/media/explore-bali/about.avif',
      '/gallery/thumb-cafe.webp',
    ]) {
      expect(isExcluded(file), `${file} must not be rewritten`).toBe(true);
    }
  });

  it('keeps project screenshot assets out of the /projects/:slug path', () => {
    // A directory public/projects/payrollpro/ shadows the SPA route
    // /projects/payrollpro once cleanUrls is on: Vercel treats it as a
    // filesystem resource and 404s because there is no index.html inside.
    // Assets therefore live under /media/.
    const pkg = JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8'));
    expect(pkg).toBeTruthy();
    const data = readFileSync(join(process.cwd(), 'src', 'lib', 'projects-data.js'), 'utf8');
    const stale = data.match(/'\/projects\/[^']*'/g) || [];
    expect(stale, 'project assets must not be referenced from /projects/').toEqual([]);
    expect(data).toMatch(/'\/media\//);
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

  it('does not exclude the /projects/ prefix at all', () => {
    // Two separate causes of the same 404, both pinned here:
    //  1. a bare `projects/` lookahead swallowed every /projects/:slug link;
    //  2. a real dist/projects/<slug>/ directory made Vercel treat the path as
    //     a filesystem resource under cleanUrls.
    // Assets moved to /media/, so nothing may reference the route prefix.
    expect(alternatives.some((a) => a.startsWith('projects'))).toBe(false);
    expect(alternatives.some((a) => a.startsWith('media/'))).toBe(true);
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
