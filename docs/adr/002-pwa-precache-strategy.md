# ADR 002 — PWA Lean Precache + Runtime Caching for Gallery

## Status
Accepted

## Context
Portfolio has 89 precache entries (5106 KiB). Full-size gallery images in `public/gallery/original/**` are large (webp/avif) and viewed only on lightbox open; precaching them would force every visitor to download gallery on first load.

## Decision
Configure `VitePWA` `workbox.globIgnores: ['gallery/original/**', 'gallery/*.{jpg,png}', 'arsip/**']` and `maximumFileSizeToCacheInBytes 2MB` to keep precache lean. Gallery originals cached at runtime `CacheFirst` `gallery-originals` `maxEntries 30` `maxAge 30d` on demand. Unsplash images separate `unsplash-images` cache `maxEntries 20`.

## Alternatives Considered
- Precache all gallery — simple but wasteful (user pays cost for unseen images)
- No PWA — loses offline + installability
- Lazy CDN — adds vendor dependency without need

## Consequences
- First load precache 89 entries (5106 KiB) without gallery bloat
- Lightbox open triggers cache, subsequent opens instant
- `navigateFallback: '/'` preserves SPA routing offline

## Reference
`vite.config.js:14-87`
