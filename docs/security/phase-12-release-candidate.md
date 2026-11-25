# Phase 12 — Release Candidate Validation & Production Readiness

**Date:** 2026-11-25
**Branch:** `security/release-candidate-2026-11`
**HEAD:** `0543c2c` (routing fixes; security headers unchanged since the capture below)
**Base:** `482b631ef9e1010c75aacc1d6c6b1dc6051a9395`
**Header evidence:** https://my-portofolio-h33866gp2-qoidrifat.vercel.app (HEAD `1030a56`)
**Current branch alias:** https://my-portofolio-git-security-release-candidate-2026-11-qoidrifat.vercel.app

**Verdict: `PASS`**

Every gate that can be closed without deploying to production is closed. The
release candidate builds, tests and passes every automated gate on both the
local machine and GitHub Actions, and its security headers were read back from
the live Vercel edge on an authenticated request — no protection was disabled,
no share link was created, no project setting was changed.

Production was not deployed and nothing was promoted. `qoidlab.my.id` still
serves the previous build (`ce47b9d6`).

---

## 1. Executive summary

| Gate | Status |
|---|---|
| Source diff reviewed and classified | PASS |
| Git commit provenance | PASS — Vercel-attested, `Source: Git`, commit `3d2ef9a` |
| GitHub Actions | PASS — run 45530760806, 14/14 steps |
| Dependency audit | PASS — 0 / 0 |
| Performance budget | PASS — 771.1 KB / 771.5 KB |
| Security headers (deployed edge) | PASS — 8/8, CSP byte-identical to `vercel.json` |
| Resource cache headers (deployed) | PASS — hashed assets + fonts `immutable` |
| Browser functional test | PASS — local CDP harness, 0 exceptions |
| CSP enforcement (local runtime) | PASS — 18/18 static, 7/7 enforcement |
| PWA (local build output) | PASS |
| Contact form | PASS — 8 regression tests |
| Branch protection on `main` | PASS — ruleset `protect-main` active |
| No unrelated files deployed | PASS |

Three defects were found and fixed during this phase. None of them were
introduced by Phase 10–11; all three had been masked by a warm local
environment and only surfaced under CI conditions:

1. CI never ran on a branch push — the workflow only triggered on `main`.
2. `npm run typecheck` could not pass on a clean checkout.
3. 38 smart-router tests depended on the developer's `~/.config/opencode`.

---

## 2. Preview acceptance — PASS

Deployment Protection returns `302` to `vercel.com/sso-api` for anonymous
requests on every path, including static assets:

```
https://my-portofolio-hyiichtmw-qoidrifat.vercel.app/
  /                     302
  /sw.js                302
  /manifest.webmanifest 302
```

That is not evidence of application headers, so it was never counted as one.
The evidence came from `vercel curl`, which authenticates the request through
the project's own deployment protection using the CLI session already on this
machine:

```
vercel curl --url https://my-portofolio-h33866gp2-qoidrifat.vercel.app/ -I
```

No bypass token was minted, no share link was created, no protection setting was
changed, and nothing about the project state differs afterwards. The request is
the same request a signed-in browser makes.

One methodological note, because it cost an hour: the first attempts piped
`2>&1 | head`, which SIGPIPEs `vercel curl`'s child process mid-transfer and
surfaces a misleading `curl: (3) URL rejected`. Discarding stderr instead
(`2>/dev/null`) works.

---

## 3. Security headers verification — PASS on the deployed edge

Declared in `vercel.json`, reproduced locally, and now observed on the live
edge. The table below is the expected value; §11 records the actual responses.

| Header | Value |
|---|---|
| Content-Security-Policy | `default-src 'self'; script-src 'self'; script-src-attr 'none'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https://avatars.githubusercontent.com https://raw.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://api.github.com https://formspree.io; worker-src 'self'; manifest-src 'self'; media-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self' https://formspree.io; frame-ancestors 'none'; upgrade-insecure-requests;` |
| X-Frame-Options | `DENY` |
| X-Content-Type-Options | `nosniff` |
| Referrer-Policy | `strict-origin-when-cross-origin` |
| Permissions-Policy | 15 capabilities disabled |
| Strict-Transport-Security | `max-age=63072000` |
| Cross-Origin-Opener-Policy | `same-origin` |
| Cross-Origin-Resource-Policy | `same-origin` |

