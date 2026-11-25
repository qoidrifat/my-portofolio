# Phase 13-A2 — Fresh Staged Production Deployment

**Date:** 2026-11-25
**Repository:** `qoidrifat/my-portofolio`
**Branch:** `security/release-candidate-2026-11`
**HEAD:** `055777eee15d129b7c9acf749a5d9ce8bd7871d7`
**Staged production:** https://my-portofolio-ii8o2egnc-qoidrifat.vercel.app
**Deployment ID:** `dpl_6BcbR8X1USfWNZ4sXBoMY7w6gTKa`

**Verdict: `STAGED_PRODUCTION_READY`**

A fresh production-environment deployment was built from the reviewed release
candidate and passes every edge check. No production domain was assigned, no
promotion occurred, and `qoidlab.my.id` still serves the 92-day-old production
deployment unchanged.

---

## 1. Source identity

| Field | Value |
|---|---|
| Branch | `security/release-candidate-2026-11` |
| HEAD | `055777eee15d129b7c9acf749a5d9ce8bd7871d7` |
| Tree | `dbae9c3e7f44f42a07d3240f27790e7179f34f05` |
| Remote branch HEAD | `055777e` (matches local) |
| Recorded before deploy | `055777e` / `dbae9c3…` |
| Recorded after deploy | `055777e` / `dbae9c3…` (unchanged) |
| Vercel CLI | 54.21.1 |

Path note: the brief named `D:\Workspaces\projects\my-portofolio`. That path does
not exist; the repository is at `D:\Workspace\projects\my-portofolio`. Confirmed
by `pwd` before any command ran.

## 2. Working-tree evidence

```
$ git status --porcelain --untracked-files=no
(empty)
```

Tracked tree clean. Three untracked files remain, all deliberately excluded from
the release and ignored or out of scope:

```
.opencode/FINAL_SMART_ROUTER_ARCHITECTURE.md
.opencode/ISR_MODEL_SWITCHING.md
.opencode/smart-router/v22-isr-flags.json
```

None are imported by the application, the test suite or the build.

## 3. CI

| Field | Value |
|---|---|
| Run | 45536175733 |
| Commit | `055777eee15d129b7c9acf749a5d9ce8bd7871d7` |
| Conclusion | `success` |
| Job | `quality` — 14 steps green |
| Status | completed |

Job log verified via `gh run view`. No workflow or gate was modified.

## 4. Deployment identity

```
$ vercel deploy --prod --skip-domain
```

| Field | Value |
|---|---|
| URL | `my-portofolio-ii8o2egnc-qoidrifat.vercel.app` |
| Deployment ID | `dpl_6BcbR8X1USfWNZ4sXBoMY7w6gTKa` |
| Target | `production` |
| State | `READY` |
| Created | 2026-11-25T03:15:32.426Z |
| Aliases | **NONE** — no domain assigned |
| Source | CLI (no Git metadata attached) |

### Provenance honesty

This is a **CLI** deployment. Vercel holds no commit metadata for it, so
Git-attested provenance is not claimed. What is recorded instead:

- HEAD and tree SHA captured immediately before the deploy.
- HEAD and tree SHA captured immediately after the deploy — identical.
- Tracked working tree clean at both moments.
- The same commit is what CI run `45536175733` validated.

That chain (clean tree + unchanged SHA + CI on the same SHA) is what makes the
artifact traceable; it is not the same strength as a Git-sourced deployment, and
the difference is recorded rather than glossed over.

## 5. Applied configuration

Vercel parsed the repository's `vercel.json` for this build:

| Setting | Value |
|---|---|
| Rewrites | `[{"source":"/(.*)","destination":"/index.html"}]` |
| `cleanUrls` | absent |
| Header blocks | 3 (`/(.*)`, `/assets/(.*)`, `/fonts/(.*)`) |

The catch-all rewrite and absent `cleanUrls` are exactly the two fixes from
`0543c2c`. The previous staged deployment `pxuj0ij31` carried the broken
combination — nested lookahead plus `cleanUrls: true` plus assets under
`/projects/` — and was not used.

### Confirmation that the earlier staged deployment was stale

```
pxuj0ij31  dpl_Asx2SR67PED1NLiBogFQiU765Mtp  created 2026-11-25T02:18:26Z
  rewrite   : /((?!assets/|fonts/|gallery/|projects/|...).*)
  cleanUrls : true
  aliases   : none
```

Promoting it would have shipped 404s on every non-root path.

## 6. Security headers — all eight, edge-observed

From `vercel curl --url .../ -I`:

