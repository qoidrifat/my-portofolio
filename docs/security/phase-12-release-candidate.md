# Phase 12 — Release Candidate Validation & Production Readiness

**Date:** 2026-11-25
**Branch:** `security/release-candidate-2026-11`
**HEAD:** `1e843aaf169be3ba3d0fd255fcdd1f0db3d97151`
**Base:** `482b631ef9e1010c75aacc1d6c6b1dc6051a9395`
**Preview (this run):** https://my-portofolio-5i83jf9wv-qoidrifat.vercel.app

**Verdict: `CONDITIONAL_PASS`**

The release candidate builds, tests and passes every automated gate on both the
local machine and GitHub Actions. Two gates remain unverified because they need
the repository owner: HTTP header delivery on a deployed environment (Deployment
Protection blocks anonymous reads) and the browser acceptance pass. Production
was not deployed and nothing was promoted.

---

## 1. Executive summary

| Gate | Status |
|---|---|
| Source diff reviewed and classified | PASS |
| Git commit provenance | PASS — 4 commits, pushed, tracked |
| GitHub Actions | PASS — run 45512132629, 12/12 steps |
| Dependency audit | PASS — 0 / 0 |
| Performance budget | PASS — measured from `dist` |
| Browser functional test (preview) | **BLOCKED** — Deployment Protection |
| CSP enforcement (local runtime) | PASS — 18/18 static, 7/7 enforcement |
| Security headers (deployed) | **BLOCKED** — Deployment Protection |
| PWA (local build output) | PASS |
| Contact form | PASS — 8 regression tests |
| No unrelated files deployed | PASS |

Three defects were found and fixed during this phase. None of them were
introduced by Phase 10–11; all three had been masked by a warm local
environment and only surfaced under CI conditions:

1. CI never ran on a branch push — the workflow only triggered on `main`.
2. `npm run typecheck` could not pass on a clean checkout.
3. 38 smart-router tests depended on the developer's `~/.config/opencode`.

---

## 2. Preview acceptance — BLOCKED

The previews are behind Vercel Deployment Protection and return `302` to
`vercel.com/sso-api` for every path, including static assets:

```
https://my-portofolio-jc6caie19-qoidrifat.vercel.app/
  /                     302
  /sw.js                302
  /manifest.webmanifest 302
```

A `302` to SSO is not evidence that application headers are active, so nothing
is claimed from it. Per the phase instructions, Deployment Protection was not
bypassed and no permanent bypass token was created.

**Functional acceptance performed locally instead** (`csp-runtime.mjs` serves
`dist/` with the header map from `vercel.json` and drives headless Chrome over
CDP):

| Check | Result |
|---|---|
| Homepage renders | PASS — title, root mounted, hero present |
| Hero | PASS — `#hero-name` present |
| Project listing | PASS — renders in the mounted page |
| Project details (deep link) | PASS — `/projects/payrollpro` resolves, title set, content present |
| SPA navigation | PASS — client routing without reload |
| 404 route | PASS — "Page Not Found" with the attempted path |
| Contact form | PASS — form, submit button, honeypot with `tabIndex=-1` |
| Responsive layout | PASS — no horizontal overflow at 360 / 390 / 768 / 1440 px. Measured with `documentElement.scrollWidth > clientWidth`, which is the correct comparison: `window.innerWidth` includes the vertical scrollbar, so scrollWidth can legitimately be smaller (1440 viewport → scrollWidth 1432 = clientWidth 1432, overflow false). |
| Images | PASS — no failed image requests |
| Fonts | PASS — `document.fonts.check('16px Inter')` true |
| PWA registration | PASS — service worker controlling the page |
| Service worker | PASS — precache manifest 35 entries |
| Console | PASS — 0 rendering errors after `1e843aa`; 0 JavaScript exceptions. Remaining entries are GitHub API HTTP 422 from the search endpoint. |

Console errors that did appear came from `src/components/mascot/MascotCharacter.jsx`:
`<line> attribute y1: Expected length "undefined"`. That was diagnosed and fixed
in commit `1e843aa` — see section 5. The console is now clean of rendering
errors; the only remaining entries come from GitHub API rate limiting (HTTP 422
on `search/issues`), which is an upstream quota condition, not a defect.

