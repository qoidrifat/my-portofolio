# Smart Router V2.2 — Wave 2: Evidence Loop (H5, M1, M3, M6, M9, M11)

**Status:** Code complete, verified. Promotion NOT AUTHORIZED (OFF in production; SHADOW for verification only).
**Date:** 2026-08-30
**Scope:** Close the evidence loop — T1/T2 telemetry → EvaluationStore → aggregation → snapshot providers → V2.2 engine — plus deferred Wave 1 items M1, M3, M6, M9, M11 and H5.
**Wave 1 report:** `SMART_ROUTER_V2_2_WAVE1_REMEDIATION_REPORT.md`

---

## 1. What Wave 2 delivers

| Item | Gap | Fix | Where |
|------|-----|-----|-------|
| H5 | T1/T2 telemetry never reached the EvaluationStore | Wire layer emits both signals to an optional `EvaluationStore` sink with deterministic, idempotent IDs | `wire.ts` |
| M1 | Model-level aggregation was a stub | Variant-scoped primary, model-level fallback at n≥20 (confidence capped 0.5 + `inheritedFrom`), taskClass-scoped, no cross-model pooling beyond the documented fallback | `evidence-snapshot.ts`, `evaluation-store.ts` |
| M3 | Recent-success window ignored segments | `recentSuccessBySegment` keyed `taskClass\|candidateKey`, last-20 eligible window, excluded denominators surfaced | `evaluation-store.ts` |
| M6 | Failure taxonomy missing | `classifyFailure` (output-length → MODEL_RELEVANT; environment flags → ENVIRONMENT; cancel → USER; explicit class passthrough; else UNKNOWN), per-candidate breakdown with Phase 15 denominator `classified` | `evaluation-store.ts` |
| M9 | Replay resolved nothing from the store | `resolveOutcome(outcomeRefs, store, routeId)` matches `chain.executionId` + non-null execution; OBSERVED only when resolved | `replay.ts` |
| M11 | Hysteresis state memory-only | `HysteresisStateStore` — append-only JSONL, last-wins load, corrupted lines skipped, fail-open | `hysteresis-store.ts`, `host.ts` |
| (new) | Evidence quality had no observed path | Observed-only quality (conf ×0.5 cap) and blended path preserved; observed evidence can never gate floors (0.45 < 0.6 confGate) — re-rank only | `evidence.ts` |

---

## 2. Design decisions

### 2.1 Merge semantics (`evaluation-store.ts`)

Signals are grouped by `chain.executionId`:

- **Explicit audit flag wins:** a signal with `attributionComplete === false` never merges — it stays a standalone audit row even if a complete partner exists later.
- **Conflict detection:** two non-null executions in one group with differing non-empty values → the whole group is demoted to audit-only (`stats.conflicts` counts it, `stats.auditOnly` lists it).
- **Convergence order-independent:** T2-then-T1 and T1-then-T2 both reach one merged signal. `recordExecution` derives `attributionComplete` from the chain *excluding* `evaluationId` (T2 cannot know it), while `isAttributionComplete` (Wave 1 H7) still requires it — so a T2-only signal is not vetoed prematurely but is not counted complete until the T1 partner arrives.
- **Accounting:** `total = attributed + auditOnly + incomplete` (no double counting); NaN-timestamp guard in `aggregate()`.

### 2.2 Deterministic identity (`wire.ts`)

`SIG-EVAL-${executionId}` / `EVAL-${executionId}` — re-emission of the same execution is idempotent by construction (no UUID lottery). "unknown" placeholders keep the signal telemetry-only via `attributable()`.

### 2.3 Hierarchy without fabrication (`evidence-snapshot.ts`)

`resolveObservedQuality`: own VARIANT segment wins; MODEL fallback only at n≥20, with confidence capped at 0.5 and `inheritedFrom: "model"` marked. Everything is taskClass-scoped. No cross-class, no cross-model invention.

### 2.4 Observed evidence can never block

