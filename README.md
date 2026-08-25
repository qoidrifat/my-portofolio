# Qoid Rif'at — Portfolio

Personal portfolio website showcasing projects, skills, and experience in AI & web development. Professional-grade showcase with performance-first architecture, design system, and verifiable engineering practices.

Live: **https://qoidrifat.vercel.app** · GitHub: **https://github.com/qoidrifat**

## Why This Portfolio Exists
Demonstrates ability to build maintainable, performant, accessible web experiences and to document architectural decisions — not just "project thumbnails."

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Framer Motion 11 |
| **Routing** | React Router 6 (`/projects/:slug`, `*` 404) |
| **State / Data** | TanStack React Query 5, `lib/data.js` single source of truth |
| **Icons** | Lucide React, React Icons |
| **UI** | Radix UI (Dialog, Slot), cmdk |
| **PWA** | vite-plugin-pwa (lean precache + runtime caching) |
| **Fonts** | Inter 300-900, JetBrains Mono (self-hosted woff2) |
| **Tooling** | ESLint + jsx-a11y, jsconfig (4 strict modules), Vitest 32 tests, Husky + lint-staged |
| **CI** | GitHub Actions `ci.yml` (lint, typecheck, test, build, check:budget) |

## Architecture
- **Code splitting:** `Home.jsx` lazy + `LazySection` IntersectionObserver, `manualChunks` vendor-query/framer/icons
- **Design system:** HSL CSS vars `--accent-web/--accent-ai` + 5 `data-accent` themes (`ThemeContext`)
- **Performance:** Preload critical fonts/logo, `VitePWA` lean precache (89 entries), gallery originals runtime-cached
- **Accessibility:** skip-link, `useReducedMotion`, `aria-*`, focus management, jsx-a11y lint
- **Decisions:** `docs/adr/001-accent-theme.md`, `002-pwa-precache-strategy.md`, `003-lazy-section-architecture.md`

## Showcase — 8 Projects

| Project | Role |
|---------|------|
| **FER VGG16+SE-Block** (featured, thesis) | Researcher — 66.9% FER-2013, HF Spaces demo |
| **Agent Status** — AI observability | Architect — MCP, WebSocket, Recharts |
| **AUREX** — AI Style Intelligence | Full-stack — Laravel + FastAPI microservice |
| **CashFlow** — AI Finance | Full-stack — Vertex AI, Gmail API |
| **PayrollPro** — HR/Payroll (flagship) | Architect — 262 tests, RBAC, Pulse |
| **Explore Bali** — Travel booking | Full-stack — PHP native, 14-table MySQL |
| **SuperFood** — OFD Data Platform | Data Engineer — 4-tier, 150 tests, PG16 |
| **Next — Coming Soon** | Placeholder |

Each project has case study route `/projects/:slug` with architecture, metrics, lessons, roadmap.

## Getting Started

```bash
npm ci
npm run dev        # Vite dev server
npm run build      # Production build + generate bundle stats
npm run preview    # Preview build
npm run lint       # ESLint (quiet)
npm run typecheck  # tsc -p jsconfig.json
npm run test       # Vitest run (15 tests)
npm run test:watch # Vitest watch
```

## Project Structure

```
src/
├── components/
│   ├── portofolio/         # Section components (Hero, About, Projects...)
│   │   └── github/         # GitHub insights modules
│   └── ui/                 # Toast primitives
├── data/                   # performance-metrics.json
├── hooks/                  # useAnimatedCounter, useTiltEffect, useGithubRepos
├── lib/                    # data.js (SSoT), ThemeContext, query-clients
├── pages/                  # Home.jsx, ProjectCaseStudy.jsx
├── App.jsx                 # Routing + intro + error boundaries
├── Layout.jsx              # Navbar, scroll-spy, footer
└── index.css               # Design system + 5 accent themes
public/
├── projects/               # Optimized WebP per-project galleries
├── gallery/original/       # Photography (runtime cached)
└── fonts/                  # Inter, JetBrains Mono woff2
tests/
├── setup.js
├── smoke.test.jsx
└── portfolio.test.jsx
docs/adr/                   # Architecture Decision Records
```

## Testing
`Vitest 3` + `jsdom` + `@testing-library/react` — 32 tests across smoke, portfolio, and integration. Covers rendering, case study routing, theme cycling/validation, performance-metrics shape, ProjectVisual fallback paths, data invariants, featured-project cardinality. Run: `npm test`.

## Deployment

| Target | Status |
|--------|--------|
| Portfolio (Vercel/Cloudflare Pages) | Live — https://qoidrifat.vercel.app |
| PayrollPro flagship | Staging pending — see `docs/DEPLOYMENT.md` |
| SuperFood | Staging pending — see `docs/DEPLOYMENT.md` |
| FER | Live — https://huggingface.co/spaces/qoidrifat/demo-sidang |

SPA fallback via `vite.config.js` `navigateFallback: '/'`.

## Performance & Accessibility
- Lazy + Suspense, `SectionFallback minHeight` prevents CLS
- Reduced-motion respected globally
- **Performance budget enforced in CI**: `performance-budget.json` defines limits per resource (total JS, total CSS, largest JS/CSS chunk, bundle count); `npm run check:budget` fails CI on regression. Baseline captured 2026-08-25, derived from the verified build.
- Bundle metrics in `src/data/performance-metrics.json` (consumed by `PerformanceSection`). `scores` is intentionally named `scoresEstimated` — real Lighthouse CI is deferred until a measured baseline exists
- a11y: jsx-a11y lint at warning level, skip-link, `useReducedMotion`, ARIA dialog patterns, focus management

## Roadmap
See `CHANGELOG.md` and per-project `roadmap` in `src/lib/data.js`.

## License
MIT — see `LICENSE`.
