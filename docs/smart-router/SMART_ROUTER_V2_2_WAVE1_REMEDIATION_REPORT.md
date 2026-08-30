# SMART ROUTER V2.2 — WAVE 1 REMEDIATION REPORT

Date: 2026-08-30
Scope: remediation of review findings H1, H2, H3, H4, H6, H7 only. No redesign, no promotion.

---

## PHASE 0 — BASELINE (recorded before remediation verification)

| Check | Result |
|---|---|
| `npm test` | 243/248 PASS — 5 failures, all in `tests/smart-router/v22-wave1-remediation.test.ts` (H1 block) |
| `npm run lint` | PASS (exit 0) |
| `npm run typecheck` | PASS (exit 0, both projects) |
| `npm run build` | PASS (exit 0) |
| `git status --short` | V2.2 working tree untracked; 6 tracked files pre-modified by prior V2.2 integration session |

Baseline did not fail on V2.1: all V2.1 suites green at every stage.

---

## H1 — QUALITY FLOOR NOT ENFORCED

### Before
Review: `classFloors.quality` was stored in policy data but never consulted at D4; below-floor candidates survived gating.

### Root cause
The V2.2 implementation originally omitted a quality-floor leg from the D4 gate. The remediated implementation enforces it in `gates.ts` (`evaluateQualityFloor`), consumed by `applyHardGates` D4 and wired from `engine.ts` (`CLASS_FLOORS[class].quality`).

### After — canonical semantics (verified against normative docs)
- Floor absent (`quality: null`) → no quality gate.
- Floor = OR over legs (DECISION_MATRIX §1: security-review `intrinsic ≥ 0.6 OR observed ≥ 0.6`, deep-research intrinsic-only), each leg KNOWN only when value non-null and confidence ≥ 0.6.
- Any leg known-supported (≥ threshold) → eligible WITH floor credit.
- ALL legs KNOWN and all below threshold (verdict fully determined) → EXCLUDE (`D4_HEALTH_BREAKER`, "quality below floor").
- Any UNKNOWN leg → eligible WITHOUT floor credit — UNKNOWN is never converted into a failure (C1, ROUTING_MODEL §4.4/§9, ADR C1).
- I-019 (this session): an observed leg with `observedSampleSize < 5` is treated as UNKNOWN — it can never enforce or pass a floor (SECURITY_BOUNDARY I-019), symmetric with the health-floor `sampleSize ≥ 5` rule.

### Root-caused test defects (this session)
The 5 baseline failures were test-data defects, not implementation defects:
1. `KNOWN below floor on every leg → EXCLUDED` used `q(0.4, 0.9)` — identical inputs to `one leg known-below + one UNKNOWN → eligible WITHOUT credit` (`q(0.4, 0.9, null, 0)`) while asserting the opposite outcome. The tests were self-contradictory; the C1-canonical expectation is eligible-without-credit for the UNKNOWN-observed case. Fixed data to both-legs-known-below (`q(0.4, 0.9, 0.5, 0.9)`) for the EXCLUDE case.
2–3. `floorCredit` assertions expected `true` while `baseFns.capability = () => "UNKNOWN"` left the security-review capability floors (review + reasoning ≥ INTEGRATED) unverified. Per the H2 contract, floor credit requires ALL declared floors verified. Fixed tests to supply `capability: () => "INTEGRATED"`.
4. Mixed-set test gave the below-floor candidate only a known-below intrinsic with UNKNOWN observed → canonical result is eligible-without-credit. Fixed data to both legs known-below.
5. Engine "all candidates below floor → BLOCK" test used a single known-below leg → candidates stayed eligible → H2 degraded path. Fixed data to both legs known-below → gates empty → BLOCK.

### Tests
`tests/smart-router/v22-wave1-remediation.test.ts` H1 block, 10 cases: security-review below/above floor, observed-alternative verification, observed-ignored (deep-research), one-leg-below+UNKNOWN, quality UNKNOWN, deep-research below/above floor, I-019 thin-sample observed leg, mixed set, all-below-floor → engine BLOCK.

### Verification
- `npx vitest run tests/smart-router/v22-wave1-remediation.test.ts` → 30/30 PASS.
- Full suite → 252/252 PASS.
- Live controlled script (Phase 10) → floor exclusion/credit/C1-UNKNOWN cases PASS.

