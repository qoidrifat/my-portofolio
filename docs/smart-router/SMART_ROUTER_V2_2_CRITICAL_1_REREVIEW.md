==================================================
SMART ROUTER V2.2 CRITICAL-1 RE-REVIEW
==================================================

**Reviewer:** independent (read-only, DeepSeek-V4-Flash)
**Date:** 2026-08-30
**Scope:** CRITICAL-1 remediation verification (only). MEDIUM-1/2/3, LOW-1..4 remain open per Wave 2 review — outside scope.
**Method:** source inspection, probe re-run, independent gate execution.

---

## Overall: APPROVED

---

## Per-Phase Results

### Canonical Parser: PASS

`parseQualifiedModel` (`evaluation-store.ts:454-459`) splits at first `/` only. Tested:

- `"b-ai/glm-5.3-flash"` → `{providerId:"b-ai", modelId:"glm-5.3-flash"}`
- `"openrouter/qwen/qwq"` → `{providerId:"openrouter", modelId:"qwen/qwq"}` (nested modelId preserved)
- `"glm-5.3-flash"` → `{providerId:null, modelId:"glm-5.3-flash"}`
- `"provider/"` → `{providerId:null, modelId:"provider/"}` (trailing slash → null provider)
- `"/leading"` → `{providerId:null, modelId:"/leading"}`
- `""` / `null` / `undefined` → `{providerId:null, modelId:""}`

No ambiguous identities. Behavior matches spec.

### No Double Qualification: PASS

`storeIdentity` (`wire.ts:68-74`) produces `{providerId, modelId}` where modelId is always unqualified (from `parseQualifiedModel(a.model).modelId`). `candidateKey` (`evaluation-store.ts:443-445`) constructs `providerId/modelId#variant` — never `provider/provider/model#variant`.

All store-write paths searched:
- `wire.ts:emitEvaluation` → `sink.record(signal)` — canonical
- `wire.ts:emitExecutionOutcome` → `sink.recordExecution(exec)` — canonical
- `host.ts` → all writes through wire
- `cli.ts` → `emitEvaluation` without sink, no store write

No production path writes qualified modelId to the store. Tests calling `store.record()` directly use unqualified modelId — redundant but consistent.

### Store Identity: PASS

Every store signal carries `chain.candidate.modelId` = unqualified. `chain.candidate.providerId` = caller-provided providerId (e.g., "b-ai") or from canonical parse. `modelId` never contains `/` from the original qualified string.

### Snapshot Alignment: PASS

`parseCandidateId` (`evidence-snapshot.ts:92-101`) delegates to `parseQualifiedModel` for the model part. Both store keys and snapshot lookup keys derive from `candidateKey({providerId, modelId, variant})` → `providerId/modelId#variant`.

For `"b-ai/glm-5.3-flash#high"`:
- Store key: `candidateKey({b-ai, glm-5.3-flash, high})` = `"b-ai/glm-5.3-flash#high"`
- Snapshot lookup: `parseCandidateId("b-ai/glm-5.3-flash#high")` → `{b-ai, glm-5.3-flash, high}` → `candidateKey(...)` = `"b-ai/glm-5.3-flash#high"`
- Engine candidate: `candidateId = "b-ai/glm-5.3-flash#high"`

All three identical. Model-level fallback keys (`${providerId}/${modelId}`) also aligned.

### Real Host Format: PASS

The probe script (`v22-remediation-probe.mts`) uses `createHostV22` with:
- `liveModel: "b-ai/glm-5.3-flash"` (qualified)
- `onChatMessage` → `onEvent(message.updated)` → `onDispose` — exactly the real host lifecycle

The integration test (`v22-identity-integration.test.ts`) uses `wireFlow` with `model: "b-ai/glm-5.3-flash"` through `emitExecutionOutcome` + `emitEvaluation` — the same wire layer the host uses.

Independent probe re-run (2026-08-30T14:59Z) confirms: no double prefix, snapshot visible, engine tiers evidenced.

### Five-Flow Reproduction: PASS

Before (`critical-1-probe.json`): store keys `deep-research|b-ai/b-ai/glm-5.3-flash#high` (double prefix). Engine tiers: all UNPROVEN.

