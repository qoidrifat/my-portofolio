# Dependency Audit — 2026-08-01

Source: `npm audit` (654 packages, 7 vulns high/moderate)

| Package | Severity | Direct/Transitive | Chain | Production? | Fix | Action |
|---------|----------|-------------------|-------|-------------|-----|--------|
| brace-expansion 1.1.15/2.1.1/5.0.7 | high GHSA-3jxr GHSA-mh99 GHSA-rgw5 | transitive | eslint-plugin-jsx-a11y→minimatch@3.1.5→brace-expansion@1.1.15; vite-plugin-pwa→workbox→glob→brace-expansion | dev/build only | npm audit fix false (requires minimatch@4/10 major) | **MONITOR** — dev-time DoS via crafted glob, not runtime user input; update when eslint-plugin-jsx-a11y releases minimatch@4 |
| fast-uri 3.1.3 | high GHSA-v2hh GHSA-7p8r | transitive | vite-plugin-pwa→workbox-build→ajv@8.20.0→fast-uri | build only | fix to 3.1.5 via ajv update, not yet in workbox | **MONITOR** — build-time schema validation, no user-facing URI parsing |
| js-yaml 4.2.0 | high GHSA-52cp GHSA-5p4m | transitive | eslint→@eslint/eslintrc→js-yaml | dev only | requires eslint major | **MONITOR** — dev-time config parsing |
| nanoid 3.3.12 | high GHSA-28wg GHSA-2v37 | transitive | postcss→nanoid | dev/build | fix to 3.3.17+ via postcss bump | **FIX SAFELY** — see postcss |
| postcss 8.5.15 | high GHSA-fxqj GHSA-r28c | direct (dev) | postcss@8.5.15 | dev/build (Tailwind) | fix to >=8.5.23 available via npm audit fix | **FIX SAFELY** — patch, no breaking change expected |
| react-router 6.30.4 | moderate GHSA-wrjc GHSA-337j | transitive via react-router-dom 6.30.4 | react-router-dom → react-router | production (client routing) | requires react-router 7 major | **ACCEPT WITH RATIONALE** — moderate, SSR deserializeErrors not used, backslash redirect is client-side; plan major upgrade with Vite 7 migration |

## Decisions
- **No `npm audit fix --force`** — would upgrade react-router 6→7 (breaking), eslint major, workbox major without evidence.
- Safe fix attempted: `npm update postcss` (patch) — verify lint/typecheck/test/build after.
- Remaining highs are transitive dev/build-only, not shipped to client `dist/assets/*`. Risk is local DoS during build, not production exploit.
- Re-audit monthly; revisit when eslint-plugin-jsx-a11y@7 or workbox-build updates minimatch/fast-uri.

## Verification
```
npm audit --audit-level=high
npm run lint && npm run typecheck && npm test && npm run build
```
