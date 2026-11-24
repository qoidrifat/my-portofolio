# Phase 11 — Final Security Hardening, Audit Reconciliation & Deployment Readiness

**Date:** 2026-11-25
**Base HEAD:** `482b631ef9e1010c75aacc1d6c6b1dc6051a9395`
**Production:** https://qoidlab.my.id
**Preview (this run):** https://my-portofolio-8f0l2igfh-qoidrifat.vercel.app

**Verdict: `CONDITIONAL_PASS`**

Production security headers are **not yet live**. `vercel.json` is correct and
proven against a local server reproducing Vercel's header map, but the deployed
production build predates it and the preview deployment sits behind Vercel
Deployment Protection, so the header set cannot be read over HTTP until the
owner promotes a deployment or disables protection for verification.

---

## 1. Executive summary

| Area | Before | After | Evidence |
|---|---|---|---|
| HSTS subdomain coverage | `includeSubDomains` on a zone whose subdomains fail TLS | `max-age=63072000` only | `openssl s_client`, `curl` |
| GitHub Actions runtime | node20 actions (removed by GitHub 2026-09-23) | node24 actions, SHA-pinned | upstream `action.yml` |
| `.opencode/ai` on public HEAD | 109 files tracked | 0 tracked, files kept on disk | `git ls-files` |
| Workbox glob chain | override to `glob@14` with unverified effect on PWA | override retained, proven compatible | precache manifest + 10 tests |
| Performance budget | read stale committed JSON, false PASS | measures `dist/assets` directly | drift visible, real violations fail |
| Fresh bundle size | 778.7 KB | 771.2 KB | `check-budget` |

Findings closed this phase: HSTS scope, Actions runtime, budget integrity,
Workbox override verification, `data.js` bloat on the LCP path.

Still open: production header rollout (release gate), Git history exposure
(accepted risk), Formspree direct-POST (accepted risk).

---

## 2. Phase 11 findings

### 11-A — HSTS subdomain coverage (FIXED_LOCAL)

`includeSubDomains` was being sent while two subdomains in the zone do not
serve working HTTPS:

```
qoidlab.my.id        https 200
www.qoidlab.my.id    https 000   (TLS handshake fails)
mail.qoidlab.my.id   https 000   (TLS handshake fails)
```

Certificate SAN covers only the apex:

```
subject=CN=qoidlab.my.id
issuer=C=US, O=Let's Encrypt, CN=YR1
X509v3 Subject Alternative Name: DNS:qoidlab.my.id
```

Because HSTS is inherited by every subdomain, pinning `includeSubDomains` would
have told browsers never to attempt plain HTTP for `www` and `mail` — neither of
which can complete a TLS handshake today. That is a self-inflicted outage
waiting for the first visitor.

**Change:** `Strict-Transport-Security: max-age=63072000` (no `includeSubDomains`,
no `preload`).

**Revisit when:** every subdomain in the zone resolves, serves a valid
certificate, and redirects HTTP to HTTPS. Then and only then add
`includeSubDomains`; `preload` additionally requires submission and a long-lived
uptime commitment.

### 11-B — GitHub Actions node24 migration (VERIFIED_LOCAL)

GitHub removed the Node20 runner on 2026-09-23. Both pinned actions were v4,
which declare `runs.using: node20`, so every run would have failed to start.

Verified upstream before pinning:

| Action | Tag | Full SHA | `runs.using` | Verified |
|---|---|---|---|---|
| actions/checkout | v6.1.0 | `d23441a48e516b6c34aea4fa41551a30e30af803` | `node24` | `true` |
| actions/setup-node | v6.5.0 | `249970729cb0ef3589644e2896645e5dc5ba9c38` | `node24` | `true` |

Verification path: `git ls-remote` for the tag list, GitHub commits API for the
SHA and signature, `raw.githubusercontent.com` for the `action.yml` runtime.

`persist-credentials: false`, `permissions: contents: read`, and both security
gates (vercel.json JSON validity, required-header assertion) are preserved.
Runtime bumped to Node 24 to match the local and Vercel toolchain.

### 11-C — Public repository exposure (PARTIALLY_MITIGATED)

Public HEAD after this phase:

