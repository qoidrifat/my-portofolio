# NARA — GATE 0: Baseline Audit

**Date:** 2026-11-25
**Repository:** `D:/Workspace/projects/my-portofolio`
**Branch:** `security/release-candidate-2026-11`
**HEAD:** `85b3041`
**Status:** Read-only reconnaissance complete. Source untouched.

**Verdict: `BLOCKED`** — two hard prerequisites cannot be satisfied without owner decisions. Details in §9.

---

## 1. Repository state

| Field | Value |
|---|---|
| Root (verified via `pwd`) | `/d/Workspace/projects/my-portofolio` |
| Branch | `security/release-candidate-2026-11` |
| HEAD | `85b304179bdee56ff1714cae37fdab995660e1a8` |
| Tracked tree | clean |
| Untracked | 3 internal `.opencode` artifacts, deliberately excluded from the release |
| Work in progress | The release-candidate branch is mid-release (Phase 13-A2 staged production verified, not promoted) |

Path note: the brief states `D:\Workspaces\projects\my-portofolio`. That path does not exist. The actual root is `D:\Workspace\projects\my-portofolio` (no trailing `s`). Verified before any command ran.

**Decision:** NARA must not be developed on this branch. It is a verified release candidate awaiting promotion. Starting feature work here would entangle unreleased security remediation with a large new feature. A dedicated branch is required — see §10.

---

## 2. Existing mascot architecture

| File | Lines | Role |
|---|---|---|
| `src/components/mascot/PortfolioMascot.jsx` | 7.0 K | Widget shell, speech bubble host, chat affordance |
| `src/components/mascot/MascotCharacter.jsx` | 14.9 K | SVG character, expressions, gaze, blink |
| `src/components/mascot/MascotSpeechBubble.jsx` | 4.3 K | Bubble UI, dismiss, actions |
| `src/components/mascot/mascot.constants.js` | 1.9 K | Expressions, copy, timings |
| `src/components/mascot/useMascotEngine.js` | 5.4 K | Behavior state machine, idle scheduling |

Current implementation is **inline SVG**, not 3D. It is lazy-loaded from `HeroSection.jsx:7`:

```js
const PortfolioMascot = lazy(() => import('@/components/mascot/PortfolioMascot'));
```

Reusable behavior worth preserving: expression state machine, bounded pointer tracking, blink scheduling, bubble dismissal rules, reduced-motion handling.

### SVG animation hazard — confirmed and already fixed once

`MascotCharacter.jsx` previously animated SVG length attributes:

```jsx
<motion.line ... animate={{ y1: bL1, y2: bL2 }} />
```

framer-motion wrote `y1="undefined"` mid-spring, which Chromium logs as
`<line> attribute y1: Expected length, "undefined"`. Fixed in commit `1e843aa`
by keeping geometry constant and animating a `y` **transform** instead.
`tests/vercel-config.test.js` does not cover this; the guard is the fix itself
plus the CDP harness at `.security-audit/mascot-probe.mjs`, which asserts zero
invalid length attributes.

Any NARA implementation must not reintroduce animated SVG geometry attributes.

---

## 3. Intro completion mechanism — verified

`src/App.jsx`:

```js
const [introDone, setIntroDone] = useState(() => hasIntroPlayed());
```

- Real completion signal: `<PortfolioIntro onFinish={() => setIntroDone(true)} />`
- Exit-start hook: `onExitStart={handleIntroExitStart}`
- Session flag: `sessionStorage['qr-intro-played'] === '1'` (`INTRO_SESSION_KEY`)
- Fail-safe: `setTimeout(INTRO_MAX_MS + 1000)` forces `introDone` if the intro hangs
- Error path: `IntroErrorBoundary` → `handleIntroError` → forces `introDone`

**NARA's entrance must key off `introDone === true`,** not a timer. The safety
timeout already guarantees `introDone` eventually becomes true, so a NARA
component mounted under the same flag inherits the fail-safe for free.

---

## 4. Stack and dependency reality