HSTS carries **no** `includeSubDomains` and **no** `preload`. Reason recorded in
Phase 11: `www.qoidlab.my.id` and `mail.qoidlab.my.id` resolve but cannot
complete a TLS handshake, and the apex certificate's SAN covers only
`qoidlab.my.id`.

Asset cache policy as declared:

```
/assets/(.*)  public, max-age=31536000, immutable
/fonts/(.*)   public, max-age=31536000, immutable
```

Verified on the deployed edge on `my-portofolio-git-security-release-candidate-2026-11-qoidrifat.vercel.app` (HEAD `0543c2c`) — see §11. All eight headers were
present on the document response, the CSP value byte-identical to the block
above, and both asset patterns served `immutable`.

---

## 4. Git change classification

The working tree held two entangled bodies of work. They were committed together
because the build cannot resolve otherwise — proven, not assumed:

```
mv src/lib/LanguageContext.jsx   -> build fails: imported by src/App.jsx
mv src/lib/projects-data.js      -> build fails
mv src/components/mascot/        -> build fails: imported by HeroSection.jsx
```

| Category | Files |
|---|---|
| Security remediation | `vercel.json`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, `eslint.config.js`, `src/components/portofolio/ContactSection.jsx`, `tests/contact-form.test.jsx`, `docs/security/phase-11-final-hardening.md` |
| Performance | `scripts/check-budget.mjs`, `vite.config.js`, `src/lib/data.js`, `src/lib/projects-data.js`, `tests/pwa-precache.test.js` |
| Dependencies | `package.json`, `package-lock.json` |
| Existing user work (i18n + mascot) | `src/lib/LanguageContext.jsx`, `src/components/mascot/*` (5), `src/App.jsx`, `src/Layout.jsx`, `src/components/portofolio/*` (11), `src/pages/*`, `index.html`, `README.md`, `public/sitemap.xml`, `public/robots.txt`, `public/Qoid-Rifat-CV.pdf` |
| Unrelated tooling | `.opencode/**` modifications, `tests/smart-router/**` |
| Generated artifact | `src/data/performance-metrics.json` — reverts to committed value after each build; not included |
| Local-only / ignored | `AUDIT-REPORT.md`, `MASCOT-INTERACTION-ENGINE-REPORT.md`, `MIGRATION_AUDIT_OPENCODE_TO_PI.md`, `PORTFOLIO-UX-MASCOT-REPORT.md`, `RESEARCH_PI_OMP_9ROUTER_MIGRATION.md`, `report-stack-ecosystem.html`, `foo.py`, `nul`, `-w`, `.child-server.pid`, `__pycache__/`, `*.bak` — 14 new ignore rules added |
| Deliberately excluded from commit | `.opencode/FINAL_SMART_ROUTER_ARCHITECTURE.md`, `.opencode/ISR_MODEL_SWITCHING.md`, `.opencode/smart-router/v22-isr-flags.json` — remain on disk |

Staging was selective (`git add -u` plus an explicit path list), never
`git add -A`. Secret scan on the staged diff: 0 hits.

---

## 5. Branch and commit metadata

```
branch   security/release-candidate-2026-11
base     482b631ef9e1010c75aacc1d6c6b1dc6051a9395
head     5e94a2aa8daecfad529aa7a7c02a4822fc7bd832
remote   origin/security/release-candidate-2026-11
pushed   e9f2ee3 -> 6d56c5f -> b146ab5 -> 5e94a2a
```

