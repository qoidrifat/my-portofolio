# Smart Router V2.2 — Wave 2 Adversarial Review

**Reviewer:** independent (read-only)
**Date:** 2026-08-30
**Scope:** closed-loop evidence (H5), aggregation (M1/M3/M6), replay (M9), persistence (M11), hysteresis concurrency, data integrity, design drift, test quality.
**Method:** source inspection of `.opencode/smart-router/v22/*`, Wave 1/2 test suites, docs comparison, runtime probe. No code changes. No policy/breaker/registry modifications.

**Verdict: BLOCKED**

One CRITICAL finding disconnects the evidence loop in the real host wiring. The tests pass only because they use unqualified modelId, masking the mismatch. The loop is mechanically correct in isolation but broken end-to-end.

---

## Findings

### CRITICAL-1 — wire.ts emits qualified modelId as `modelId`; evidence-snapshot expects unqualified → key mismatch, evidence loop disconnected

**Location:** `wire.ts:44` (attributionOrAudit: `modelId: a.model ?? "unknown"`), `wire.ts:124-125` (ExecutionOutcome.modelId), `evaluation-store.ts:203-206` (chain.candidate.modelId), `evidence-snapshot.ts:92-101` (parseCandidateId), `evidence-snapshot.ts:80-84` (segment provider key).

**The bug:**

`wire.ts` has two model concepts:
- `providerId` — extracted in `attributionFromRoute` at `host.ts:91` via `model.split("/")[0]` → `"b-ai"`
- `model` — the full qualified string `"b-ai/glm-5.3-flash"` — passed through `AttributionInput.model` → `wire.ts:44` → `modelId: a.model ?? "unknown"`

So `ExecutionOutcome.modelId` = `"b-ai/glm-5.3-flash"` (qualified).

The store's `candidateKey()` (`evaluation-store.ts:444`) produces `"b-ai/b-ai/glm-5.3-flash#high"` — double-qualified.

The engine's candidates use `candidateId: "b-ai/glm-5.3-flash#high"` (provider-qualified model). `parseCandidateId` splits at first `/` → `providerId="b-ai"`, `modelId="glm-5.3-flash"`. `candidateKey` → `"b-ai/glm-5.3-flash#high"`.

**Result: every evidence lookup key in the snapshot has a mismatch.**
- Store key: `"deep-research|b-ai/b-ai/glm-5.3-flash#high"`
- Engine lookup key: `"deep-research|b-ai/glm-5.3-flash#high"`
- **No match. All providers return null. The entire evidence loop is disconnected.**

**Empirical proof (runtime probe):**

```
store signals: 10
recentBySegment: deep-research|b-ai/b-ai/glm-5.3-flash#high:rate1:n5:conf0.33
qualityBySegment: deep-research|b-ai/b-ai/glm-5.3-flash#high:mean1:conf0.33
engine tier:                    UNPROVEN (all candidates)
```

`b-ai/b-ai/` — double prefix. Engine looks up single prefix → null → neutral → `UNPROVEN` → evidence never reaches scorer.

**Why tests pass:** The test helpers (`v22-wave2-evidence-loop.test.ts:48-58`, `:61-77`) construct `exec()` with `modelId: "glm-5.3-flash"` (unqualified). The closed-loop test stores records directly via `store.record(t1(...))` and `store.recordExecution(exec(...))` — going around the wire layer entirely. The wire unit tests (`:100-136`) test wire in isolation but never verify the full path: wire → store → snapshot → engine. The end-to-end test (`:124-136`, "host flow closes the loop") checks only that signals land in the store, not that the snapshot can read them back.

**Severity: CRITICAL.** The entire closed-loop evidence architecture is defective at the integration boundary. Evidence is collected, stored, aggregated — but never consumed by the engine because the key format is wrong. All Wave 2 shadow decisions receive zero evidence regardless of how many executions accumulate.

**Fix:** `wire.ts` `attributionOrAudit` must extract the unqualified model from the qualified string, or the snapshot's key construction must match the qualified modelId format. The simplest fix: `modelId: a.model?.split("/")[1] ?? a.model ?? "unknown"` — but this requires verifying the model format is always qualified (`provider/model`). The host constructs it as `model.split("/")[0]` for provider and `model.split("/")[1]` for model in `attributionFromRoute` — consistent. The `AttributionInput.model` is the qualified string. Extract the unqualified modelId.

### CRITICAL-1b — Cascade: all downstream statistics are disconnected

Because `providersFromEvidenceStore` returns null for every quality and segment lookup, the engine always sees neutral evidence. Specific consequences:

- `qualityBySegment` / `qualityByModel` / `recentSuccessBySegment` in store → populated with double-qualified keys → never queried.
- `reliabilityByCandidate` → same key mismatch → never queried.
- `resolveObservedQuality` → returns null for every call → observed-only quality path never fires.
- Engine sees all dimensions UNKNOWN → all candidates `UNPROVEN` → only cold-start (D-COLD) ladder head selected.
- H2 rule never fires (no KNOWN_EVIDENCED candidates) → engine always returns `kind: "ok"` with `degradedToV21: false` and `stickinessApplied: false` (no hysteresis state written).
- Wave 2 report's claim that "observed evidence can influence scoring" is false in real host wiring.

### MEDIUM-1 — T1 quality entry has no timestamp → staleness bypass for T1-only aggregates

**Location:** `wire.ts:93-98`, `evaluation-store.ts:318`, `evaluation-store.ts:280-283`.

**Mechanism:** `emitEvaluation`'s `quality` object lacks `timestamp`. In `stats()`, timestamp falls back to `m.execution?.timestamp` — null for T1-only groups → `""` → `ageDays = 0` → never decays. Reachable when dispose fires without T2 (rare). T1-only is rare in normal flow.

### MEDIUM-2 — No schema/NaN guard on store load; garbage timestamps propagate NaN

**Location:** `evaluation-store.ts:149-160`, `effectiveConfidence`/`aggregate` (`:51-57`, `:277-287`).

**Mechanism:** `load()` validates JSON syntax only. `Date.parse("garbage")` → NaN → `Math.max(0, NaN)` → NaN → freshness NaN → confidence NaN → NaN propagates into scores. Requires file corruption but JSON.parse already passes.

### MEDIUM-3 — `resolveOutcome` does not require attribution completeness

**Location:** `replay.ts:75-82`.

**Mechanism:** `resolveOutcome` matches `s.chain.executionId === ref && s.execution !== null`, ignoring `attributionComplete`. An unattributed T2 row (chain "unknown") resolves OBSERVED. `observedOutcomes` counter inflates.

### LOW-1 — Model-level fallback pools across variants (by design, note boundary)

**Location:** `evaluation-store.ts:313-327` + `evidence-snapshot.ts:33-35`.

**Mechanism:** `qualityByModel` pools all variants under one model key. `resolveObservedQuality` serves pooled value to any variant at conf ×0.5 (≤0.25 after observed-only ×0.5). `GLM#max` inherits `GLM#high` quality. Documented design, but has re-ranking effect.

### LOW-2 — `parseCandidateId` splits on first `/` only

**Location:** `evidence-snapshot.ts:92-101`.

**Mechanism:** `candidateId.indexOf("/")` — if modelId ever contains `/`, misparses. Dormant with current registry.

### LOW-3 — Hysteresis concurrency: last-wins append, no read-modify-write across hosts

**Location:** `hysteresis-store.ts:26-52`.

**Mechanism:** two hosts writing same key → last-wins on load. Single-writer assumption. Theoretical.

### LOW-4 — `qualityByCandidate` (legacy pooled) computed but unused

**Location:** `evaluation-store.ts:367-372`. Snapshot uses `qualityBySegment`/`qualityByModel` only.

### INFO-1 — Aggregates O(n) per shadow decision

**Location:** `host.ts:208` → `providersFromEvidenceStore` → `store.stats(nowMs)`. 500 signals → ~2 ms. Linear. Acceptable for shadow.

### INFO-2 — Test design gap: wire layer's modelId mismatch not caught

The `exec()` test helper uses unqualified `modelId`. The closed-loop tests go through `store.record`/`store.recordExecution` directly, never through `wire.ts` → `EvaluationStore.recordExecution`. The wire unit tests (`H5: wire → evaluation-store bridge`) test that signals land in the store, but never verify the snapshot can read them back. A test exercising `wire(qualified) → store → snapshot → engine` is missing and would have caught CRITICAL-1.

### INFO-3 — H2 C1 rule's interaction with evidence is moot