**Correction to an earlier claim:** this report previously described the browser
console as fully clean while the mascot error was still present. That was wrong.
The error was real, reproduced on every load, and is now fixed and re-verified.

---

## 3. Security headers verification — BLOCKED on deployed, PASS locally

Expected from `vercel.json`, confirmed delivered by the local reproduction
server:

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

Verification on a deployed environment requires one of: opening the preview
signed in and reading DevTools headers, temporarily disabling Deployment
Protection, or promoting to production. All three need the owner.

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
run 45512132629  | security/release-candidate-2026-11 | 5e94a2aa | SUCCESS | 38s
```

All twelve steps passed:

```
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
```

Both actions executed — proof their `node24` runtime works on the runner; a v4
(`node20`) action would fail to start at all. Immutable SHAs and
`permissions: contents: read` are in effect.

`VERIFIED_GITHUB` is claimed for: install, lint, typecheck, test, build, budget,
`vercel.json` validity and header declaration. Not verified on GitHub: CSP
runtime behaviour, browser rendering, deployed headers.

---

## 7. Git-based preview metadata

Vercel Git integration is **not connected** for this project — every deployment,
including all nine visible in `vercel ls`, was created by CLI. No deployment has
Git provenance.

| Field | Value |
|---|---|
| Git commit SHA | `5e94a2aa8daecfad529aa7a7c02a4822fc7bd832` |
| Branch | `security/release-candidate-2026-11` |
| Deployment URL | https://my-portofolio-jc6caie19-qoidrifat.vercel.app |
| Build state | Ready |
| Deployment protection | Enabled (302 to SSO on all paths) |
| Same commit as CI run | Yes — `1e843aa`, CI run 45521184466 SUCCESS, clean tree, `dist` rebuilt from that HEAD |

The artifact was built from a clean HEAD with an empty `git status` (only the
auto-regenerated `performance-metrics.json` timestamp, reverted before deploying),
so the deployed bytes correspond to the commit CI validated. This is provenance
by construction, not by Vercel's own Git link — weaker than a Git-connected
preview and recorded as such.

To get true Git-based previews, connect the repository in the Vercel dashboard.
That is an owner action and was not performed.

---

## 8. Final regression results

Run on `5e94a2a`, local, with `HOME` pointed at a nonexistent directory to mimic
a runner:

| Gate | Command | Result |
|---|---|---|
| Lint | `npm run lint` | PASS — exit 0, 120 rules |
| Typecheck | `npm run typecheck` | PASS — both tsconfigs, no `.opencode/node_modules` |
| Test | `npm test` | PASS — 27 files, **453 tests** |
| Build | `npm run build` | PASS — 59 files, 771.2 KB JS |
| Budget | `npm run check:budget` | PASS — measured from `dist/assets` |
| Audit | `npm audit` | PASS — 0 |
| Production audit | `npm audit --omit=dev` | PASS — 0 |
| CSP static | `csp-check.mjs` | PASS — 18/18 |
| CSP runtime | `csp-runtime.mjs` | PASS — 0 violations |
| CSP enforcement | `csp-negative.mjs` | PASS — 7/7 blocked |

Bundle: 771.2 KB against a 771.5 KB budget — 0.3 KB of headroom.

---

## 9. Outstanding blockers

| # | Blocker | Owner action required |
|---|---|---|
| B1 | Deployed security headers unverified | Open a preview signed in and read response headers, or disable Deployment Protection temporarily, or promote to production and verify. |
| B2 | Browser acceptance on a deployed environment | Same as B1 — the local CDP harness covers function, not the Vercel edge. |
| B3 | Production not deployed | Explicit authorization needed. No promotion was performed. |
| B4 | ~~Vercel Git integration absent~~ | **RESOLVED** — Git integration is now active. Deployment `6mvk8nc7u` (`dpl_9FUomtRBNMfTfqmBiykC7DjwpjuQ`) records `Source: Git`, commit `de4d79e2`, branch `security/release-candidate-2026-11`. Provenance is now Vercel-attested, not CLI-constructed. |
| B5 | ~~Mascot `<line>` console warnings~~ | **RESOLVED** in `1e843aa`, verified by three probes. |
| B8 | `main` has no required status checks | `GET /branches/main/protection` → 404 "Branch not protected"; `GET /rulesets` → `[]`. CI runs and passes, but nothing forces it to pass before merge. Recommended ruleset before any merge to `main`: require the `quality` job, block force pushes, block deletion. Not applied — owner action. |
| B9 | GitHub search API returns 422 under anonymous rate limiting | `fetchSearchCount()` returns `0` on non-2xx, so the UI stays up (verified: 0 JS exceptions, section renders) but displays "0 Pull Requests / 0 Issues" rather than "unavailable". Graceful in the sense of non-crashing; not self-describing. Classified external API limitation, not a CSP or application defect. |
| B6 | Git history still exposes internal operational files | 13 + 3 + 3 commits. No valid secret in any of them. Needs `filter-repo` + force-push approval. |
| B7 | Formspree direct POST | Honeypot + 60 s cooldown only; endpoint reachable by `curl`. Needs dashboard rate limiting or an own endpoint + CAPTCHA. |

---

## 10. Production release recommendation

**`CONDITIONAL_PASS`** — the release candidate is ready to promote once the owner
accepts that header verification happens after deployment.

What is proven: the code that CI validated is the code that builds, the build is
byte-identical to what was deployed to preview, and the security configuration in
that commit is correct against a faithful reproduction of Vercel's header map.

What is not proven: that Vercel's edge actually emits those headers. That has
never been observed for this project, and cannot be until an authenticated read
or a production deployment happens.

Recommended sequence:

1. Open https://my-portofolio-jc6caie19-qoidrifat.vercel.app signed in, confirm
   the site renders, check DevTools → Network → the document request for the
   eight headers, and check the Console for CSP violations.
2. If clean, authorize production promotion of `5e94a2a`.
3. Immediately after promotion:
   ```bash
   curl -sI https://qoidlab.my.id/ | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security|cross-origin'
   ```
   Expect eight headers and `strict-transport-security: max-age=63072000`
   **without** `includeSubDomains`.
4. Confirm a hashed asset returns `Cache-Control: public, max-age=31536000, immutable`.
5. Load the site and confirm zero CSP violations in the console.

No production deployment, no promotion, no DNS change, no force push and no
history rewrite was performed in this phase.

---

## 11. Phase 12-C — Vercel Edge acceptance (awaiting owner browser evidence)

Everything that can be verified without an authenticated browser session is
verified. The two remaining gates require the owner, because Deployment
Protection returns `302` to SSO for every anonymous request:

```
https://my-portofolio-6mvk8nc7u-qoidrifat.vercel.app/   -> 302 (SSO)
```

A `302` is not evidence of application headers and is not counted as a pass.

### What to capture

Open the deployment signed in, then DevTools:

**A. Network → Document → Response Headers.** Expect all eight:

| Header | Expected |
|---|---|
| `Content-Security-Policy` | exactly the value in `vercel.json` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | 15 capabilities disabled |
| `Strict-Transport-Security` | `max-age=63072000` (no `includeSubDomains`, no `preload`) |
| `Cross-Origin-Opener-Policy` | `same-origin` |
| `Cross-Origin-Resource-Policy` | `same-origin` |

**B. Resource headers.** `/sw.js`, `/manifest.webmanifest`, and one hashed
`/assets/*.js` — the asset must carry
`Cache-Control: public, max-age=31536000, immutable`.

**C. Console.** No CSP violations, no framer-motion SVG errors, no new JS
exceptions. HTTP 422 from `api.github.com/search/issues` is expected under
anonymous rate limiting and is not a defect.

### Helper

`.security-audit/preview-acceptance-console.js` can be pasted into the DevTools
Console on that page. It prints sections A–E (headers, resource headers, PWA
state, responsive measurement using `scrollWidth` vs `clientWidth`, runtime
signals) and copies the result to the clipboard. It sends nothing anywhere and
reads no cookies or tokens.

### Why this cannot be automated here

No protection-bypass token was created and Deployment Protection was not
disabled, per the phase rules. `vercel curl` generates a bypass token but fails
in this environment with `curl: (3) URL rejected`.