| Path | Files | Classification |
|---|---|---|
| `.opencode/command/*.md` | 7 | Public-safe — workflow docs, no hosts or credentials |
| `.opencode/plugins/*.tsx` | 2 | Public-safe — no endpoints, no keys |
| `.opencode/smart-router/**` | 44 | Mixed: runtime + test fixtures, no endpoints or credentials |

Scans performed against the tracked set:

- `routing-policy.json`: 0 URLs, 0 IPs, 0 credential keys. Contains provider
  and model *names* only (`b-ai`, `minimaxm3new`, `mygmicloud`, `open-router`),
  plus risk labels and fallback chains.
- `permission-policy.json`: 4 matches, all regex patterns that *detect*
  credential access. No credential values.
- Only URL anywhere in `.opencode/smart-router/`: `http://localhost:4096`.
- Both plugins: no endpoints, no auth headers.

`routing-policy.json` is load-bearing, not documentation:
`router.ts:loadRoutingPolicy()` reads it at runtime, and two test files parse it
directly. Untracking it would silently change routing behaviour and break the
test suite. It carries no secret, so it stays with a documented classification
rather than being removed for appearance.

### 11-D — Workbox / glob / minimatch (VERIFIED_LOCAL)

The override is load-bearing; removing it was tested, not assumed.

```
without override -> 4 moderate vulnerabilities
  glob       : workbox-build/node_modules/glob @ 11.1.0
  minimatch  : workbox-build/node_modules/minimatch @ 10.2.6
```

`workbox-build@7.4.1` (current latest) declares `glob: ^11.0.1`. Every published
11.x release — including the newest, `11.1.0` — falls inside the advisory range
`9.0.0 - 14.0.1`. There is no compatible upstream version that resolves it, so
Option B applies: targeted override retained.

Correctness of the override was proven, not assumed:

- Workbox only consumes `globSync` (`workbox-build/build/lib/get-file-details.js:23`),
  never the async generator form.
- Emitted precache manifest: 35 entries — 17 js, 1 html, 4 woff2, 2 css,
  3 webp, 6 png, 1 avif, 1 webmanifest.
- `globIgnores` respected: no `gallery/**`, no `projects/**`, no PDFs.

New regression suite (`tests/pwa-precache.test.js`, 10 tests) pins: manifest
shape, exclusion behaviour, absence of a glob major regression, the override
declaration itself, the `globSync` contract inside workbox, brace expansion,
ignore semantics, `follow`/`nodir` options, and bracketed directory names.

### 11-E — Performance budget integrity (VERIFIED_LOCAL)

`check-budget.mjs` read `src/data/performance-metrics.json` — a build artifact
committed to the repo. Measured drift on the current tree:

```
committed metrics : 743638 bytes (726.2 KB)   -> PASS
actual dist/assets: 797432 bytes (778.7 KB)   -> over budget
undetected drift  : 53794 bytes
```

The check was validating a number that did not describe the shipped bundle.
CI options (`build` regenerates the file before `check:budget`) masked it, but a
local run, a cached artifact, or a stale commit produced a false PASS.

**Change:** `check-budget.mjs` now measures `dist/assets` directly and prints the
drift when the committed JSON disagrees. Thresholds in `performance-budget.json`
were **not** modified.

### 11-F — Bundle reduction (real optimization, not a threshold change)

The budget was genuinely over by 7.4 KB because `react-router-dom@7` (already in
the working tree) is ~25 KB larger than v6 and was unsplit.

Two measured fixes, no threshold raised:

1. **`react-router` chunk split** — router runtime moved out of the entry chunk.
   Entry chunk: 385 KB → 210 KB. Largest single chunk: 387 KB → 198 KB. This is
   the metric that actually governs first paint.
2. **`data.js` split** — the 54 KB `projects` array was reaching the entry chunk
   because `CommandPalette` imports it eagerly (it owns the Cmd+K handler).
   Project content moved to `src/lib/projects-data.js`; `data.js` is now 17 KB.

Result on a clean build:

```
before: 778.7 KB / 771.5 KB   FAIL
after : 771.2 KB / 771.5 KB   PASS
```

Proof the remaining headroom belongs to the router upgrade, not to this phase:
with `react-router-dom@6` and every Phase 11 change applied, the bundle is
771.5 KB — identical conclusion, different cause. No version downgrade was
performed; the router stays at v7.