---

## H2 — REQUIRED-FLOOR FALLBACK NOT ENFORCED

### Before
Review: with no floor-verified candidate, V2.2 could return BLOCK / an ASCII winner / an arbitrary scored candidate instead of the V2.1 route.

### Root cause
The engine did not compute floor-verification across ALL declared floors nor branch to the V2.1 anchor.

### After
`engine.ts` H2 branch (lines ~222–248): `floorsDeclared` = any REQUIRED_FLOOR capability dim OR class quality floor declared; a candidate is floor-verified only when `gated.floorCredit` is `true` — ALL declared floors verified (capability REQUIRED_FLOOR dims at minLevel AND class quality floor where declared; gates.ts floor-credit bookkeeping). When floors are declared, no candidate is floor-verified, and at least one candidate is KNOWN_EVIDENCED → result is `kind: "degraded"`, `selected: null`, `decision.degradedToV21 = true`, reason `REQUIRED_FLOOR: no floor-verified candidate — C1 V2.1 fallback (H2)`. Never BLOCK, never ASCII winner, never an arbitrary scored candidate. Pure cold start (all UNPROVEN) is governed by D-COLD, whose ladder-head selection IS the V2.1 anchor route by construction.

Verified subtlety (live, this session): KNOWN_EVIDENCED ≠ floor-verified. A candidate with verified capability floors but UNKNOWN quality floor holds no floor credit → the conservative C1 fallback applies (an unverified candidate must never silently win a floor — ADR rejection rationale).

### Tests
H2 block: floors declared + no floor-verified + some KNOWN_EVIDENCED → degraded to V2.1 (selected null, `degradedToV21` true, scores still computed); floor-verified candidate exists → ok, unverified peer eligible without credit; pure cold start → D-COLD ladder head, not the H2 fallback.

### Verification
Vitest 30/30; live script "REQUIRED-FLOOR: no floor-verified → degraded to V2.1 (never BLOCK/ASCII)" PASS.

---

## H3 — ENGINE STICKINESS DEAD

### Before
Review: `engine.ts` compared `providerId/modelId` while candidates store `provider`/`model` — identity mismatch made stickiness unreachable.

### Root cause
Route-identity vocabulary mismatch between `HysteresisState.currentRoute.modelId` (canonical: provider-qualified `provider/model`) and the candidate comparison (unqualified model).

### After
- `engine.ts` sticky lookup matches `c.provider === stickyRoute.providerId && \`${c.provider}/${c.model}\` === stickyRoute.modelId && (c.variant ?? null) === stickyRoute.variant` — the canonical route vocabulary shared by `Candidate.candidateId`, `v21Route`, and `Attributed.modelId` (fixed at the abstraction boundary; no ad-hoc aliases).
- `routeOf()` emits the provider-qualified modelId.
- Breaker authority overrides stickiness: `stickyRouteBroken` input flag OR sticky breaker OPEN OR (sticky HALF_OPEN while a healthy CLOSED peer exists) — §16/§5.3.
- Sticky candidate absent from the eligible set → challenger adopted, no stale selection.
- State lifecycle (this session): the engine result now exposes the evolved `HysteresisState` (`stickiness.state`) so callers can persist/retrieve it; SHADOW remains stateless by design (each decision seeds from the V2.1 route; zero mutation of runtime state — I-021/REPLAY_CONTRACT §3).

### Tests
H3 block (engine-level, not `applyStickiness()`-only): sticky route retained at cold start via qualified modelId; breaker OPEN on sticky → challenger adopted; HALF_OPEN sticky + CLOSED peer → safety override; `stickyRouteBroken` flag alone → override; unknown sticky model → challenger adopted; engine exposes evolved state; `applyStickiness` thresholds (≤H retained; >H streak of 3 → reset; >2H sustained ≥ 24 h → reset).

### Verification
Vitest 30/30; live script stickiness retained / breaker-override / evolved-state cases PASS.

---

## H4 — D-COLD BYPASS WHEN LADDER HEAD EXCLUDED

### Before
Review: ladder head excluded → `picked === undefined` → score fallback → ASCII winner decided a cold start.