HIGH-1 from the draft is withdrawn (H2 suppression doesn't fire because evidence never reaches the engine). If CRITICAL-1 is fixed, H2 would fire (correctly degrade) due to UNKNOWN capability level — but that's a separate design discussion, not a Wave 2 bug.

---

## Per-area verdicts

| Area | Verdict | Note |
|---|---|---|
| H5 Evidence Bridge | **PASS (unit)** | deterministic ids, sink guard, signal landing verified. Integration path broken (CRITICAL-1) |
| Attribution | **PASS** | 7 incomplete cases pinned; audit-only never aggregates |
| Merge Semantics | **PASS** | order-independent, conflicts → audit-only, explicit audit veto |
| M1 Variant Aggregation | **PARTIAL** | variant isolation works in unit/isolation tests. Integration path broken (CRITICAL-1) |
| Variant Isolation | **PASS (unit)** | GLM#high vs GLM#max isolated in test helpers |
| M3 Segmentation | **PARTIAL** | taskClass|candidate keys correct in isolation. Integration broken (CRITICAL-1) |
| M6 Failure Attribution | **PASS (unit)** | taxonomy correct, env/user excluded, denominators visible |
| Quality Update | **PARTIAL** | all paths attribution-gated. Integration broken (CRITICAL-1) |
| M9 Replay | **PASS (with note)** | executionId resolution correct; MEDIUM-3 attribution check gap |
| M11 Persistence | **PASS** | last-wins, corruption skip, fail-open, cross-instance continuity verified |
| Hysteresis Concurrency | **PARTIAL** | single-writer assumption; lost-update theoretical (LOW-3) |
| Closed Loop Positive | **FAIL** | evidence never reaches engine in real host wiring (CRITICAL-1) |
| Closed Loop Negative | **PASS (unit)** | sparse evidence ignored; env/user excluded in isolation tests |
| Idempotency | **PASS** | signalId first-wins, re-emit stable |
| Out-of-Order | **PASS** | both orders converge identically |
| Data Integrity | **PARTIAL** | NaN-from-garbage-timestamp unguarded (MEDIUM-2) |
| T3 Latency | **PARTIAL** | not touched by Wave 2 |
| T4 Cost | **PARTIAL** | unchanged; host cost VERIFIED only when number |
| T5 Capability | **PARTIAL** | T5 records emitted but never consumed |
| Shadow Isolation | **PASS** | no route/permission/breaker/dispatch mutation; OFF-mode inertness verified |
| V2.1 Safety | **PASS** | no V2.1 test loss; hard-deny/continuation/vision untouched |
| Determinism | **PASS** | no Map-iteration dependence; ×5 identical runs |
| Performance | **PASS (mechanical)** | 500 signals 2 ms |
| Test Quality | **PARTIAL** | good unit coverage; integration path between wire → snapshot → engine not tested with qualified modelId (INFO-2) |
| Design Drift | **NONE** | implementation matches architecture docs. The bug is a wiring error, not a design drift |

---

## Findings summary

- **Critical:** CRITICAL-1 — wire.ts emits qualified modelId as modelId → store keys double-qualified → snapshot lookups fail → evidence loop disconnected in real host wiring. All Wave 2 shadow decisions receive zero evidence.
- **Medium:** MEDIUM-1 (T1-only staleness bypass), MEDIUM-2 (NaN on garbage timestamps), MEDIUM-3 (resolveOutcome attribution check)
- **Low:** LOW-1 (model-level pooling), LOW-2 (parseCandidateId split), LOW-3 (hysteresis concurrency), LOW-4 (dead legacy key)
- **Info:** INFO-1 (O(n) per decision), INFO-2 (test gap), INFO-3 (H2 interaction moot)

---

## Required fixes

### Before ANY further work (CRITICAL)

1. Fix `wire.ts:44`: extract unqualified modelId from the qualified model string. Suggested: `modelId: a.model?.split("/")[1] ?? a.model ?? "unknown"` — but verify the `model` format is always `provider/model` (it is: `attributionFromRoute` at `host.ts:91` constructs it that way).

2. Add an integration test that exercises the full path: `wire.ts` (with qualified model) → `EvaluationStore` → `providersFromEvidenceStore` → `resolveObservedQuality` → assert evidence is found. This test must use the same modelId format the real host uses.

3. Re-run all Wave 2 tests after the fix. The passing tests should still pass (they use unqualified modelId). The new integration test should confirm the full path works.

### Before corpus collection

- MEDIUM-2 (NaN guard on timestamps)
- MEDIUM-3 (resolveOutcome attribution completeness)

### Before promotion

- MEDIUM-1 (T1 timestamp)
- LOW-1..4
- INFO-1 incremental aggregation decision
- Corpus-scale validation (unchanged Wave 1 gate)

---

## Final verdict

**BLOCKED.** The evidence loop is disconnected at the critical integration boundary. Evidence is collected, stored, aggregated — but never reaches the engine because store keys use double-qualified modelId while snapshot lookups use single-qualified modelId. Fix CRITICAL-1, add the missing integration test, then re-evaluate. Promotion remains NOT AUTHORIZED (unchanged, now with a concrete blocker beyond the existing corpus requirement).