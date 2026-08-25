# Dependency Audit — 2026-08-25 (Phase 4)

Source: `npm audit` (857 packages)

## Phase 3 → Phase 4 delta

| | Phase 3 (2026-08-01) | Phase 4 (2026-08-25) |
|---|---|---|
| Total vulns | 7 (5 high, 2 moderate) | **2 (0 high, 2 moderate)** |
| Action taken | `npm audit fix` deferred — required breaking changes | `npm audit fix` (no --force) applied safely |

## Phase 4 current state

| Package | Severity | Direct/Transitive | Chain | Production? | Action |
|---------|----------|-------------------|-------|-------------|--------|
| react-router 6.x | moderate GHSA-wrjc GHSA-337j | transitive via react-router-dom 6.x | react-router-dom → react-router | production (client routing) | **ACCEPT WITH RATIONALE** — moderate, fix requires `react-router-dom@7` major (breaking). Not exploited in this app: (a) no SSR/hydration path so `deserializeErrors` is never reached, (b) backslash redirect only affects user-controlled internal `<Link>` toString; the codebase uses hard-coded `/projects/:slug` and `<Link to="/">` patterns with no attacker-controlled path input. Track in Phase 5. |

## Resolved in Phase 4 (`npm audit fix` without --force)

| Package | Was | Now | Rationale |
|---------|-----|-----|-----------|
| brace-expansion | 1.1.15, 2.1.1, 5.0.7 (high) | 1.1.18, 2.1.4, 5.0.9 | patch update via `npm audit fix` |
| fast-uri | 3.1.3 (high) | 3.1.6 | patch via ajv transitive update |
| js-yaml | 4.2.0 (high) | 4.2.2 | patch via eslint transitive update |
| nanoid | 3.3.17 (high) | 3.3.11 safe (transitively updated) | via postcss bump |
| postcss | 8.5.x (high) | 8.5.23+ | patch via `npm audit fix` |

## Verification
After audit fix: `npm run lint && npm run typecheck && npm test && npm run build && npm run check:budget` all PASS.
32/32 tests pass. No regressions in the production bundle.

## Next audit
Re-run monthly or when:
- A new major react-router release allows incremental migration path
- `npm` reports new advisories matching dependencies in the lockfile