### Root cause
All-UNPROVEN ranking fell through to the generic comparator (ASCII final tie-break) instead of the V2.1 ladder seed.

### After
`scoring.ts` `rankCandidates`:
- CASE A — all UNPROVEN: ordered by V2.1 `ladderRank` (candidateId only as a deterministic within-rank ordering, not a decision input); `ranked[0]` is the ladder head; `coldStartFallback: true`; `tieBreaker: null`.
- CASE B — ladder head hard-gate excluded (e.g. breaker OPEN): the next candidate in V2.1 ladder order among the gated-eligible set is the V2.1-defined safe fallback. If every candidate is breaker OPEN, the gates exclude all → engine BLOCKs — no ASCII survivor.
- CASE C — mixture: KNOWN_EVIDENCED precedes UNPROVEN (tier order); UNPROVEN peers follow in V2.1 ladder order; their neutral scores are never compared.
- ASCII is ONLY the final tie-break (T6) between evidenced-equivalent candidates — never a cold-start decision input.

### Tests
H4 block: all-UNPROVEN ladder head beats ASCII-earlier id; multiple UNPROVEN → full ladder order; mixture → evidenced first, unproven in ladder order; all breaker OPEN → engine BLOCK; engine-level D-COLD selection via `runEngine` in the wave1 H2/H3 blocks + live script (ladder head; head OPEN → next ladder route; floor-verified evidenced candidate beats unproven ladder head).

### Verification
Vitest 30/30; live script D-COLD cases PASS.

---

## H6 — TYPECHECK DOES NOT COVER V2.2

### Before
Review: `npm run typecheck` did not traverse `.opencode/smart-router/v22/`; reported `GateExclusion undefined` class errors.

### Root cause
No tsconfig project included the V2.2 sources/tests.

### After
- `tsconfig.v22.json` (strict, noEmit) includes `.opencode/smart-router/**/*.ts` + `tests/smart-router/**/*.ts`.
- `package.json`: `"typecheck": "tsc -p ./jsconfig.json && tsc -p ./tsconfig.v22.json"`.
- No strictness disabled, no `@ts-ignore`, no exclusions of V2.2 (the single excluded test file, `agent-threading.test.ts`, is a V2.1 host-environment-dependent suite unrelated to V2.2 sources).

### Verification
`npx tsc -p tsconfig.v22.json --listFilesOnly` → 46 project files traversed, including all 15 files of `.opencode/smart-router/v22/` (types, flags, policy-data, evidence, gates, scoring, hysteresis, engine, requirement, discovery, evaluation-store, telemetry, wire, host, replay) + 5 V2.2 test files. `npm run typecheck` → PASS (exit 0).

---

## H7 — recordExecution ATTRIBUTION INVALID

### Before
Review: `recordExecution()` produced `evaluationId = ""` with `attributionComplete = true` while `isAttributionComplete()` requires a truthy evaluationId — contradictory lifecycle; incomplete records could count as quality evidence.

### Root cause
Attribution was marked complete at record time without requiring the evaluation link.

### After
`evaluation-store.ts`:
- `recordExecution(outcome, flush, evaluationId = "")` computes `attributionComplete = Boolean(evaluationId && sessionId && routeId && providerId && modelId && taskClass)`. No evaluationId is ever fabricated; without an evaluation the record stays attribution-INCOMPLETE (audit-only, zero statistics effect).
- `record()` deduplicates by `signalId` (first wins — duplicate execution/evaluation events never double-count).
- `stats()` counts only chains passing `isAttributionComplete()`; incomplete → `incomplete` counter only.
- Chain: sessionId → routeId → executionId → candidate(providerId/modelId/variant) → taskClass → evaluationId.
- Note: `wire.ts` `emitEvaluation` (T1) mints an evaluationId only at the moment a real evaluation result exists (host dispose) — that is event identity, not fabrication; the execution-side path (`recordExecution`) leaves it empty until the evaluation links.

### Tests
H7 block: execution without evaluation → stored, INCOMPLETE, `stats.attributed = 0`, `incomplete = 1`; execution with evaluationId → COMPLETE, attributed; missing routeId → incomplete even with evaluationId; variant null (base model) → complete; duplicate execution (same executionId → same signalId) ignored; duplicate evaluation signal ignored.