---

## 3. Changes made

| File | Change | Reason |
|---|---|---|
| `vercel.json` | HSTS drops `includeSubDomains` | `www`/`mail` cannot complete TLS |
| `.github/workflows/ci.yml` | checkout v6.1.0, setup-node v6.5.0, node 24 | node20 runner removed |
| `scripts/check-budget.mjs` | measures `dist/assets`, reports drift | stale metrics gave false PASS |
| `src/lib/data.js` | 72 KB → 17 KB, `projects` removed | 54 KB of case studies on the LCP path |
| `src/lib/projects-data.js` | new, holds `projects` + `featuredProjectId` | lazy consumers only |
| `vite.config.js` | `vendor-router` manual chunk | largest chunk 387 → 198 KB |
| `src/components/CommandPalette.jsx` | imports from `projects-data` | single source preserved |
| `src/components/portofolio/{Project, TechStack}Section.jsx` | imports from `projects-data` | split consumers |
| `src/pages/ProjectCaseStudy.jsx` | imports from `projects-data` | split consumers |
| `src/components/TerminalEasterEgg.jsx` | imports from `projects-data` | split consumers |
| `tests/pwa-precache.test.js` | new, 10 tests | glob/workbox contract guard |
| `tests/{integration,portfolio,smoke}.test.jsx` | import paths updated | follow the split |

Local-only, no repository effect: `.vercel/.env.development.local` removed
(expired OIDC from 2026-07-08).

---

## 4. Before/after comparison

```
                              baseline (HEAD)      after Phase 11
vercel.json tracked           no                   yes
HSTS                          max-age + subdomains max-age only
CSP in response headers       0 headers            8 headers (local server)
Actions runtime               node20 (removed)     node24
Actions pinning               v4.4.0 SHA           v6.x SHA, upstream-verified
.eslintrc effective rules     43 (no-undef off)    120 (no-undef error)
npm audit                     15 vulns             0
npm audit --omit=dev          0                    0
tests                         435                  453
budget source                 committed JSON       measured dist
budget result (fresh)         778.7 / 771.5 FAIL   771.2 / 771.5 PASS
largest JS chunk              387.2 KB             198.0 KB
tracked .opencode/ai files    109                  0
```

---

## 5. GitHub Actions runtime validation

```
$ git ls-remote https://github.com/actions/checkout refs/tags/v6.1.0
d23441a48e516b6c34aea4fa41551a30e30af803  refs/tags/v6.1.0

$ curl .../commits/d23441a48e516b6c34aea4fa41551a30e30af803
sha       d23441a48e516b6c34aea4fa41551a30e30af803
message   backport fixes to releases-v6 (#2527)
verified  true

$ curl raw.githubusercontent.com/actions/checkout/d23441a4.../action.yml
runs:
  using: node24
```

Same procedure for `actions/setup-node@249970729cb0ef3589644e2896645e5dc5ba9c38`
(`v6.5.0`, `verified: true`, `using: 'node24'`).

Workflow assertions (all PASS): no floating tags, both SHAs pinned with version
comments, `permissions: contents: read`, `persist-credentials: false`,
`node-version: 24`, `npm ci`/lint/typecheck/test/build/budget preserved, both
security gates preserved, no tabs.

**Not executed on GitHub's runners in this phase** — the workflow change is
validated statically, SHA source, and runtime declaration. First real run
happens on push.

---

## 6. HSTS coverage decision

Decision: **drop `includeSubDomains`, do not enable `preload`.**

| Subdomain | DNS | HTTPS | Cert covers |
|---|---|---|---|
| `qoidlab.my.id` | 216.198.79.1 | 200 | yes (SAN: apex only) |
| `www.qoidlab.my.id` | resolves | TLS handshake fails | no |
| `mail.qoidlab.my.id` | resolves | TLS handshake fails | no |

MX record: `qoidlab.my.id` preference 0 → `qoidlab.my.id` (self-hosted, no
third-party mail provider).

Enabling inheritance would brick `www` and `mail` for every returning visitor
with a cached HSTS entry, and the policy cannot be recalled faster than
`max-age`. The apex keeps full HSTS protection.

