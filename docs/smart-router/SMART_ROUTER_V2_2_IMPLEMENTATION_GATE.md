# Smart Router V2.2 — Implementation Gate

## VERDICT: NOT AUTHORIZED

(Verdict unchanged by the design revision: design defects are resolved, evidence gates are not.
Historical revision-1 verdict and its 12-prerequisite table are preserved below.)

## Gate table revision 2 (G1–G14) — after design revision, before replay-2

Status vocabulary: PASS / PARTIAL / FAIL / UNKNOWN. Evidence gates (G3–G7) reflect what exists
today; they are NOT promoted by design work.

| # | Gate | Status | Evidence |
|---|---|---|---|
| G1 | Design conflicts resolved (C1–C4) | **PASS (by design)** | DESIGN_REVISION_REPORT §Resolutions; ADR-011/012; canonical Ex.3/Ex.7 |
| G2 | Evidence contract complete | **PASS (by design)** | EVIDENCE_CONTRACT v1 (20 fields × 9 attributes; statuses; attribution invariant) |
| G3 | Evaluation attribution available | **FAIL** | 56/56 evaluations unattributed; requires T1/T2 telemetry + collection window |
| G4 | Outcome attribution available | **FAIL** | No Execution/Quality/Environment outcomes recorded yet (T2 not yet emitting) |
| G5 | Latency evidence available | **FAIL** | Only harness duration_ms (excluded from latencyFit per ADR-017); t0–t3 not instrumented |
| G6 | Cost evidence available | **FAIL** | Zero pricing/usage evidence (ADR-018: UNKNOWN is inert, never zero) |
| G7 | Capability evidence sufficient | **PARTIAL** | Variant verification + vision LIVE (b-ai); 11/13 dims UNKNOWN (EVIDENCE_AUDIT §3) |
| G8 | Variant evidence defined | **PASS (by design)** | ROUTING_MODEL §4.5 (D-VAR); aggregation + shrinkage + staleness; ADR-013 |
| G9 | Cold-start semantics validated | **PARTIAL** | Defined (ADR-014, §10.3) + property-tested at unit level; production validation awaits replay-2 |
| G10 | Canonical weight profiles | **PASS (by design)** | DECISION_MATRIX sole normative authority; §10.4 duplicate SUPERSEDED |
| G11 | Threshold validation | **PARTIAL** | H calibrated-parameter (ADR-015, provisional 0.02); conf thresholds bimodal in current evidence — calibration requires replay-2 |
| G12 | Replay contract complete | **PASS (by design)** | REPLAY_CONTRACT (ReplayRecord schema, missing-data null+reason, counterfactual rules) |
| G13 | Security invariants preserved | **PASS** | I-001..I-015 preserved + I-016..I-021 added (SECURITY_BOUNDARY §4) |
| G14 | V2.1 compatibility preserved | **PASS (by design)** | Failure-safe degradation (§5); flags default OFF/SHADOW; verified by regression suite at implementation time |

**Reading:** G1/G2/G8/G10/G12/G14 are design-complete. G9/G11 are defined but production-validatable
only against replay-2 data. G3–G6 require the instrumentation pipeline to run and accumulate a
collection window. G7 requires capability probes (T5) beyond the b-ai variant verifications.
**No gate status may be promoted without evidence (no-silent-degradation rule).**

## What authorization will require (in order)

1. **Design revision pass** — DONE (this revision; see DESIGN_REVISION_REPORT).
2. **Additive instrumentation only** (V2.1-compatible, observational): T1–T5 per INSTRUMENTATION_SPEC; no routing-behavior change; V2.1 tests unchanged.
3. **Re-run offline validation (replay-2)** against the instrumented corpus; re-evaluate G3–G12 with real coverage numbers. Coverage targets: REQUIRES HUMAN APPROVAL (procedure in EVIDENCE_CONTRACT §Calibration; no invented thresholds).
4. Only then: shadow-mode implementation proposal per the rollout ladder (OFF→SHADOW→ADVISORY→OPT-IN→AUTO).

## Counterfactual & fairness statement

All 90 observed V2.2≠V2.1 divergences have counterfactual = UNKNOWN (no outcome attribution). This gate makes no claim that V2.2 would perform better or worse than V2.1. It claims only: the evidence required to know does not exist, and part of what was thought to be evidence (harness durations) is invalid for this purpose.

