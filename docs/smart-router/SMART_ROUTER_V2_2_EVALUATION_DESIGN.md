# SMART ROUTER V2.2 — EVALUATION, MEASUREMENT & VALIDATION DESIGN

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Companion to `SMART_ROUTER_V2_2_ROUTING_MODEL.md` (metric definitions).

---

## 1. Evaluation Signals

V2.1 already executes → evaluates → continues. V2.2 makes the evaluator's output a first-class routing input.

```text
EvaluationSignal {
    schemaVersion        int
    signalId             uuid (generated at record time, deterministic inputs remain reproducible
                                  because signalId is excluded from decision inputs)
    timestamp            ISO-8601
    sessionId            id     (V2.1 session correlation)
    routeId              id     (V2.1 route correlation)
    provider, model, variant           attributed candidate
    taskClass            enum    (8 canonical)
    riskLevel            enum
    agent                enum
    result               enum    SUCCESS | PARTIAL | FAILURE | BLOCKED | CANCELLED
    success              bool    (result == SUCCESS, or PARTIAL with acceptance)
    qualityScore         0..1 | UNKNOWN     (evaluator-assessed; UNKNOWN if not assessable)
    failureClass         enum    (§2 taxonomy; null on success)
    insufficiencyReason  string | null  (evaluator free-text, truncated 200 chars, redacted)
    attribution          enum    MODEL | PROVIDER | ENVIRONMENT | EVALUATOR | USER | POLICY
    confidence           0..1    (evaluator certainty in its own verdict)
    evidence             { testsPassed?, testsFailed?, toolCalls?, toolErrors?,
                           continuationCount?, retryCount?, durationMs?, outputTokens? }
    evaluatorId          enum    V21_EVALUATOR | HUMAN | FUTURE_EVALUATOR_VARIANT
}
```

Producer: the existing V2.1 evaluator (deterministic path) emits the signal after each attempt; `v22EvaluationFeedbackEnabled` gates whether it is *consumed* by routing (recording itself is harmless).

## 2. Failure Taxonomy

| # | failureClass | Typical attribution | Short definition |
|---|---|---|---|
| F01 | provider_failure | PROVIDER | transport/5xx/auth at provider boundary |
| F02 | timeout | PROVIDER or MODEL | no response within budget |
| F03 | tool_failure | MODEL or ENVIRONMENT | tool call errored (attribution via error origin) |
| F04 | reasoning_insufficiency | MODEL | wrong plan/logic, evaluator-confirmed |
| F05 | coding_failure | MODEL | produced code fails review/tests at authoring stage |
| F06 | test_failure | MODEL (authoring) vs ENVIRONMENT (flaky) | tests red after execution |
| F07 | security_violation | MODEL or POLICY | attempted forbidden operation |
| F08 | incomplete_answer | MODEL | stopped early, deliverable incomplete |
| F09 | unsupported_claim | MODEL | hallucination / unverifiable assertion detected |
| F10 | context_limitation | MODEL | overflow/truncation evidence |
| F11 | permission_denial | POLICY | V2.1 hard deny / gate |
| F12 | environment_failure | ENVIRONMENT | workspace/tooling/network local fault |
| F13 | user_cancellation | USER | human abort |
| F14 | evaluator_uncertainty | EVALUATOR | evaluator cannot classify confidently |

### Table C — Failure → Routing Response