| Package | Installed | Note |
|---|---|---|
| react / react-dom | 18.3.1 | **R3F v8 required, not v9** |
| vite | 6.4.6 | |
| framer-motion | 11.18.2 | |
| react-router-dom | 7.18.6 | |
| tailwindcss | 3.4.19 | |
| three / @react-three/fiber / drei | **NOT INSTALLED** | requires an approved dependency decision |
| vitest | 4.1.12 | 463 tests currently passing |

Rule 5 (no speculative dependencies) is satisfied by measurement, not assumption — see §5.

---

## 5. Performance budget — measured, and it is the primary blocker

Budget configuration `performance-budget.json`:

```
total-js     790000 bytes   (771.5 KB)
largest-js   420000 bytes   (410.2 KB)
bundle-count         18
```

Measurement method (`scripts/check-budget.mjs`, verified this session):
`measureDist()` sums **every** `.js` file in `dist/assets/`. Lazy chunks count.
The PRD's warning on this point is correct and confirmed in code.

Current state:

```
total-js     771.0 KB / 771.5 KB   → 0.5 KB headroom
largest-js   197.9 KB / 410.2 KB
bundle-count       17 / 18         → 1 slot left
```

Measured cost of the 3D runtime, tree-shaken bundle of `three` + `GLTFLoader` +
`OrbitControls`, minified:

```
three.module.js alone : 658.9 KB raw / 126.3 KB gzip
bundled entry         : 796.7 KB raw / 202.4 KB gzip
```

`@react-three/fiber` v8 and `drei` are additive on top of that.

Projected total:

```
771.0 KB (current) + ~797 KB (three bundle) ≈ 1568 KB
1568 / 771.5 ≈ 203% of the total-js budget
```

Also `bundle-count` would exceed 18 the moment R3F adds its own chunk.

**Conclusion:** a realistic 3D character cannot be shipped under the existing
performance policy. Per the brief this is a STOP condition, not a reason to raise
the threshold. Three legitimate paths exist and all require an owner decision —
see §9.

---

## 6. Server-side capabilities — absent

| Requirement | Actual state |
|---|---|
| `api/` directory (Vercel functions) | **ABSENT** |
| `server/` directory | **ABSENT** |
| `functions` / `builds` in `vercel.json` | none |
| Framework setting in Vercel project | `create-react-app` |
| Existing chat / AI code | none |
| Existing durable storage | none |

The project is a pure static SPA. `vercel.json` currently contains:

```json
"rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
```

A catch-all rewrite is in place. Vercel evaluates filesystem and function routes
before rewrites, so `/api/*` functions would still resolve — but this must be
verified empirically on a preview deployment, not assumed, because the same
catch-all previously masked routing bugs for an entire release cycle.

---

## 7. Secret management — verified clean

| Check | Result |
|---|---|
| `.env.local` present | yes (gitignored) |
| `DEPLOY_API_KEY` in `.env.local` | **absent** |
| `DEPLOY_API_KEY` anywhere in repo | absent |
| `.env.example` | **ABSENT** — must be created with placeholders only |
| `VITE_*` secrets | none; prior audit confirmed 0 real secrets in full git history |

No credential exists for the Deploy provider. API smoke testing is therefore
blocked until the owner provisions one server-side (§9).

---

## 8. Content sources for the knowledge base

| Source | Exists | Use |
|---|---|---|
| `src/lib/data.js` | yes (17 KB) | profile, skills, techCategories, journey, contact |
| `src/lib/projects-data.js` | yes (54 KB) | 8 projects with case studies |
| `public/Qoid-Rifat-CV.pdf` | yes | CV content, must not be parsed at runtime |
| Published contact | `qoidrifat23@gmail.com`, WhatsApp, LinkedIn, GitHub | allowlisted |

All 8 project slugs verified present: `facial-expression-recognition`,
`agent-status`, `aurex`, `cashflow`, `payrollpro`, `explore-bali`,
`superfood-ofd-scraper`, `qoid-ra-psd`.

