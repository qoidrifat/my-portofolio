# Changelog

All notable changes to this project are documented here.

## [Unreleased]
### Added
- Vitest + Testing Library smoke and portfolio tests (15 tests)
- CI workflow `.github/workflows/ci.yml` (lint, typecheck, test, build)
- `eslint-plugin-jsx-a11y` with warning level
- Architecture Decision Records `docs/adr/001-003`
- LICENSE (MIT), CHANGELOG
- Husky + lint-staged pre-commit hook
- `npm run test`, `test:watch`, `test:coverage`

### Changed
- `jsconfig.json` broadened to `src/**/*.js` + `src/**/*.jsx`, `checkJs: false` incremental strategy (strict per-module next)
- `eslint.config.js` now covers `src/**/*.{js,jsx}` with jsx-a11y
- `vite.config.js` adds `test` config for Vitest

## [0.0.0] - 2026-07-31
- Prior history in `git log` — features, PWA, theme system, project galleries