| Failure | Interpretation | Route impact | Health impact | Evaluation impact | Fallback action | Escalation action |
|---|---|---|---|---|---|---|
| F01 provider_failure | provider fault | exclude candidate for chain | provider+model failureRate ↑ | record; no quality penalty | re-score remainder | PROVIDER_SWITCH (ROUTING_MODEL §13) |
| F02 timeout (1st) | transient | none | timeoutRate ↑ (mild) | record | RETRY_SAME once | then re-score |
| F02 timeout (repeat) | systematic | exclude for chain | timeoutRate ↑, successRate ↓ | record | re-score | PROVIDER_SWITCH |
| F03 tool_failure (env) | not the model | none | none | record attribution ENV | RETRY_SAME once | none |
| F03 tool_failure (model) | orchestration fault | none | none | agenticToolUse segment ↓ | re-score | MODEL_STRONGER (toolUse axis) |
| F04 reasoning_insufficiency | capability gap | none | none | reasoning segment ↓ | re-score | VARIANT_UP → MODEL_STRONGER (reasoning) |
| F05 coding_failure | capability gap | none | none | coding segment ↓ | re-score | MODEL_STRONGER (coding) |
| F06 test_failure (authoring) | capability gap | none | none | coding segment ↓ | re-score | MODEL_STRONGER (coding) |
| F06 test_failure (flaky/env) | environment | none | none | attribution ENV; retry budget per V2.1 | RETRY_SAME | none |
| F07 security_violation (policy) | policy worked | exclude for chain | none | record; audit event | HARD_BLOCK for chain | none (policy is not a hint) |
| F07 security_violation (model error) | model produced unsafe op | exclude for chain | none | reliability segment ↓ + audit | re-score | MODEL_STRONGER, tiered |
| F08 incomplete_answer | quality gap | none | none | quality segment ↓ | re-score | VARIANT_UP |
| F09 unsupported_claim | quality gap | none | none | quality segment ↓ (research segment if research task) | re-score | MODEL_STRONGER |
| F10 context_limitation | capacity gap | none | none | truncationEvents ↑ | context re-gate inverted | larger-context candidate |
| F11 permission_denial | policy constraint | candidate/policy mismatch → exclude for chain | none | audit only | HARD_BLOCK for chain | never permission-escalating |
| F12 environment_failure | local fault | none | **none** (never penalize model) | record attribution ENV | RETRY_SAME once | none |
| F13 user_cancellation | human decision | none | none | record; excluded from aggregates | none | none |
| F14 evaluator_uncertainty | noisy signal | none | none | recorded with confidence; no segment update | re-score without evidence change | none |

**The distinction that matters:** F01/F12/F13/F14 never degrade model quality or health; F04–F10 degrade capability/quality segments only; F02 degrades health mildly. Attribution is recorded per event, so re-interpretation later (e.g., flaky test reclassified) is a new append, not an edit.

## 3. Feedback Loop

```text
MODEL A executes → evaluator verdict → EvaluationSignal (attribution, class, confidence)
  → evidence update (segment-scoped, windowed)
  → next decision: CandidateDiscovery → gates (updated breaker/health) → scoring (updated dims)
  → MODEL B selected (capability-axis targeted when failure was capability-class)
```

Requirement: the chain understands *why* A was insufficient — `failureClass` + capability-axis mapping (Table C, escalation column) drives *which* dimension of *which* candidate set changes, not merely "A failed → try B".

### 3.1 Attribution Chain (canonical, I-013/R-016)

```text
sessionId → routeId → executionId → candidate(provider, model, variant) → taskClass → evaluationId
```

- Candidate identity always preserves all three components (provider, model, variant) — a signal attributed to a model without its variant is INCOMPLETE (D-VAR, I-017).
- **Attribution invariant (no exception): incomplete attribution → the signal is stored for audit but MUST NOT update model quality, health, or any ranking state.** (I-016; testable.)
- Outcome separation (I-013 outcome model): `ExecutionOutcome` (completed/failed/error class), `QualityOutcome` (grade + evaluator confidence), `EnvironmentOutcome` (timeout, network, quota, tooling, user cancellation) are three distinct record types. Canonical mappings: provider timeout → ExecutionOutcome/EnvironmentOutcome, **never** `quality = bad` automatically; user cancellation → EnvironmentOutcome, no quality penalty; test failure → QualityOutcome ONLY when candidate attribution is complete and the failure class is model-attributed (Table C); evaluator uncertainty (F14) → recorded, zero routing effect.

## 4. Noise Handling (anti-corruption)

| Protection | Rule |
|---|---|
| Minimum sample size | segment updates affect ranking only at n ≥ 5; below, evidence recorded but ranking uses parent segment |
| Outlier clipping | one event moves a windowed metric ≤ 1/n of window; a 20-window absorbs any single event at ≤ 5% |
| Evaluator uncertainty | `confidence < 0.6` → signal recorded, no segment update (prevents false-negative evaluators from poisoning ranking) |
| Conflicting signals | contradictory verdicts within a window widen effective uncertainty → confidence ↓ → floors stop enforcing (floors require conf ≥ .6) |
| Prompt-injection into evaluator | evaluator output is schema-validated; free-text `insufficiencyReason` is display-only, never a decision input; failureClass must be from the fixed enum |
| Single unusual request | per-segment windows isolate unusual prompts; segment fallback hierarchy dilutes them |
| Provider outage spike | F01 attribution excludes outage events from quality segments entirely |
| Malicious metric manipulation | store records are schema-validated + bounds-checked at read; provenance required; out-of-range values rejected (EVENTS never silently clamped) |