Confidence cap chain: observed conf ≤0.9, observed-only path ×0.5 → ≤0.45 < confGate 0.6. Consequence: observed-only evidence participates in scoring/re-ranking but can never satisfy a quality floor. Low-trust evidence never blocks a candidate; it can only re-rank.

### 2.5 M11 fail-open persistence

Append-only JSONL (`session::taskClass::risk` key, last-wins). Load skips corrupted lines; write failures are swallowed (`hysteresis-store.ts` is never allowed to break routing). Verified: state written by host instance 1 is loaded intact by a fresh instance.

### 2.6 H2 fallback interacts with the loop (verified live)

Once the store holds attributed evidence for a class, a cold-start decision (no floor-verified candidate, capability UNKNOWN) correctly degrades to V2.1 (H2 rule: `floorsDeclared && !anyFloorVerified && any KNOWN_EVIDENCED`). This is why the live hysteresis check asserts persistence of the first state entry rather than an entry per flow — the second flow is *supposed* to fall back and not write state. Confirmed in live verification (§4).

---

## 3. Verification evidence

### 3.1 Automated tests

- New: `tests/smart-router/v22-wave2-evidence-loop.test.ts` — **38 tests** covering H5 bridge (sink records, deterministic IDs, unknown-placeholder guard, host flow lands T1+T2 in store), idempotency, out-of-order convergence (both orders), conflict → audit-only, 7 incomplete-attribution cases, M1 variant isolation + model fallback + taskClass scoping, shrinkage/freshness math, M3 segmentation, M6 taxonomy + denominators, M9 resolution, M11 store (last-wins, corruption, unwritable path), closed-loop positive/negative controls, determinism ×5, snapshot helpers, fail-open store.
- Wave 1 pins untouched and green: `tests/smart-router/v22-wave1-remediation.test.ts`.
- One data fix in `tests/smart-router/v22-engine-integration.test.ts` (SIG-5 → `executionId: "E4"`): under merge semantics the old fixture collided with SIG-1's group and became audit-only. Assertion semantics unchanged.
- **Full suite: 290/290 pass (17 files).** `npm run typecheck` clean. `npm run lint` clean. `npm run build` clean. (2026-08-30)

### 3.2 Live verification (SHADOW on disposable root; OFF on real root)

Artifacts: `.opencode/ai/verification/v22-wave2/{bridge-results.json, off-mode.json, performance.json}` (emitted 2026-08-30 by a temporary script; not committed as code).

| Check | Result |
|---|---|
| Closed loop: host flow → exactly 2 signals (T1+T2), same `executionId` | PASS (`sameExecutionId: true`) |
| Idempotency: re-emit same execution | PASS (2 signals after re-emit) |
| M9 replay resolution | `OBSERVED` via `SIG-exec-…` |
| M11 cross-instance persistence | PASS (state reloaded intact) |
| Determinism ×5 stats runs | PASS (identical output) |
| OFF-mode inertness on real root | PASS (no store created, no throw) |
| Perf: ingest 500 execution signals + stats | ingest 3.21 ms, stats 1.97 ms (budget 50 ms) |

---

## 4. Residual debt (explicit)

1. **Hysteresis key collision safety:** `session::taskClass::risk` assumes session IDs are unique per session; fine for one process, revisit if multi-agent same-session writes ever occur.
2. **Model fallback conf cap (0.5) is a policy constant** (`toObserved` in `evidence-snapshot.ts`); revisit with data after SHADOW accrues volume.
3. **`qualityByCandidate` (legacy pooled) retained** for Wave 1 compatibility; segments are the canonical source going forward.
4. Wave 1 debt items (§6 of Wave 1 report) remain unchanged.

## 5. Promotion status

Unchanged from Wave 1: **OFF in production.** The loop is exercised in SHADOW during verification. Authorization to promote remains a separate, explicit decision gated on shadow-volume data (see `SMART_ROUTER_V2_2_IMPLEMENTATION_GATE.md`).