After (`critical-1-fixed-probe.json`, independent re-run): store keys `deep-research|b-ai/glm-5.3-flash#high` (canonical). `doublePrefixKeys: []`. Engine tiers: X KNOWN_EVIDENCED.

Same 5 flows, same host input format.

### Evidence Reachability: PASS

Before: `providersFromEvidenceStore` returned null for every quality/segment lookup (key mismatch). After: snapshot quality found (observed 1.0, conf 0.33, n=5). Segment found (rate 1, n=5). Evidence reaches engine.

### Engine Evidence: PASS

Routine-review control (40 host flows per model, 80 signals total):
- X (glm-5.3-flash, quality insufficient) → observed 0.2, conf 0.66, n=20
- Y (deepseek-v4-flash, quality good) → observed 1.0, conf 0.66, n=20
- Engine: kind "ok", selected Y, both KNOWN_EVIDENCED, 0 excluded

Evidence drives scoring end-to-end.

### Deep-Research Floor: EXPECTED

Deep-research engine still degrades to V2.1 (`kind: "degraded"`, `degradedToV21: true`, `reason: "REQUIRED_FLOOR: no floor-verified candidate"`).

This is the designed H2 rule, not identity mismatch:
- Before fix: all UNPROVEN (evidence invisible), engine kind "ok" (silent D-COLD)
- After fix: X KNOWN_EVIDENCED (evidence visible), engine correctly degrades because quality floor requires confidence ≥ 0.6 and observed-only path caps at ×0.5 → n=5 → 0.33 < 0.6

Routine-review control proves evidence-driven scoring works when floors are satisfiable. Deep-research floor behavior is the designed C1 fallback for low-trust evidence.

### Telemetry Contract: PASS

T1/T2 telemetry preserves the qualified modelId:
- `wire.ts:119` — emitT1 receives `base.modelId` = `a.model ?? "unknown"` (qualified)
- `wire.ts:157` — emitT2 receives `base.modelId` (qualified)

Test asserts:
- `t2[0].modelId === "b-ai/glm-5.3-flash"` (identity test line 234)
- `t1 chain.candidate.modelId === "b-ai/glm-5.3-flash"` (identity test line 237)

Host-integration test pins:
- `rows[0].modelId === "b-ai/glm-5.3-flash"` (line 225, Attributed flat schema)
- `chain.candidate.modelId === "b-ai/glm-5.3-flash"` (line 329)

Separation: store gets canonical, telemetry keeps qualified. Intentional and documented.

### Variant Isolation: PASS

Test uses real wire path with `#high` vs `#max` variants:
- `qualityBySegment` key `routine-review|b-ai/glm-5.3-flash#high` → mean 1.0 (COMPLETED/good)
- `qualityBySegment` key `routine-review|b-ai/glm-5.3-flash#max` → mean 0.2 (FAILED/insufficient)
- Keys independent, no double prefix

### Replay: PASS

`replay.ts:candidateIdOf` (`replay.ts:46-51`):
- `v21Route.modelId` already qualified → passthrough (no re-qualify)
- Output: `"b-ai/glm-5.3-flash#high"` — no double prefix

Test: replay with qualified `v21Route.modelId = "b-ai/glm-5.3-flash"` produces `v21CandidateId = "b-ai/glm-5.3-flash#high"` (no `b-ai/b-ai`), outcome resolved OBSERVED, `v22Selected` not null.

### D-COLD: PASS

Empty store test: all candidates UNPROVEN, D-COLD ladder head (ladderRank 0) selected — never ASCII winner. Test asserts this.

### Determinism: PASS

Test runs engine ×5 (real wire-seeded store) → identical result. Independent probe re-runverifies.

### Security: PASS

Identity normalization is store-side only. Affects: evidence keys, aggregate grouping, snapshot lookups. Does NOT affect:
- Permission / hard deny (V2.1 dispatch)
- Breaker state (key: `candidateId.split("#")[0]` = qualified model, unchanged)
- Variant ceiling (D1, structural)
- Security policy

Representation normalization is not authority. Fail-open observational path.

### Backward Compatibility: PASS

Telemetry T1/T2 qualified — preserved (pinned by 2 test suites, 25+13 assertions).