### Verification
Vitest 30/30; live script attribution cases (4) PASS.

---

## PHASE 7 — CROSS-CUTTING INVARIANTS

| Invariant | Evidence |
|---|---|
| I-013 attribution integrity | evaluation-store outcome separation + H7 lifecycle tests; environment events excluded from success windows |
| I-014 cold-start determinism | D-COLD ladder-seeded ordering is pure and deterministic (tests + live) |
| I-015 variant-evidence precedence | variant ceiling D1 gate + discovery variantStatus (v22-engine tests green) |
| I-016 health-confidence floor | gates health leg `sampleSize ≥ 5 + conf ≥ .6`; NEW: quality observed leg `sampleSize ≥ 5` (I-019 symmetry) |
| I-017 counterfactual integrity | D-COLD never ASCII-decided; H2 fallback preserves V2.1 anchor (tests + live) |
| I-018 telemetry isolation | OFF-mode inert (v22-host-integration), fail-open emitters, `shadowZeroInfluence: true` (flags tests) |
| Hard deny / breaker authority / permission independence | V2.1 suites green (permission-router, release-hardening, breaker-routing); V2.2 breaker override tests green |

---

## PHASE 9 — FULL REGRESSION

| Check | Result |
|---|---|
| `npm test` | **252/252 PASS** (16 files) — previous total 222 (pre-review baseline), 248 at remediation start, +4 new tests, 0 failed |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS (V2.1 + V2.2 projects) |
| `npm run build` | PASS |
| V2.2 suites | v22-engine, v22-engine-integration, v22-host-integration, v22-flags-replay, v22-wave1-remediation — all PASS |
| Security/replay/shadow suites | release-hardening, breaker-routing, permission-router, integration, model-router, capability, escalation-fallback, agent-threading — all PASS |

## PHASE 10 — LIVE CONTROLLED VERIFICATION

Controlled script (SHADOW semantics, temp-dir evidence, zero production influence, `OPTIMIZED`/`AUTO` untouched): 14/14 PASS — D-COLD (3 cases), quality floor (3), required-floor fallback (1), engine stickiness (3), attribution (4). Script retained at OS temp; not committed.

## PHASE 11 — CHANGE AUDIT (this remediation session)

Files modified:
- `.opencode/smart-router/v22/gates.ts` — I-019 observed-leg sample-size guard in `evaluateQualityFloor`.
- `.opencode/smart-router/v22/engine.ts` — expose evolved `HysteresisState` on the engine result (additive).
- `tests/smart-router/v22-wave1-remediation.test.ts` — 5 H1 test-data corrections + 4 new tests (deep-research below/above floor, I-019 thin-sample, evolved-state exposure).

Files created: none (report only). Files deleted: none.

V2.1 routing / permission / breaker / security changes: **NONE**. All tracked-file modifications (`package.json` typecheck script, `cli.ts`, `plugins/smart-router.ts`, `classifier.ts`, `.gitignore`, generated `performance-metrics.json`) pre-date this session and belong to the V2.2 integration workstream; none touch V2.1 routing authority.

## VERDICT

| Item | Status |
|---|---|
| H1 Quality Floor | FIXED |
| H2 Required-Floor Fallback | FIXED |
| H3 Engine Stickiness | FIXED |
| H4 D-COLD | FIXED |
| H6 Typecheck Coverage | FIXED |
| H7 Attribution | FIXED |
| Security / Determinism / Breaker / Permission / Shadow Isolation / Replay | PASS |
| Tests / Lint / Typecheck / Build / Live Verification | PASS (252/252, exit 0) |
| Auto-Fixes | none required — no test/typecheck/build failure after test-data correction |
| Remaining Findings | none blocking; H calibration remains PROVISIONAL (ADR-015, Wave 2 input) |

## PROMOTION

**NOT AUTHORIZED.** `V2.2 optimized = OFF`, `V2.2 auto = OFF`. No shadow corpus collection is started by this wave.

**Next wave:** WAVE 2 — EVIDENCE LOOP + TELEMETRY/EVALUATION BRIDGE.