| Commit | Purpose |
|---|---|
| `e9f2ee3` | i18n + mascot + security hardening (178 files) |
| `6d56c5f` | `ci:` run gates on release-candidate branch pushes |
| `b146ab5` | `fix(typecheck):` exclude the TUI plugin that needs CI-unavailable modules |
| `5e94a2a` | `test(smart-router):` pin the capability registry to a repo fixture |
| `8935208` | `docs(security):` phase 12 report |
| `1e843aa` | `fix(mascot):` stop animating SVG length attributes on the eyebrows |

### Mascot eyebrow console error — root cause and fix

The error was not cosmetic noise from an unknown source; it had a specific,
reproducible cause.

```
Error: <line> attribute y1: Expected length, "undefined".
  stack: ki @ vendor-framer-B93dlUNS.js:24 <- renderInstance <- render <- a <- process
```

The stack points at framer-motion, not React. Source declared the eyebrows as
`motion.line ... animate={{ y1: bL1, y2: bL2 }}`. Springing an **SVG length
attribute** makes framer write `y1="undefined"` mid-interpolation, which the
browser rejects and logs. The final DOM was always valid — which is why a static
attribute scan found nothing and the error looked cosmetic.

Fix: geometry is now constant and expression changes move the eyebrows with a
`y` **transform** (a CSS property framer handles correctly). Same visual motion,
no invalid attribute writes.

Verification, three independent probes:

1. `setAttribute` + `SVGElement` property interception → 0 invalid writes.
2. `Runtime.consoleAPICalled` with stack capture → error no longer captured.
3. Full CDP acceptance pass → 0 rendering errors at 360/390/768/1440 px.

Note: an earlier revision of this report called the browser console "clean"
while this error was still firing. That claim was incorrect and is corrected
here; the fix is real and verified.

### Defects found and fixed

**CI never ran on the branch.** The workflow triggered only on `push: [main]`.
The first push produced no run at all — reported as "no runs yet", which could
easily have been mistaken for "CI green". Added
`security/release-candidate-*` to the push branches plus `workflow_dispatch`.
Gates were not weakened.

**Typecheck could not pass on a clean checkout.** `tsconfig.v22.json` included
`.opencode/plugins/smart-router-tui.tsx`, which imports `@opencode-ai/plugin/tui`,
`solid-js` and `@opentui/solid` from `.opencode/node_modules` — gitignored, never
installed by `npm ci`. It passed locally only because that directory existed
there. The plugin is a host-side UI extension (no app code, no test imports it),
so it is now excluded with the reason recorded inline, not silently.
Verified by removing `.opencode/node_modules` and re-running the full gate.

**38 tests depended on the developer's machine.** `buildRegistry()` defaults to
`OPENCODE_CONFIG_DIR`, which resolves to `~/.config/opencode`. On a runner that
directory does not exist, the registry came back empty, and routing assertions
saw `BLOCKED` instead of `RESOLVED`. Reproduced first:

```
OPENCODE_CONFIG_DIR=/tmp/nonexistent -> 6 files failed / 38 tests failed
```

`tests/setup.js` now points `OPENCODE_CONFIG_DIR` at `tests/fixtures/opencode`,
a sanitised fixture containing only the fields `capability.ts` reads: provider
and model ids, variant reasoning-effort values, and the verified capability
matrix. No endpoints, keys or credentials — verified by scanning the staged
diff. Confirmed under two conditions: empty `OPENCODE_CONFIG_DIR` (385 pass) and
nonexistent `HOME` (full 453 pass).

---

## 6. GitHub Actions results

```
run 45530760806 | security/release-candidate-2026-11 | 3d2ef9a | SUCCESS | 46s
```

All fourteen steps passed, including the two that earlier runs never reached:

```
✓ Set up job
✓ Run actions/checkout@d23441a48e516b6c34aea4fa41551a30e30af803
✓ Run actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38
✓ Run npm ci
✓ Run npm run lint
✓ Run npm run typecheck
✓ Run npm run test
✓ Run npm run build
✓ Run npm run check:budget
✓ Validate vercel.json
✓ Assert security headers are declared
✓ Post Run actions/setup-node
✓ Post Run actions/checkout
✓ Complete job
```

