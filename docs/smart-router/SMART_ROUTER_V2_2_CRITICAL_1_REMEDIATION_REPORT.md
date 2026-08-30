# Smart Router V2.2 — CRITICAL-1 Remediation Report

**Task:** Fix CRITICAL-1 (broken model-identity contract) found in `SMART_ROUTER_V2_2_WAVE2_ADVERSARIAL_REVIEW.md`
**Date:** 2026-08-30
**Verdict:** **PASS WITH VERIFICATION EVIDENCE** (remediation complete; independent re-review pending)
**Scope guard:** Only CRITICAL-1. MEDIUM-1/2/3, LOW-1..4 remain open. No V2.1 changes, no promotion, no OPTIMIZED/AUTO mode.

---

## 1. Baseline (Phase 0)

| Gate | Result |
|---|---|
| `npm test` | 290/290 passed (17 files) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm run build` | exit 0 |

## 2. Root cause recap

`wire.ts attributionOrAudit` stored the **provider-qualified** model string (`"b-ai/glm-5.3-flash"`, the host.ts `attributionFromRoute` format) as `chain.candidate.modelId`. The store's `candidateKey` then produced `b-ai/b-ai/glm-5.3-flash#high` (double prefix), while the engine's candidateId vocabulary — consumed through `parseCandidateId` — resolves to `b-ai/glm-5.3-flash#high`. Every evidence-provider lookup therefore missed; all tiers stayed UNPROVEN; the evidence loop was closed in telemetry but open in scoring. Wave-2 tests missed it because the `exec()`/`t1()` helpers bypass `wire.ts` with already-unqualified modelIds.

## 3. Canonical identity contract (single parser, two projections)

One canonical helper now owns the qualified→canonical split, and every vocabulary derives from it:

```
host attribution model:  "b-ai/glm-5.3-flash"            (provider-qualified, Attributed flat schema)
        │ parseQualifiedModel  (evaluation-store.ts — single source of truth)
        ▼
canonical identity:      { providerId: "b-ai", modelId: "glm-5.3-flash", variant }
        ├── store chain.candidate / candidateKey  → "b-ai/glm-5.3-flash#high"   == engine candidateId
        ├── evidence-snapshot parseCandidateId    → delegates to the same parse
        └── telemetry T1/T2 (observability)       → keeps the qualified modelId (contract pinned
                                                    by v22-host-integration.test.ts:225,329)
```

**Decision record — why telemetry stays qualified:** the T2/T1 telemetry rows are the *Attributed flat schema* (observability contract, asserted by existing Wave-1-era host-integration tests). The store is the *candidate-key vocabulary* (must equal engine candidateId). The bug was that one object fed both; the fix keeps two explicit projections from one parse instead of re-qualifying in telemetry.

## 4. Changes (3 source files + 1 new test)

| File | Change |
|---|---|
| `.opencode/smart-router/v22/evaluation-store.ts` | Add exported `parseQualifiedModel(model): { providerId: string \| null; modelId: string }` beside `candidateKey`: first-`/` split; absent provider / leading / trailing slash ⇒ `providerId: null`. |
| `.opencode/smart-router/v22/wire.ts` | New `storeIdentity(a)`: `providerId = a.providerId ?? canonical.providerId ?? "unknown"`, `modelId = canonical.modelId \|\| "unknown"`. `emitEvaluation`/`emitExecutionOutcome` build **store-bound** records with the canonical identity while `emitT1`/`emitT2` keep the qualified base. `attributable()` now checks the store identity. |
| `.opencode/smart-router/v22/evidence-snapshot.ts` | `parseCandidateId` delegates to `parseQualifiedModel` (behavior-preserving refactor; all prior edge semantics — `#high`, `no-slash`, `b-ai/`, `b-ai/glm#` ⇒ null — unchanged). |
| `tests/smart-router/v22-identity-integration.test.ts` | **New** — 13 tests (below). |

**Unchanged:** `host.ts`, `replay.ts` (`candidateIdOf` already maps the qualified `v21Route.modelId` passthrough to the same candidateId vocabulary), `engine.ts`, `evaluation-store.record/recordExecution` (they consume whatever identity the caller passes).

## 5. New regression tests (13)

