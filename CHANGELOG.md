# Changelog

All notable changes to this project are documented here.

## [Unreleased] — Phase 4 Engineering Excellence
### Added
- `performance-budget.json` (committed budget) + `scripts/check-budget.mjs` (enforced in CI)
- `npm run check:budget` script and CI workflow step
- Performance governance: bundle hashes stripped from `performance-metrics.json` (commit-noise fix, sizes remain canonical)
- Tests: 22 → 32 (10 new). New regression vectors: theme setTheme/cycleTheme behavior, theme id validation, 404 back-link SPA safety, performance-metrics shape and sort order, featured-project cardinality, ProjectVisual placeholder vs real-render paths
- Strict type checking (`// @ts-check` + JSDoc) extended to `src/hooks/useAnimatedCounter.js` and `src/hooks/useTiltEffect.js` (2 → 4 strict modules)
- 8 lint suppressions added with explanatory WHY comments (true positives: ARIA dialog autoFocus, modal backdrop dismiss regions, lightbox close autoFocus; intentional patterns: tilt-card pointer decoration)
- `docs/security/DEPENDENCY-AUDIT.md` re-audited for Phase 4

### Changed
- `scripts/generate-stats.mjs`: strip Vite content hashes from committed bundle names; rename `scores` → `scoresEstimated` to make the heuristic nature explicit
- `src/components/portofolio/PerformanceSection.jsx`: consumes `scoresEstimated`; UI already labels the numbers as estimates
- `src/pages/ProjectCaseStudy.jsx`: removed dead `useState` + `useNavigate` import (state was unreachable; image fallback is handled by `ProjectVisual` internally)
- `package.json`: `check:budget` script

### Fixed
- `src/components/CommandPalette.jsx`, `PortfolioIntro.jsx`, `TerminalEasterEgg.jsx`, `GallerySection.jsx`, `ProjectSection.jsx`: a11y warnings reduced from 14 to 0 with documented, intentional suppressions; no global rule disable

### Deferred
- **Lighthouse CI**: requires a real measured baseline before thresholds can be defined. The `scoresEstimated` field documents the limitation. Path forward is `@lhci/cli` in CI against `vite preview`, then define budget from the first measured run.

### Verified locally
- `npm run lint` → 0 errors, 0 warnings
- `npm run typecheck` → PASS
- `npm test` → 32/32
- `npm run build` → PASS
- `npm run check:budget` → PASS
- Fresh `npm ci` in clean clone → PASS (full pipeline)

## [0.0.0] - 2026-08-15 — Phase 3
- Husky Option A, dependency audit documented, `@ts-check` enabled on SSoT (`src/lib/data.js`) and `useGithubRepos.js`, 22 tests, CI concurrency, deployment checklist