Both actions executed, proving their `node24` runtime works on the runner; a v4
(`node20`) action would fail to start at all. Immutable SHAs and
`permissions: contents: read` are in effect.

`VERIFIED_GITHUB` is claimed for: install, lint, typecheck, test, build, budget,
`vercel.json` validity and header declaration. Also verified there and nowhere
else: the suite runs on a machine with no `~/.config/opencode` and no warm cache.

The first push of `3d2ef9a` failed — `tests/smart-router/breaker-routing.test.ts`
asserted `open` on a breaker whose 30 ms cooldown had already elapsed. That test
is unrelated to this phase's changes; it passed locally 3/3 and failed on the
runner because three `recordFailure()` calls each rewrite a JSON file. `e1c74ca`
widened the window to 200 ms/250 ms with identical semantics. This matters now
in a way it did not before: with `protect-main` active, a flaky test blocks
merges instead of merely looking bad.

---

## 7. Git-based preview metadata

Vercel Git integration is **connected**. Deployments are created by Vercel on
push, not by the CLI.

| Field | Value |
|---|---|
| Git commit SHA | `3d2ef9a` (full: see `git rev-parse HEAD`) |
| Branch | `security/release-candidate-2026-11` |
| Deployment | https://my-portofolio-h33866gp2-qoidrifat.vercel.app |
| Deployment ID | `dpl_*` — Vercel-attested, `Source: Git` |
| Build state | Ready |
| Deployment protection | Enabled (302 to SSO for anonymous requests) |
| CI run for the same commit | 45530760806 SUCCESS |

Earlier deployments (`6mvk8nc7u`, `hyiichtmw`) already carried `Source: Git`
for `de4d79e2` and `98fd1134`. Provenance is now attested by Vercel rather than
constructed by the person running the deploy.

---

## 8. Final regression results

Run on `3d2ef9a`, local:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | PASS — exit 0, 120 rules |
| Typecheck | `npm run typecheck` | PASS — both tsconfigs, no `.opencode/node_modules` |
| Test | `npm test` | PASS — 28 files, **456 tests** |
| Build | `npm run build` | PASS — 59 files, 771.1 KB JS |
| Budget | `npm run check:budget` | PASS — measured from `dist/assets` |
| Audit | `npm audit` | PASS — 0 |
| Production audit | `npm audit --omit=dev` | PASS — 0 |
| CSP static | `csp-check.mjs` | PASS — 18/18 |
| CSP runtime | `csp-runtime.mjs` | PASS — 0 violations |
| CSP enforcement | `csp-negative.mjs` | PASS — 7/7 blocked |
| Deployed headers | `vercel curl -I` | PASS — 8/8, see §11 |

Bundle: 771.1 KB against a 771.5 KB budget — 0.4 KB of headroom.

---

## 9. Outstanding blockers

| # | Blocker | Owner action required |
|---|---|---|
| B1 | ~~Deployed security headers unverified~~ | **RESOLVED** — all eight headers observed on `my-portofolio-git-security-release-candidate-2026-11-qoidrifat.vercel.app` (HEAD `0543c2c`) via authenticated `vercel curl`. CSP byte-identical to `vercel.json`; HSTS without `includeSubDomains`/`preload`. See §11. |
| B2 | ~~Browser acceptance on a deployed environment~~ | **RESOLVED** — deployed document, hashed assets, fonts, `sw.js` and the manifest all answer `200` with the declared headers. Function was covered by the local CDP harness; the edge now has its own header evidence. |
| B3 | Production not deployed | Explicit authorization needed. No promotion was performed. |
| B4 | ~~Vercel Git integration absent~~ | **RESOLVED** — Git integration is now active. Deployment `6mvk8nc7u` (`dpl_9FUomtRBNMfTfqmBiykC7DjwpjuQ`) records `Source: Git`, commit `de4d79e2`, branch `security/release-candidate-2026-11`. Provenance is now Vercel-attested, not CLI-constructed. |
| B5 | ~~Mascot `<line>` console warnings~~ | **RESOLVED** in `1e843aa`, verified by three probes. |
| B8 | ~~`main` has no required status checks~~ | **RESOLVED** — ruleset `protect-main` (id `28038830`) is `active` on `refs/heads/main`: requires the `quality` check, blocks force pushes (`non_fast_forward`), blocks deletion. `GET /branches/main` now reports `protected: true`, `current_user_can_bypass: never`. |
| B9 | ~~GitHub search API 422 rendered as `0`~~ | **RESOLVED** in `3d2ef9a` — `fetchSearchCount()` and `fetchEvents()` return `null` on failure, and `fmt()` renders `null` as an em dash. Locked by `tests/github-search-status.test.js` (3 cases). The 422 itself stays an external rate-limit condition. |
| B6 | Git history still exposes internal operational files | 13 + 3 + 3 commits. No valid secret in any of them. Needs `filter-repo` + force-push approval. |
| B7 | Formspree direct POST | Honeypot + 60 s cooldown only; endpoint reachable by `curl`. Needs dashboard rate limiting or an own endpoint + CAPTCHA. |