Store schema change: `chain.candidate.modelId` now unqualified. This is the fix itself — no external consumer of the old broken format. Evaluation-signals.jsonl does not exist in repo (confirmed: `Test-Path` returns False), so no legacy data migration issue.

All 18 pre-existing test files pass (303/303). No regression.

### Integration Test Quality: PASS

New test (`v22-identity-integration.test.ts`, 13 tests):

1. `parseQualifiedModel` units (6) — qualified, nested, no-provider, empty, leading/trailing slash, null/undefined
2. `parseCandidateId` delegation (2) — valid + malformed ⇒ null
3. **THE regression** — store keys use canonical identity, no `b-ai/b-ai` substring
4. Snapshot resolves evidence for engine candidateId (pre-fix: null everywhere)
5. Engine sees wire-recorded evidence: KNOWN_EVIDENCED + good model selected
6. Cold-start control: empty store ⇒ all UNPROVEN, D-COLD ladder head
7. Determinism ×5
8. Variant isolation via real wire path (`#high` vs `#max`)
9. Telemetry keeps qualified identity
10. I-016 unknown placeholders stay telemetry-only
11. Replay resolves OBSERVED outcomes through canonical identity

All exercise real host format (`model = "b-ai/glm-5.3-flash"`) through `wire.ts` emitters. No test bypasses `wire.ts` with qualified model.

### Regression: 18/18 PASS

| Gate | Result |
|------|--------|
| `npm test` | 303/303 (18 files) — independent re-run |
| `npm run typecheck` | exit 0 — independent re-run |
| `npm run lint` | exit 0 — independent re-run |
| `npm run build` | exit 0 — independent re-run |

---

## Finding Classification

### Critical: 0 (CLOSED)

CRITICAL-1 verified closed. Evidence loop now connected end-to-end.

### High: 0

### Medium: 0 (within scope of this review)

MEDIUM-1/2/3 remain open from Wave 2 review — outside scope of this remediation. Identity remediation does not interact with them.

### Low: 0 (within identity-remediation scope)

### Info: 2

1. `storeIdentity` prefers `a.providerId` over `canonical.providerId` (`wire.ts:71`). In real host flow both are consistent (host.ts:91 derives providerId from the same model string). Inconsistent caller input would produce store keys that don't match engine candidateId. Not reachable via production host, but a future caller could trigger it. Defense-in-depth: reversing precedence would make canonical the source of truth.

2. `recordExecution` / `record` are public methods that accept any caller-passed identity. Production path (wire) always canonicalizes. Test callers use already-unqualified modelId. A future caller passing qualified modelId directly to `store.recordExecution` would reintroduce the double-prefix bug. Defense-in-depth: `recordExecution` could normalize via `parseQualifiedModel`, but this is outside the current scope.

---

## CRITICAL-1: CLOSED

---

## Remaining Promotion Blockers

Unchanged from Wave 2 review:
- MEDIUM-1 (T1 staleness bypass)
- MEDIUM-2 (NaN guard on timestamps)
- MEDIUM-3 (resolveOutcome attribution check)
- LOW-1..4
- Corpus-scale validation (unchanged Wave 1 gate)

Identity path is no longer a blocker.

---

## Shadow Baseline: READY

Identity remediation complete. Shadow baseline freeze is authorized.

---

## Corpus Collection: NOT AUTHORIZED

Per scope guard: no OPTIMIZED/AUTO mode, no corpus collection, no promotion.

---

## Final Recommendation

CRITICAL-1 is **verifiably closed**. The identity lifecycle `qualified host model → wire → canonical store identity → evidence store → snapshot → engine` is proven end-to-end with real host format, runtime probe, and independent re-run.

Proceed to **V2.2 SHADOW BASELINE FREEZE** per the wave plan.

Remaining MEDIUM/LOW issues from Wave 2 review are unchanged and should be addressed before corpus collection.

---

**Evidence artifacts:**
- `.opencode/ai/verification/v22-wave2-review/critical-1-probe.json` (before, unmodified)
- `.opencode/ai/verification/v22-wave2-review/critical-1-fixed-probe.json` (after, build agent)
- `C:\Users\USER\AppData\Local\Temp\opencode\rereview-independent-probe.json` (independent re-run)
- Probe re-run: 2026-08-30T14:59Z
- Gate re-run: 2026-08-30T14:58Z