## 5. Sample Thresholds & Aggregation (summary)

```text
n < 5            UNKNOWN  — no statistical use; parent segment or prior 0.5
5 ≤ n < 20       usable, confidence = n/20 (floors inactive until conf ≥ .6)
n ≥ 20           full window confidence (modulo freshness: ×0.5 after 24h, UNKNOWN after 72h)
aggregation      successRate = successes / window_n (recent-20); qualityScore = mean of
                 qualityScore values (UNKNOWN values excluded from mean, counted in n for
                 presence but not for quality mean — documented, deterministic)
```

## 6. Historical Aggregation & Decay

- Primary: recent-N (20) sliding window per segment (auditable: a human can count the last 20 lines).
- Trend: EWMA half-life 10 events, stored alongside, used for confidence/display only (ADR-004).
- Freshness decay: see §5. No time-based exponential decay of events themselves — events age out by being pushed out of the window, which is fully reconstructable from the append-only log.

## 7. Segmentation & Hierarchical Fallback

```text
Level 1   (taskClass, model, variant)      most specific
Level 2   (taskClass, model)
Level 3   (taskClass, provider/model family)
Level 4   (model, global)
Level 5   prior 0.5, confidence 0
```

Variant-level first (D-VAR, ROUTING_MODEL §4.5): the primary key is `(taskClass, model, variant)`; a variant with n < 5 inherits the model level (n ≥ 20), marked inherited with confidence ×0.5 — never an unmarked blend.

Lookup: use the most specific level with n ≥ 5. Over-fragmentation is prevented by the n ≥ 5 rule itself — a sparse segment automatically defers to its parent. Additional axes (risk, agent, language, repo type) are **recorded** on every signal but are **not** MVP segment keys (they multiply segments faster than evidence accrues; revisit after shadow data, ADR-004).

## 8. Required Test Design (future; NOT implemented here)

| Suite | What it proves | Key cases |
|---|---|---|
| Unit | each gate/scoring function | dimension normalization; UNKNOWN renormalization; tie-break chain; floor enforcement |
| Property | invariants hold for arbitrary inputs | I-001..I-015 as properties (randomized candidate sets/states → assert) |
| Determinism | same state → same route | identical inputs ×100 runs → identical routeId-level output; iteration-order shuffle → same winner |
| Integration | V2.2 inside V2.1 flow | flags OFF = byte-identical V2.1 output; SHADOW writes evidence only; OPTIMIZED respects permission gate |
| Runtime | live host behavior | chat.params/threading untouched; plugin registration; evidence files written |
| Failure injection | degradation paths | scoring throws → V2.1 route; store missing → priors; registry empty → BLOCKED |
| Chaos | breaker × scoring interplay | OPEN never selected (also with score .99); HALF_OPEN probe rule; recovery re-ranking |
| Security | invariant enforcement | YOLO + OPEN + fallback → hard deny still absolute; evaluation failure cannot escalate permission |
| Benchmark | routing quality over corpus | see §9 |
| Calibration | weights reflect evidence | shadow-delta distribution; floor thresholds vs realized outcomes (§11) |
| Evaluation reliability | evaluator signal trust | injected noise → confidence gating reacts; F12 never penalizes model |

Explicit required cases: same input → same ranking; different health → different ranking; same health + same input → identical ranking; OPEN → never selected; high-risk task → quality floor enforced; cheap-but-weak candidate → rejected when floor violated; latency optimization → never violates an active quality floor (latency weight applies only within floor-passing set).

## 9. Benchmark Suite (routing quality)

| Metric | Definition |
|---|---|
| task-routing accuracy | share of routed tasks reaching SUCCESS without avoidable escalation |
| successful completion rate | SUCCESS / total (per task class) |
| quality score | mean evaluator qualityScore over successes |
| fallback rate | decisions that required ≥1 re-route |
| escalation rate | continuation dispatches per task |
| average latency | p50/p95 end-to-end per task class |
| p95 latency | tail |
| cost per successful task | effective cost summed / successes |
| failure recovery rate | tasks eventually SUCCESS after ≥1 failure |
| avoidable expensive-route rate | successes where a cheaper eligible candidate would plausibly suffice (shadow-estimated, labeled estimated) |
| avoidable low-quality-route rate | routes below quality floor that shadow mode would have excluded |