| Header | Value | Status |
|---|---|---|
| `Content-Security-Policy` | byte-identical to `vercel.json` | PASS |
| `X-Frame-Options` | `DENY` | PASS |
| `X-Content-Type-Options` | `nosniff` | PASS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | PASS |
| `Permissions-Policy` | 16 capabilities disabled | PASS |
| `Strict-Transport-Security` | `max-age=63072000` | PASS |
| `Cross-Origin-Opener-Policy` | `same-origin` | PASS |
| `Cross-Origin-Resource-Policy` | `same-origin` | PASS |

CSP compared programmatically against the `vercel.json` value, not by eye:
`CSP byte-identical: true`.

HSTS contains neither `includeSubDomains` nor `preload`.

**Correction to the brief:** the expected `Permissions-Policy` count is **16**,
not 15. Actual disabled features:

```
accelerometer, autoplay, camera, display-capture, encrypted-media, geolocation,
gyroscope, magnetometer, microphone, midi, payment, picture-in-picture,
publickey-credentials-get, screen-wake-lock, usb, xr-spatial-tracking
```

The same eight headers are present on SPA routes, not only the root:

```
/contact              -> 8/8 headers
/projects/payrollpro  -> 8/8 headers
```

## 7. Routing matrix

| Path | Expected | Actual |
|---|---|---|
| `/` | 200 | 200 |
| `/contact` | 200 | 200 |
| `/projects/payrollpro` | 200 | 200 |
| `/projects/explore-bali` | 200 | 200 |
| `/nonexistent-xyz` | 200 (app renders its own 404 route) | 200 |
| `/sw.js` | 200 | 200 |
| `/manifest.webmanifest` | 200 | 200 |

7/7 pass. Before the `0543c2c` fixes, `/contact` and `/projects/*` returned
Vercel's `NOT_FOUND`.

## 8. Asset caching

Filenames extracted from the deployed HTML, not assumed:

| Asset | Status | `Cache-Control` |
|---|---|---|
| `/assets/index-Cv2SsWoe.js` | 200 | `public, max-age=31536000, immutable` |
| `/assets/index-BE4h2REV.css` | 200 | `public, max-age=31536000, immutable` |
| `/fonts/inter/Inter-normal-400.woff2` | 200 | `public, max-age=31536000, immutable` |
| `/sw.js` | 200 | `public, max-age=0, must-revalidate` |
| `/manifest.webmanifest` | 200 | `public, max-age=0, must-revalidate` |

Service worker served as `application/javascript` with `nosniff`; manifest as
`application/manifest+json`. Neither is HTML, so neither would have been a
silently broken registration.

## 9. Production domain safety

| Check | Result |
|---|---|
| `qoidlab.my.id` deployment ID | `dpl_EjAYm7n4vSafKpL7JeUvKCGpbR2r` — unchanged |
| That deployment's age | created 2026-08-25 (92 days) |
| New staged deployment aliases | none |
| Live HTML asset | `/assets/index-C9Ylnvx_.js` — the old build, not `index-Cv2SsWoe.js` |
| DNS | untouched |
| `vercel promote` | not run |
| Domain assignment | not performed |

The old production still serves its old bundle, which is the strongest available
evidence that no traffic moved.

## 10. Remaining risks

| ID | Risk | Status | Note |
|---|---|---|---|
| R6 | Internal operational material remains in Git history | **OPEN** | 13 + 3 + 3 commits. No valid secret in any of them. Rewriting requires `filter-repo` plus coordinated force-push and a separate decision. |
| R7 | Formspree endpoint reachable by direct POST | **ACCEPTED RISK** | Honeypot `_gotcha` plus 60 s client cooldown. Not a server-side rate limit; an attacker can still post. Mitigation needs provider dashboard rules or an own endpoint with CAPTCHA. |
| B2 | Browser rendering at four viewports on the edge | **RESIDUAL** | Verified locally via CDP at 360/390/768/1440 with `scrollWidth === clientWidth`. Layout is static CSS independent of edge behaviour. Not claimed as edge-verified. |
| — | `main` still at `ce47b9d6` | Informational | No merge has occurred; the release candidate lives on its own branch. |

## 11. Final staged release verdict

**`STAGED_PRODUCTION_READY`**

Every gate requested for this phase passes on a fresh production-environment
deployment built from the reviewed HEAD:

- source identity and clean tree recorded before and after,
- CI green on the same commit,
- eight security headers edge-observed and CSP byte-identical,
- 7/7 routing, with SPA routes carrying the headers too,
- cache policy correct for hashed assets, service worker and manifest,
- production domain untouched and provably still on the old bundle.

Not done, by instruction: no promotion, no domain assignment, no DNS change, no
`vercel promote`, no environment changes, no source changes, no history rewrite.

Promotion of `ii8o2egnc` (`dpl_6BcbR8X1USfWNZ4sXBoMY7w6gTKa`) to `qoidlab.my.id`
is the next decision and requires explicit authorisation. `pxuj0ij31` must not
be promoted.