`parseQualifiedModel` units (qualified, nested path, no-provider, empty, leading/trailing slash, null/undefined) · `parseCandidateId` delegation pins (valid + malformed ⇒ null) · **THE regression**: real wire flows with the qualified host model produce store segment keys `routine-review|b-ai/glm-5.3-flash#high` with **zero** `b-ai/b-ai` substrings · snapshot resolves evidence for the engine candidateId · engine tiers KNOWN_EVIDENCED for both candidates, good model selected · cold-start control (empty store ⇒ all UNPROVEN, D-COLD ladder head) · determinism ×5 · variant isolation via the real wire path (`#high` vs `#max`) · telemetry keeps the qualified identity · I-016 unknown placeholders stay telemetry-only · replay resolves OBSERVED outcomes through the canonical identity with a qualified `v21Route`.

## 6. Verification evidence

### 6.1 Full regression (post-fix)

| Gate | Baseline | Post-fix | Delta |
|---|---|---|---|
| `npm test` | 290/290 (17 files) | **303/303 (18 files)** | +13 new, −0 broken |
| `npm run typecheck` | 0 | **0** | — |
| `npm run lint` | 0 | **0** | — |
| `npm run build` | 0 | **0** | — |

All pre-existing telemetry pins (host-integration 25/25) and Wave-2 evidence-loop tests (38/38) pass unchanged.

### 6.2 Live 5-flow reproduction (real host path, same script shape as the review probe)

Artifact: `.opencode/ai/verification/v22-wave2-review/critical-1-fixed-probe.json` (before: `critical-1-probe.json`)

| Observation | Before (review probe) | After (fixed probe) |
|---|---|---|
| Store segment keys | `deep-research\|b-ai/b-ai/glm-5.3-flash#high` (double prefix) | `deep-research\|b-ai/glm-5.3-flash#high` (canonical) |
| `doublePrefixKeys` | present | **[]** (both parts) |
| Snapshot quality for `b-ai/glm-5.3-flash#high` | null (invisible) | `observed 1.0, conf 0.331, n 5`; segment `rate 1, n 5` |
| Engine tiers (deep-research flows) | all **UNPROVEN** | X **KNOWN_EVIDENCED**, Y UNPROVEN (correct: no Y data) |
| Telemetry T2 `modelId` | `b-ai/glm-5.3-flash` | `b-ai/glm-5.3-flash` (unchanged — observability contract preserved) |
| Verdict | BLOCKED | **PASS** (5/5 checks) |

### 6.3 Scoring control (routine-review, 40 real host flows / 80 signals)

X (`b-ai/glm-5.3-flash#high`, quality `insufficient`) vs Y (`b-ai/deepseek-v4-flash#high`, quality `good`): snapshot X `observed 0.2, conf 0.662, n 20`; engine `kind ok`, **selected `b-ai/deepseek-v4-flash#high`**, both tiers **KNOWN_EVIDENCED**, 0 excluded. Evidence recorded through the real wire path now drives scoring end-to-end.

### 6.4 H2 degrade note (not a regression)

For `deep-research` the engine still degrades to V2.1 (`reason: "REQUIRED_FLOOR: no floor-verified candidate — C1 V2.1 fallback (H2)"`) because floor credit requires confidence ≥ 0.6 and the observed-only path caps confidence at ×0.5 (n=5 ⇒ 0.33). This is the **designed H2 rule** (low-trust evidence never gates), no longer the identity bug — before the fix the tiers were UNPROVEN (evidence invisible); after the fix X is KNOWN_EVIDENCED and the degrade reason is floor confidence, which the routine-review control proves is reachable once floors are satisfiable.

## 7. Out of scope (unchanged, still open)

- MEDIUM-1: T1 quality entries lack a standalone timestamp (staleness derived from execution timestamp only).
- MEDIUM-2: `NaN` propagation from garbage timestamps on store load.
- MEDIUM-3: `resolveOutcome` ignores `attributionComplete`.
- LOW-1..4 per the adversarial review.

## 8. Artifacts

- `docs/smart-router/SMART_ROUTER_V2_2_CRITICAL_1_REMEDIATION_REPORT.md` (this file; the adversarial review doc is preserved unmodified)
- `.opencode/ai/verification/v22-wave2-review/critical-1-fixed-probe.json` — live before/after evidence
- `.opencode/ai/verification/v22-wave2-review/{rem-test,rem-tc,rem-build,rem-probe,rem-git}.log` — raw gate + probe logs
- `C:\Users\USER\AppData\Local\Temp\opencode\v22-remediation-probe.mts` — probe script
- Probe run: 2026-08-30T06:14:24.601Z (local Windows, repo cwd)

## 9. Next step

**DEEPSEEK RE-REVIEW** of this remediation (per task instruction). Promotion status remains **NOT AUTHORIZED**; production mode remains OFF.