---

## 7. Public HEAD exposure inventory

See §11-C. Summary:

- **Public-safe:** 7 command docs, 2 plugins.
- **Internal operational (no secret):** 44 smart-router files, of which
  `routing-policy.json` and `permission-policy.json` carry routing and
  authorization policy that would help an attacker plan around guardrails. They
  are runtime inputs and test fixtures; removal would break behaviour and tests.
- **Sensitive:** none found. No tokens, keys, private URLs, or credentials.

Removed from the index this run: 109 files (`ai/**`, root reports).

### Historical exposure (NOT remediated)

```
commits touching .opencode/ai                 : 13
commits touching routing-policy.json          : 3
commits touching SMART_ROUTER_*.md            : 3
oldest: 2026-08-27   newest: 2026-11-24
```

Any of those commits still serves the content. Removing files from HEAD does not
remove them from history. A full-history secret scan across `git rev-list --all`
found no valid tokens.

Remediation would require `git filter-repo` plus coordinated force-push. **Not
performed** — it needs explicit approval and affects every clone and fork.

---

## 8. Workbox dependency compatibility

See §11-D. Decision: retain the targeted override.

```
"overrides": {
  "source-map-js": "^1.2.2",
  "postcss-selector-parser": "^6.1.5",
  "glob@^11.0.1": "^14.0.6",
  "minimatch@^10.2.0": "^11.0.1"
}
```

Resolved: `glob@14.0.6`, `minimatch@11.0.9`, `workbox-build@7.4.1`,
`vite-plugin-pwa@1.3.0`. `npm ci` reproduces the tree; `npm audit` is 0.

The two `source-map-js` / `postcss-selector-parser` overrides predate this work
and are unchanged.

---

## 9. Fresh performance budget evidence

```
$ npm run build && npm run check:budget

Source: measured from dist/assets (not the committed metrics file)
⚠️  total-js: committed metrics (726.2 KB) differ from dist (771.2 KB). Using the measured value.

✅ total-js           771.2 KB / 771.5 KB
✅ total-css           87.3 KB /  92.8 KB
✅ largest-js-chunk   198.0 KB / 410.2 KB
✅ largest-css-chunk   87.3 KB /  97.7 KB
✅ bundle-count            17 /     18
✅ All budgets satisfied
```

Headroom is 0.3 KB on `total-js`. This is a **tight** gate, not a comfortable
one: `react-router-dom@7` occupies 174 KB and is the single item that would
break it. Any further dependency addition needs a measured chunk-split first.

---

## 10. Regression test results

| Gate | Command | Result |
|---|---|---|
| Install | `npm ci` | PASS — 0 vulnerabilities |
| Lint | `npm run lint` | PASS — exit 0, 120 rules |
| Typecheck | `npm run typecheck` | PASS — both tsconfigs |
| Test | `npm test` | PASS — 27 files, **453 tests** (435 + 8 contact + 10 precache) |
| Build | `npm run build` | PASS — 59 files, 771.2 KB JS |
| Audit | `npm audit` | PASS — 0 |
| Production audit | `npm audit --omit=dev` | PASS — 0 |
| Budget | `npm run check:budget` | PASS — measured from dist |
| CSP static | `.security-audit/csp-check.mjs` | PASS — 18/18 |
| CSP runtime | `.security-audit/csp-runtime.mjs` | PASS — 0 violations, 8 headers delivered |
| CSP enforcement | `.security-audit/csp-negative.mjs` | PASS — 7/7 blocked |

Runtime CSP verification serves `dist/` with the header map from `vercel.json`
and drives headless Chrome over CDP. Confirmed under the real policy: hero
renders, deep link `/projects/payrollpro` resolves, 404 route renders, service
worker registers, manifest loads, Inter font applies, `api.github.com` → 200,
`formspree.io` → 200, honeypot present with `tabIndex=-1`.

Enforcement negatives, all blocked: inline `<script>`, inline event handler,
external script origin, foreign `connect-src`, cross-origin frame. Window
globals never set.

Not tested in this harness: `eval()` / `new Function()`. CDP `Runtime.evaluate`
is privileged and bypasses CSP, so it cannot observe `script-src` enforcement of
eval. The absence of `unsafe-eval` is asserted statically instead.