No metrics may be invented. The existing data contains documented impact claims
only where the owner authored them; NARA must quote, not extrapolate.

---

## 9. Implementation blockers

### B1 — 3D runtime exceeds the JS budget by ~100% (HARD)

Measured above. Options, all requiring explicit owner approval:

| Option | Effect | Cost |
|---|---|---|
| A. Approve a separate budget line for lazily-loaded 3D | `total-js` splits into `initial-js` + `total-js`; gate stays meaningful | Requires editing `performance-budget.json` + `check-budget.mjs`. Against Rule 4 unless explicitly authorized. |
| B. Reduce scope to a 2D/canvas character | Fits budget | Violates the PRD's realistic-3D requirement. Must be an owner decision, not a silent substitution. |
| C. Ship 3D only on capable devices | Budget still counts emitted bytes | Does not solve the gate. |

I will not choose B silently or raise the threshold under option A without
authorization.

### B2 — No durable rate-limit / budget store (HARD)

PRD §7.4 forbids in-memory counters and forbids adding a paid service without
authorization. No store exists. Without one, `SR-010` fail-closed cannot be
implemented honestly and the chat API cannot be declared production-ready.

Options: Vercel KV / Upstash Redis (paid), or accept a documented local-only
adapter with the production gap declared blocking.

### B3 — No `DEPLOY_API_KEY` (HARD for GATE 3+)

Cannot smoke-test the provider, cannot verify model ID `zai-org/glm-5.3-flash`,
cannot verify usage accounting. Everything up to GATE 2 can still proceed.

### B4 — Vercel function topology unverified (MEDIUM)

`/api/*` under a catch-all rewrite must be proven on a preview before relying on
it. Not assumed.

---

## 10. Proposed implementation architecture (adapted to this repo)

The PRD proposes `.tsx`. This repo is JSX-only for app code with `// @ts-check`
JSDoc on libraries. Following repo convention:

```text
api/
  nara-chat.js                 # Vercel function, server-only

src/components/nara/
  NaraWidget.jsx               # floating shell, mounted from Layout
  NaraScene.jsx                # lazy R3F canvas + Suspense boundary
  NaraCharacter.jsx            # GLB load, AnimationMixer, gaze/blink
  NaraSpeechBubble.jsx         # reuse bubble patterns from mascot
  NaraChatPanel.jsx            # floating panel / mobile bottom sheet
  NaraLoadingFallback.jsx      # static fallback, no WebGL

src/lib/nara/
  animation-states.js          # deterministic state machine + priority
  chat-client.js               # same-origin fetch wrapper
  chat-suggestions.js          # from verified portfolio data
  nara-copy.js                 # EN / ID strings
  knowledge.js                 # normalized allowlisted portfolio facts

server/nara/                   # imported by api/nara-chat.js
  topic-guard.js
  portfolio-context.js
  prompt-policy.js
  response-validator.js
  rate-limiter.js
  usage-accounting.js
  deploy-provider.js

docs/nara/
  00-baseline-audit.md         # this file
  01..06                       # subsequent gates
```

Integration points:

- Mount: `src/Layout.jsx`, next to `CommandPalette`, lazy + Suspense.
- Entrance: driven by the existing `introDone` flag, not a new timer.
- Feature flag: `localStorage['nara-enabled']` or build-time flag, so the SVG
  mascot remains the rollback path (PRD §31).
- CSP: `connect-src 'self'` already permits same-origin `/api/nara/chat`. GLB
  must be served same-origin, which `img-src 'self'` does not cover — a `media-src`
  or `connect-src` review is required before shipping the model.

---

## 11. What can proceed now

GATE 1 (knowledge inventory + asset specification), the server-side logic and
tests, and the chat UI with mocked responses. All are additive, testable, and
touch no production surface.

GATE 2's 3D rendering cannot be completed under the current budget without a
decision on B1. GATE 3+ is blocked on B2 and B3.

No source file was modified in this gate.