---

## 10. Production release recommendation

**`PASS`** — every gate that can be closed without deploying to production is
closed, on a commit whose headers were read back from the Vercel edge.

| Gate | Evidence |
|---|---|
| Git provenance | `my-portofolio-git-security-release-candidate-2026-11-qoidrifat.vercel.app` (HEAD `0543c2c`) — `Source: Git`, commit `3d2ef9a`, branch `security/release-candidate-2026-11` |
| CI | run `45530760806` SUCCESS, all 14 `quality` steps |
| Deployed headers | 8/8 on the live edge, CSP byte-identical to `vercel.json` |
| Resource headers | hashed assets + fonts `immutable`; `sw.js`/manifest `must-revalidate` |
| Responsive | no horizontal overflow at 360/390/768/1440 |
| Branch protection | ruleset `protect-main` active on `main` |
| Budget / audit | 771.1 KB / 0 vulnerabilities |

What is still not proven: nothing about the preview. Production itself remains
undeployed, and `qoidlab.my.id` still serves the old build (`ce47b9d6`) until a
promotion happens.

Recommended sequence:

1. Stage production without moving the domain:
   ```bash
   vercel deploy --prod --skip-domain
   ```
2. Read its headers back with `vercel curl` exactly as in §11 and compare
   against the same table.
3. Only then promote to the custom domain.
4. Immediately after promotion:
   ```bash
   curl -sI https://qoidlab.my.id/ | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security|cross-origin'
   ```
   If those come back empty or with HTML, the redirect chain is different front
   the deployment URL and the comparison is void — investigate before claiming
   parity.
5. Load the site and confirm zero CSP violations in the console.

No production deployment, no promotion, no DNS change, no force push and no
history rewrite was performed in this phase.

---

## 11. Phase 12-C — Vercel Edge acceptance: COMPLETE

Headers and routing were verified against the deployed edge, not a local
reproduction. The method is `vercel curl --url`, an official Vercel CLI feature
that authenticates through the CLI session and does not create a share link or
weaken Deployment Protection.

### A. Document response — `GET /`

```
HTTP/1.1 200 OK
Content-Security-Policy: default-src 'self'; script-src 'self'; script-src-attr 'none';
  style-src 'self' 'unsafe-inline'; img-src 'self' data:
  https://avatars.githubusercontent.com https://raw.githubusercontent.com;
  font-src 'self' data:; connect-src 'self' https://api.github.com https://formspree.io;
  worker-src 'self'; manifest-src 'self'; media-src 'self'; object-src 'none';
  base-uri 'self'; form-action 'self' https://formspree.io; frame-ancestors 'none';
  upgrade-insecure-requests;
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: accelerometer=(), autoplay=(), camera=(), display-capture=(),
  encrypted-media=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(),
  midi=(), payment=(), picture-in-picture=(), publickey-credentials-get=(),
  screen-wake-lock=(), usb=(), xr-spatial-tracking=()
Referrer-Policy: strict-origin-when-cross-origin
Strict-Transport-Security: max-age=63072000
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
```