Balanced evaluation rule: no single metric is optimized in isolation; report the vector, gate promotions on the *balanced* picture (Migration gates). Benchmark corpus = recorded historical routing events (offline) + periodic live shadow batches.

## 10. Offline Simulation

Environment: replay engine reading the append-only evidence + V2.1 decision logs; re-executes the V2.2 decision function per historical decision point.

Supports: replay; counterfactual candidate ranking; weight tuning; failure injection (drop/store-alter events); health perturbation; cost perturbation; latency perturbation. Output: per-decision delta report (V2.1 route vs simulated V2.2 route + score breakdowns).

Constraints: pure offline; production stores read-only; simulated evidence clearly namespaced; no network calls; determinism identical to runtime decision path (same pure functions).

## 11. Counterfactual Evaluation

Question: "Would another model have performed better?"

- **Observed outcome** — what actually happened with the chosen route (fact).
- **Estimated counterfactual** — shadow/simulation *would have chosen* X; outcome UNKNOWN unless X was actually tried on a comparable task. Estimates may use segment statistics of X on similar tasks (`estimatedSuccessRate(taskClass, X)`) and MUST be labeled `ESTIMATE`.
- **Unknown** — anything else. Never invented.

Reporting template: `V2.1 chose A (observed: SUCCESS, quality .8). V2.2 would choose B (ESTIMATE: successRate .85 ± wide, n=7 → LOW confidence). No ground-truth claim about B on this task.`

## 12. Calibration

Weights and thresholds are policy data validated, not hand-tuned forever:

1. Offline replay of historical decisions under candidate weight profiles (bounded grid, e.g., quality ∈ {.30,.35,.40,.45}) — compare benchmark vector per profile.
2. Shadow-mode live batches (Phase 1) → realized deltas (§13).
3. Floor threshold validation: for each floor, check realized outcomes of routes *below* the floor that shadow would have excluded — were they actually worse? If not, the floor is miscalibrated.
4. Confidence analysis: events where high-confidence evidence disagreed with outcomes → investigate evaluator/store correctness.
5. A/B: only if/when OPTIMIZED is enabled for a subset of sessions; not required for design approval.

All calibration artifacts are offline/design-level; no autonomous weight editing ever (NON-GOAL: autonomous policy editor).

## 13. Shadow Mode

```text
Per decision:
  V2.1 selects route R21 (executed as today)
  V2.2 computes hypothetical route R22 (pure function, same inputs + evidence)
  ShadowReporter records: { R21, R22, agree: R21==R22,
    deltas: { quality, cost, latency, risk, fallbackDepth } (ESTIMATE-labeled) }
```

Zero runtime mutation. Success criteria for promotion: agreement analysis shows V2.2's divergent choices are *justified* (divergence correlates with evidence-backed improvements in offline replay) and never violate any invariant.

## 14. Migration Strategy (Phases 0–5)

| Phase | Mode | Gate to next phase |
|---|---|---|
| 0 Offline simulation | replay corpus, tune weights | benchmark vector ≥ V2.1 baseline on replay; no invariant violation in simulation |
| 1 Shadow | v22ShadowMode=true, all else off | ≥ 2 weeks shadow data; divergence report reviewed; zero runtime impact incidents |
| 2 Advisory | ADVISORY (recommendation logged, V2.1 decides) | recommendation acceptance analysis; no unexplained regressions in V2.1 outcomes |
| 3 Opt-in optimized | OPTIMIZED per explicit session/project opt-in | opt-in cohort outcomes ≥ baseline (completion, quality, cost, latency) over statistically meaningful window |
| 4 Limited auto | OPTIMIZED default for LOW-risk task classes only | sustained metrics; CRITICAL/HIGH classes still V2.1 |
| 5 Production default | OPTIMIZED default all classes | full audit + evidence review; explicit human approval |

Rollback at any phase = set flags off; V2.1 behavior is bit-identical to v2.1.0.

## 15. Evaluation → Routing Mapping (summary contract)

```text
F01/F02        → health segments (provider/model attribution levels)
F04..F10       → capability/quality segments (per capability axis)
F12/F13/F14    → recorded only; zero routing effect
F07/F11        → audit + chain exclusion; never health/quality
confidence<.6  → recorded only
n<5 segment    → parent segment
```
