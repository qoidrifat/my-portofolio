# ADR 003 — LazySection + Suspense for Below-the-Fold Sections

## Status
Accepted

## Context
Home has 8 sections (About, Journey, Projects, Skills, Gallery, GitHub, Contact + Hero). Rendering all at once increases TTI and bundle execution; code-splitting per section reduces initial JS (main 396KB + chunks).

## Decision
Wrap each below-the-fold section in `LazySection` (`IntersectionObserver` `rootMargin threshold px` one-shot) + React `lazy()` + `Suspense` fallback `SectionFallback minHeight` stable spacer. `prefers-reduced-motion` bypasses observer (mount immediately). Entrance animation in `Layout.jsx`/`App.jsx` uses only `opacity` (never `transform/filter`) to avoid containing-block trap for `position:fixed` descendants (navbar, modal, lightbox).

## Alternatives Considered
- Single bundle — simpler but heavier TTI
- Route-based splitting only — insufficient; sections are same route
- `loading="lazy"` only — covers images, not JS

## Consequences
- Initial chunks: 7 lazy chunks (6-35KB each gzipped) loaded on proximity
- `minHeight` placeholders prevent anchor offset drift and CLS
- Reduced-motion users get immediate content

## Reference
`src/pages/Home.jsx`, `src/components/LazySection.jsx`, `src/Layout.jsx:17-29`, `vite.config.js:94-110 manualChunks`