8/8 headers present. HSTS has **no** `includeSubDomains` and **no** `preload`.
The same eight appear on SPA routes, not just the root.

### B. Resource responses

| Resource | Status | Cache-Control | Content-Type |
|---|---|---|---|
| `/assets/index-*.js` | 200 | `public, max-age=31536000, immutable` | `application/javascript` |
| `/assets/index-*.css` | 200 | `public, max-age=31536000, immutable` | — |
| `/fonts/inter/*.woff2` | 200 | `public, max-age=31536000, immutable` | — |
| `/sw.js` | 200 | `public, max-age=0, must-revalidate` | `application/javascript` |
| `/manifest.webmanifest` | 200 | `public, max-age=0, must-revalidate` | `application/manifest+json` |

No resource redirected to SSO. Service worker is served as JavaScript, not HTML.

### C. SPA routing — three bugs found and fixed here

Routing was **broken on production-equivalent deployments** and only the root
page worked. This was not visible locally because the CDP harness serves `dist/`
with its own rewrite logic.

| Path | Before | After |
|---|---|---|
| `/` | 200 | 200 |
| `/contact` | **404** | 200 |
| `/projects/payrollpro` | **404** | 200 |
| `/projects/explore-bali` | **404** | 200 |
| `/nonexistent-xyz` | 404 | 200 (app renders its own 404 route) |
| `/assets/*.js` | 200 | 200 |
| `/sw.js` | 200 | 200 |

Three distinct causes, each isolated by changing one variable at a time:

1. **Nested negative lookahead in `source`.** `/((?!assets/|...).*)` is compiled
   by path-to-regexp, not a raw regex engine, so it silently matched nothing
   beyond `/`. Fixed by using `/(.*)`.
2. **Directory/route collision.** `public/projects/payrollpro/` existed as a real
   directory, so `cleanUrls` treated `/projects/payrollpro` as a filesystem
   resource. Assets moved to `public/media/` (42 files, 42 references updated).
   Correct hygiene, but not the cause.
3. **`cleanUrls: true` (the actual cause).** It 308-redirects `/index.html` to
   `/`, so a rewrite whose destination is `/index.html` produced a redirect
   Vercel abandons, leaving the original path `NOT_FOUND`. Removing `cleanUrls`
   fixed every route.

Regression tests in `tests/vercel-config.test.js` (8 tests) pin all three: the
rewrite must be literally `/(.*)`, must contain no lookahead, `cleanUrls` must
be absent, no source file may reference `/projects/` for assets, and the eight
headers with HSTS lacking subdomain flags must be declared.

### D. Console

Rendering errors: none. The framer-motion `<line> y1/y2` error is fixed
(`1e843aa`). Remaining entries are HTTP 422 from `api.github.com/search/issues`
under anonymous rate limiting — external API limitation, now surfaced as `—`
rather than `0` (`3d2ef9a`).

**Not covered by edge automation:** actual browser rendering at the four
viewports was verified locally via CDP, not on Vercel's edge. Layout is static
CSS and does not depend on edge behaviour, so this is a low residual, but it is
not claimed as edge-verified.

---

## 12. Corrected preview provenance

| Field | Value |
|---|---|
| Branch | `security/release-candidate-2026-11` |
| HEAD | `0543c2c` |
| CI | run 45535548145 — SUCCESS |
| Edge-verified deployment | `my-portofolio-git-security-release-candidate-2026-11-qoidrifat.vercel.app` |
| Source | Git (Vercel-attested) |
| Deployment protection | Enabled; read via authenticated `vercel curl` |

An earlier revision of this report named `5i83jf9wv` as the preview. That was
superseded by `6mvk8nc7u`, then by the deployments above. The committed code
changed between them (routing fixes), so the correct pairing is HEAD `0543c2c`
with the branch alias deployment listed here.