## Provenance

- Baseline: commit `fca4f59`, tag `v2.1.0`, 144/144 tests, lint/typecheck/build clean.
- Dispatch route used for the review pass: `R-62959dea92` (reviewer, GLM#max, packet `continuation-1787984331421.json`); analysis output `.opencode/ai/verification/v22-simulation/reviewer-analysis.txt`.
- Engine + machine results: `.opencode/ai/verification/v22-simulation/replay.mjs`, `simulation-results.json`.

---

## Gate table revision 3 (2026-08-29) — after host integration + shadow readiness

Host integration is runtime-verified (live `opencode run` under SHADOW produced correlated
shadow + T1–T4 records; see SMART_ROUTER_V2_2_HOST_INTEGRATION_REPORT.md and
`.opencode/ai/verification/v22-host-integration/`). Evidence gates reflect the current,
still-minimal corpus. G3–G7 moved FAIL → PARTIAL because the instrumentation pipeline now
runs and emits attributed records live — NOT because evidence is sufficient. Corpus-scale
validation (replay-2 collection window) still required. Verdict remains NOT AUTHORIZED.

| # | Gate | Status | Evidence |
|---|---|---|---|
| G1 | Design conflicts resolved (C1–C4) | **PASS (by design)** | unchanged from revision 2 |
| G2 | Evidence contract complete | **PASS (by design)** | unchanged from revision 2 |
| G3 | Evaluation attribution available | **PARTIAL** | T1 emitting attributed evaluations live (dispose hook; full chain incl. candidate identity); live corpus = 1 evaluation; 56 historical remain unattributed |
| G4 | Outcome attribution available | **PARTIAL** | T2 Execution/Environment outcomes emitting live (idempotent, env-classified); QualityOutcome via dispose; corpus minimal |
| G5 | Latency evidence available | **PARTIAL** | T3 t0–t3 captured on a real request (t2 via first part event); ttfr/completion derived; missing → null+reason; p50/p95/EWMA implemented but unvalidated (ADR-017) |
| G6 | Cost evidence available | **PARTIAL** | T4 relays host usage + host cost (pricingSource opencode-host); no host cost → null (UNKNOWN, never 0); no price table invented |
| G7 | Capability evidence sufficient | **PARTIAL** | T5 probe runner live (10 INTEGRATION records, runtime-verified variants, dim reasoning); vision BLOCKED (I-005); other dims still UNKNOWN |
| G8 | Variant evidence defined | **PASS (by design)** | unchanged from revision 2 |
| G9 | Cold-start semantics validated | **PARTIAL** | D-COLD live-verified at mechanism level (ladder head, not ASCII; ASCII-winner bug found + fixed in scoring.ts); corpus-scale validation awaits replay-2 |
| G10 | Canonical weight profiles | **PASS (by design)** | unchanged from revision 2 |
| G11 | Threshold validation | **PARTIAL** | H=0.02 provisional; calibration requires replay-2 corpus |
| G12 | Replay contract complete | **PASS (by design)** | replay-2 runs on live shadow records; driver classification verified (double-qualification bug found + fixed in replay.ts) |
| G13 | Security invariants preserved | **PASS** | hard-deny live proof (policy-self-modify blocked); privacy scan clean on live stores; zero mutation of permission/breaker/dispatch/route |
| G14 | V2.1 compatibility preserved | **PASS** | 222/222 regression (197 prior + 25 new), lint/typecheck/build clean, zero V2.1 test loss |

Production mode at time of writing: **OFF** (flag file absent; fail-safe default verified).

---

## Gate table revision 4 (2026-08-30) — after Wave 2 evidence loop

Wave 2 closed the loop between live telemetry and the V2.2 engine: T1/T2 signals now land in the
EvaluationStore (H5), aggregate by variant/model/segment with shrinkage + staleness (M1, M3),
classify failures (M6), resolve replay outcomes from the store (M9), and persist hysteresis state
across host instances (M11). See SMART_ROUTER_V2_2_WAVE2_EVIDENCE_LOOP_REPORT.md and
`.opencode/ai/verification/v22-wave2/`. Gate statuses reflect pipeline existence and the still-tiny
corpus (n≈1 per live check) — NOT sufficiency for promotion. Verdict remains NOT AUTHORIZED.

| # | Gate | Status | Evidence |
|---|---|---|---|
| G1 | Design conflicts resolved (C1–C4) | **PASS (by design)** | unchanged from revision 3 |
| G2 | Evidence contract complete | **PASS (by design)** | unchanged from revision 3 |
| G3 | Evaluation attribution available | **PARTIAL** | T1+T2 → store closed loop live-verified (deterministic ids, idempotent, out-of-order convergence, conflict detection); corpus remains minimal |
| G4 | Outcome attribution available | **PARTIAL** | merged signals land in EvaluationStore with full chain; execution-only signals never aggregate (I-016); 7 incomplete-attribution cases pinned by tests |
| G5 | Latency evidence available | **PARTIAL** | unchanged from revision 3 (T3 not touched by Wave 2) |
| G6 | Cost evidence available | **PARTIAL** | unchanged from revision 3 (T4 not touched by Wave 2) |
| G7 | Capability evidence sufficient | **PARTIAL** | unchanged from revision 3; Wave 2 added observed-only quality path (conf ×0.5 cap → can re-rank, can never gate floors) |
| G8 | Variant evidence defined | **PASS (by design)** | D-VAR now implemented: variant-scoped aggregation + model fallback (n≥20, conf cap 0.5, `inheritedFrom`) + shrinkage k=10 + 14-day half-life |
| G9 | Cold-start semantics validated | **PARTIAL** | closed-loop positive/negative controls green; determinism ×5 identical; production validation awaits replay-2 corpus |
| G10 | Canonical weight profiles | **PASS (by design)** | unchanged from revision 3 |
| G11 | Threshold validation | **PARTIAL** | H=0.02 provisional unchanged; observed-evidence conf cap (≤0.45 < 0.6 gate) is a deliberate policy constant pending shadow data |
| G12 | Replay contract complete | **PASS (by design)** | M9: OBSERVED resolution now backed by store lookup (`resolveOutcome` on `chain.executionId`) |
| G13 | Security invariants preserved | **PASS** | I-001..I-021 preserved; OFF-mode inertness on real root live-verified (no store created); M11 store fail-open (never breaks routing) |
| G14 | V2.1 compatibility preserved | **PASS** | 290/290 regression (252 prior + 38 new), lint/typecheck/build clean, zero V2.1 test loss |

---

## Historical: revision-1 gate table (12 prerequisites — preserved verbatim)

| # | Prerequisite | Status | Evidence |
|---|---|---|---|
| 1 | Hard security gates (no bypass, I-001..I-015) | **PASS** | Security replay 0/91 violations; hard denies structural |
| 2 | Capability registry SSOT (runtime-verified) | **PASS (partial scope)** | 13 models, variant verification LIVE for b-ai; 11/13 dims have no source |
| 3 | Deterministic engine (double-run identical) | **PASS** | Replay determinism ✓ |
| 4 | Graceful degradation → V2.1 | **PASS** | Scorer-off = V2.1 for 107/107 |
| 5 | Per-segment health signal (breaker + failures) | **PARTIAL** | Breaker closed/clean; no outcome field; tail segments n<5 |
| 6 | Observed quality attribution | **FAIL (Critical)** | 56 evaluations, zero model/variant/task attribution → 50/50 blend impossible |
| 7 | Production latency evidence | **FAIL** | Only decision-path harness durations (13–31 ms); using them causes 43 noise swaps |
| 8 | Cost evidence | **FAIL** | Zero pricing data; dim inert |
| 9 | Threshold calibration data (graded conf) | **FAIL** | Conf bimodal 0/1 → thresholds indistinguishable |
| 10 | Design conflict resolution (C1, C2, C4) | **FAIL** | Unknown-vs-mandatory-capability contradiction; deep-research weight table ambiguity; 51% class-coverage approximation gap |
| 11 | Variant-level evidence policy (D-VAR) + cold-start rule (D-COLD) | **FAIL (design gaps)** | 45 ASCII variant divergences; all-UNKNOWN → arbitrary winner |
| 12 | Oscillation guard specified (hysteresis/stickiness) | **FAIL (spec missing)** | Evidenced-peer margin 0.0058 < 0.02 |