---

## 11. Preview deployment report

```
$ vercel deploy --yes
Deployment my-portofolio-8f0l2igfh-qoidrifat.vercel.app ready.
target: preview    status: Ready    id: dpl_8prRfR8gda9t4SAF2gnezmJZoxaE
```

Deployment succeeded. **Header verification against the preview is blocked:**
the project has Vercel Deployment Protection enabled, so every path returns
`302` to `vercel.com/sso-api` regardless of extension.

```
/                      -> 302
/sw.js                 -> 302
/manifest.webmanifest  -> 302
/assets/               -> 302
```

`vercel curl` (the CLI feature that generates a protection-bypass token) fails
in this environment:

```
> Successfully generated deployment protection bypass token for project prj_VaJOTpgyy4CHcHDuW4U8PFG5VmqG
curl: (3) URL rejected: Malformed input to a URL function
```

No bypass token was written to disk; nothing was persisted from that call.

**What this means:** the preview proves the build deploys and reaches `Ready`. It
does **not** prove header delivery over Vercel's edge. Header delivery is proven
against an HTTP server reproducing Vercel's header map exactly (`csp-runtime.mjs`),
which is a strong local proof but not edge proof.

**To unblock, the owner must do one of:**

1. Open the preview URL in a browser while signed in, then capture response
   headers from DevTools → Network → the document request, or
2. Disable Deployment Protection for the project temporarily, or
3. Promote to production and re-run the verification commands in §11 of the
   previous report.

---

## 12. Remaining residual risks

| # | Risk | Status | Detail |
|---|---|---|---|
| R1 | Production headers not live | **BLOCKED** | Preview behind SSO; production still serves the pre-Phase-10 build. Owner action or production promote required. |
| R2 | Git history still exposes internal operational files | **ACCEPTED_RISK** | 13 + 3 + 3 commits. No valid secret in any of them. Needs `filter-repo` + force-push approval. |
| R3 | Formspree direct POST | **ACCEPTED_RISK** | Honeypot + 60 s client cooldown only. A `curl` loop still reaches the endpoint. Server-side rate limiting needs the Formspree dashboard or an own endpoint plus CAPTCHA. |
| R4 | `total-js` headroom is 0.3 KB | **WATCH** | Router v7 owns 174 KB of it. Next dependency addition needs a chunk split, not a threshold bump. |
| R5 | `glob@14` override is above workbox's declared range | **PARTIALLY_MITIGATED** | Proven compatible today via precache manifest + 10 tests. A future workbox release could assume glob 11 semantics; the test suite fails loudly if the manifest shape changes. |
| R6 | `style-src 'unsafe-inline'` | **ACCEPTED_RISK** | Tailwind and framer-motion emit inline styles. Not an execution vector. |
| R7 | Mascot `<line>` y1/y2 console errors | **Pre-existing, out of scope** | `MascotCharacter.jsx` is untracked WIP. Not introduced by this phase. |
| R8 | GitHub Actions never executed | **VERIFIED_LOCAL only** | Static + upstream-declaration validation. First real run is on push. |
| R9 | Production deploy not performed | **BLOCKED** | Requires explicit owner approval. |

---

## 13. Final release recommendation

**`CONDITIONAL_PASS`**

Safe to commit and push. Safe to promote to production **after** the owner
accepts that the header rollout will be verified post-deploy rather than
pre-deploy.

Conditions to move from `CONDITIONAL_PASS` to `PASS`:

1. Promote a deployment containing `vercel.json` to production.
2. Confirm on `https://qoidlab.my.id`:
   ```
   curl -sI https://qoidlab.my.id/ | grep -iE 'content-security-policy|x-frame-options|x-content-type-options|referrer-policy|permissions-policy|strict-transport-security'
   ```
   Expect eight headers and `strict-transport-security: max-age=63072000`
   **without** `includeSubDomains`.
3. Confirm a hashed asset still returns `Cache-Control: public, max-age=31536000, immutable`.
4. Load the site and check DevTools console for CSP violations — expect none.

Everything else in this phase is verified locally with reproducible commands.
Nothing in this phase disables a security control, weakens a lint rule, raises
a budget, or downgrades a dependency.
