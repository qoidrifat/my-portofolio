# SMART ROUTER V2.2 — ARCHITECTURE

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Baseline: Smart Router **v2.1.0** (immutable, tag `v2.1.0`, release commit `d8bf7b1`) on OpenCode 1.18.25
Date: 2026-08-29

---

## 1. Executive Summary

Smart Router v2.1 is a deterministic, security-bounded, closed-loop routing layer: it classifies a prompt, enforces risk/agent/permission constraints, walks a static preference ladder, tracks per-model circuit state, and re-dispatches via bounded continuation. Its candidate ordering, however, is static: the ladder is a hand-authored list; health only excludes; no cost, latency, quality, or capability-fit evidence influences ranking.

V2.2 adds a **decision layer** on top of the frozen V2.1 core:

```text
eligible candidates
 ↓ deterministic ranking           (V2.1)
        becomes
candidate discovery
 ↓ hard eligibility gates          (capability / health / policy — binary)
 ↓ multi-dimensional scoring       (deterministic, explainable)
 ↓ deterministic tie-breaking
 ↓ optimal route
 ↓ execution → evaluation → evidence
 ↓ re-computation                  (V2.2)
```

The design goal, stated once and governing everything below:

> **A deterministic, explainable decision engine operating on dynamic runtime evidence.**

V2.2 is an **optimization layer, not a replacement**. Every component is designed so that its failure degrades the system to exact V2.1 behavior. Security semantics, permission authority, the circuit breaker state machine, hard denials, and the variant ceiling are untouched.

## 2. Problem Statement

V2.1 answers "is this candidate allowed and alive?" but not "is this candidate the best eligible choice for this task right now?"

Concrete gaps:

1. **Static ordering.** The fallback ladder is fixed at policy-authoring time; it cannot reflect observed quality, latency, or cost.
2. **Health as exclusion only.** A circuit either blocks or disappears from the decision; a degraded-but-closed model is ranked as if fully healthy.
3. **No capability fit.** A deep-research task and a trivial rename are routed through the same ladder, differing only in variant ceiling.
4. **No cost or latency objective.** Cheap-and-fast candidates are never preferred for routine work; expensive-strong candidates are never justified against a budget.
5. **Evaluation is a dead end.** The evaluator drives continuation, but its signal does not update future routing evidence.
6. **No explanation.** Route decisions are logged, but "why this model over the runner-up" is not reconstructable as a score comparison.

V2.2 closes these gaps without becoming a rule pile or an ML black box.

## 3. Design Goals

```text
G-01  Filter before score: hard ineligibility is decided before any scoring.
G-02  Every routing dimension is evidence-backed with declared provenance and confidence.
G-03  Same complete state → same route (bit-for-bit determinism).
G-04  Every route selection produces a reconstructable RouteExplanation.
G-05  V2.2 failure → exact V2.1 behavior (no partial states, no new single point of failure).
G-06  MODEL SELECTION ≠ PERMISSION AUTHORITY (scoring can never widen permissions).
G-07  Bounded adaptation: evidence windows are capped, decayed, and segment-scoped.
G-08  UNKNOWN evidence is never fabricated; it takes a neutral prior with zero confidence.
G-09  Routing overhead budget: control-plane decision cost stays negligible vs model latency.
G-10  V2.1 logs and policies remain interpretable; V2.2 schemas are versioned.
```

## 4. Non-Goals

V2.2 is **NOT**:

```text
not a model training system            no weights are trained; no fine-tuning
not an autonomous policy editor        policies change only by explicit human edit
not a permission escalator             scoring output never touches permission inputs
not a random router                    no runtime randomness, no exploration in production
not a black-box optimizer              no opaque learned model in the decision path
not a replacement for OpenCode         V2.2 lives inside the existing plugin boundary
not a universal AI platform            scope = model/variant routing for this workspace
not a vision enabler                   vision remains BLOCKED until independently verified
not a secret-management system         no credentials are read, stored, or scored
not a runtime experiment framework     shadow mode writes evidence, never mutations
```

## 5. V2.1 Compatibility

| V2.1 element | V2.2 relationship |
|---|---|
| Classification → Risk → Agent chain | Reused verbatim; produces the Task Requirement Vector's inputs |
| Static preference ladder | Becomes the **fallback of last resort** and the seed ordering when scoring is disabled |
| Circuit breaker (per-model, threshold 3, cooldown 300s, half-open probe) | Untouched state machine; consumed as a hard gate (OPEN→exclude) and as an input to the reliability dimension |
| Permission resolver + hard denials | Untouched; evaluated **after** route selection, exactly as in V2.1 |
| Escalation (MAX_REROUTES=3, continuation packets) | Reused; V2.2 only changes *which* candidate is chosen next (re-scoring), not the bounds or semantics |
| Observability (jsonl logs, breaker attribution) | Extended with new versioned events; V2.1 event schemas unchanged |
| `cli.ts`, policy JSONs, `opencode.jsonc` SSOT | Unchanged in format; V2.2 adds files, never rewrites them |

**Compatibility invariant:** with every V2.2 flag OFF, routing output MUST be byte-identical to v2.1.0 for identical inputs (testable; see Test Design in `SMART_ROUTER_V2_2_EVALUATION_DESIGN.md`).

## 6. Architecture

### 6.0 Canonical Authority Hierarchy (design revision)

Where documents overlap, the higher authority wins; the lower is corrected or marked SUPERSEDED:

```text
SECURITY_BOUNDARY      → security authority (invariants I-001..I-021)
ROUTING_MODEL          → behavioral routing semantics (gates, scoring, cold start, hysteresis)
DECISION_MATRIX        → normative task-class/risk weight profiles, floors, C4 mapping
EVIDENCE_CONTRACT      → evidence field semantics, statuses, attribution, outcome model
OBSERVABILITY_DESIGN   → event/telemetry semantics (incl. instrumentation spec T1–T5)
ADR                    → decision rationale and history (never normative over the above)
```

Contracts added by the design revision: `SMART_ROUTER_V2_2_EVIDENCE_CONTRACT.md`, `SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md`, `SMART_ROUTER_V2_2_REPLAY_CONTRACT.md` (shadow-mode semantics live in REPLAY_CONTRACT §Shadow). Conflicts C1–C4 and gaps D-VAR / D-COLD / hysteresis are resolved in DESIGN_REVISION_REPORT §Resolutions.

### 6.1 Layered View

```text
┌─────────────────────────────────────────────────────────────────┐
│  L4  EVIDENCE STORES (file-backed, append-only, versioned)      │
│      RuntimeHealthStore · EvaluationStore · ShadowLog           │
├─────────────────────────────────────────────────────────────────┤
│  L3  DECISION ENGINE (pure functions, no I/O at decision time)  │
│      RequirementBuilder → CandidateDiscovery → EligibilityGates │
│      → ScoringEngine → DeterministicSelector → Explanation      │
├─────────────────────────────────────────────────────────────────┤
│  L2  V2.1 CORE (FROZEN)                                         │
│      classifier · risk · agent-router · model ladder · variant  │
│      permission resolver · circuit breaker · escalation         │
├─────────────────────────────────────────────────────────────────┤
│  L1  HOST (OpenCode 1.18.25)                                    │
│      chat.params · tool.execute.before · session/agent identity │
└─────────────────────────────────────────────────────────────────┘
```

Layer rules:

- **L3 never mutates state.** Decision functions take `(requirement, candidates, evidence, policy)` and return `(route, explanation)`. All I/O (reading stores, writing events) happens at the L3↔L4 boundary, before and after the pure decision call.
- **L2 remains authoritative for safety.** L3's output is a *recommendation* that L2 validates: permission resolution, hard denials, and breaker checks run after selection exactly as they do today.
- **L4 is append-only.** Corrections are new records with timestamps, never edits.

### 6.2 Component Boundaries

| Component | Responsibility | Inputs | Outputs | Failure mode |
|---|---|---|---|---|
| RequirementBuilder | Map (taskClass, risk, agent, prompt stats) → TaskRequirement | V2.1 classification output | `TaskRequirement` | Deterministic table lookup; cannot fail |
| CandidateDiscovery | Enumerate (provider, model, variant) triples from registry | Capability registry (SSOT) | Candidate list | Registry read failure → V2.1 ladder |
| CapabilityGate | Binary eligibility on capability evidence | Candidates, requirements | Eligible set + exclusion reasons | UNKNOWN capability → per policy (§6.4) |
| HealthGate | Binary eligibility on breaker state + hard health floors | Candidates, RuntimeHealthStore | Eligible set + exclusion reasons | Store failure → breaker-only behavior (V2.1) |
| PolicyGate | Binary eligibility on policy constraints (agent restrictions, variant ceiling, provider availability, budget) | Candidates, policies, budgets | Eligible set + exclusion reasons | Policy read failure → V2.1 behavior |
| ScoringEngine | Score each eligible candidate across 7 dimensions | Eligible set, evidence, weight profile | Scored candidates + breakdowns | Any exception → V2.1 ladder route |
| DeterministicSelector | Rank + tie-break | Scored candidates | Optimal route | Same |
| ExplanationBuilder | Assemble RouteExplanation | All of the above | `RouteExplanation` event | Explanation loss never affects the route |
| EvidenceRecorder | Persist evaluation signals, health updates, shadow comparisons | Execution + evaluation outcomes | Store appends | Write failure → log locally, never block execution |
| ShadowReporter | Run decision engine against V2.1's actual decision, record deltas | V2.1 route + V2.2 hypothetical route | ShadowLog append | Never affects the real route |

### 6.3 Data Flow (happy path)

```text
USER PROMPT
  → L2 classify/risk/agent                     (V2.1, unchanged)
  → RequirementBuilder → TaskRequirement
  → CandidateDiscovery → all registry candidates
  → CapabilityGate ∩ HealthGate ∩ PolicyGate → ELIGIBLE SET
  → ScoringEngine → scored set (+ per-dimension breakdown)
  → DeterministicSelector → optimal route
  → ExplanationBuilder → RouteExplanation (logged)
  → L2 permission + execution                  (V2.1, unchanged)
  → observation → evaluator                    (V2.1, unchanged)
  → EvidenceRecorder: EvaluationSignal + HealthDelta
  → (next decision re-reads stores; no in-decision writes)
```

### 6.4 Hard Constraints vs Soft Objectives

| Layer | Nature | Examples | Result |
|---|---|---|---|
| Hard constraints | Binary, evaluated before scoring | capability unavailable; vision unsupported; circuit OPEN; variant unsupported; permission/agent restriction; provider unavailable; policy violation; cost budget exceeded; quality floor violated (high-risk tasks) | Candidate **EXCLUDED** — no score can resurrect it |
| Soft objectives | Continuous, scored 0..1 | quality, capabilityFit, reliability, latencyFit, costFit, contextFit, recentSuccess | Candidate remains eligible; contributes to ranking |

Rule: **if a dimension can be expressed as a floor for a task class, it is a gate; only the residual preference is a weight.**

UNKNOWN capability evidence is a special case: it is not automatically an exclusion (that would make every new model unroutable) nor a free pass. Per-dimension policy: UNKNOWN blocks a candidate only when the task class declares that capability **mandatory** (e.g., vision for a vision task); otherwise UNKNOWN yields neutral-fit scoring with confidence 0 (see ROUTING_MODEL §4).

### 6.5 Security Invariants (summary — full list in SECURITY_BOUNDARY doc)

```text
INV-A  HARD DENY > everything (unchanged precedence).
INV-B  OPEN circuit ⇒ candidate ineligible, regardless of score.
INV-C  V2.2 output cannot add, relax, or bypass any permission.
INV-D  Vision remains BLOCKED; no capability score can enable it.
INV-E  Variant ceiling enforced at route layer as today.
INV-F  research/reviewer read-only force unchanged.
INV-G  Scoring engine failure ⇒ V2.1 deterministic ladder route.
INV-H  No randomness anywhere in the decision path.
```

## 7. Failure Boundaries

| Failure | Detection | Behavior |
|---|---|---|
| ScoringEngine throws / exceeds budget | try/catch + wall-clock watchdog at the L2→L3 call site | Fall back to V2.1 ladder selection; log `scoring-degraded` |
| RuntimeHealthStore unreadable | open/parse failure | HealthGate passes all (breaker still enforced from L2); reliability uses priors; log `evidence-store-unavailable` |
| EvaluationStore unreadable | same | recentSuccess dimension = prior 0.5, confidence 0; everything else normal |
| Registry drift (model removed mid-session) | discovery returns fewer candidates | Recompute; if empty → V2.1 BLOCKED semantics |
| Evidence poisoning (bogus metrics) | schema validation + bounds check on read | Invalid records rejected at read time; provenance recorded |
| Budget exhaustion (routing overhead) | wall-clock watchdog on decision path | Degrade to V2.1 ladder; routing cost must never approach model latency |
| Partial V2.2 flags | flag dependency order (§9.1) | Layers degrade independently; L2 core always functional |

**The critical rule:** V2.2 code paths are structured so that *any* exception inside L3 is caught at exactly one boundary and replaced by the V2.1 route. There is no state to roll back because L3 is pure.

## 8. Fallback Architecture

Three distinct mechanisms, deliberately separated:

1. **Candidate fallback (V2.1, extended):** on execution failure, classify the failure, update evidence, **exclude the failed candidate**, and re-run gates+scoring on the remaining set. Bounded by `MAX_REROUTES = 3` as today. If scoring is unavailable, behavior degenerates to the V2.1 ladder walk.
2. **Engine fallback (V2.2-specific):** decision-layer failure → V2.1 ladder route (§7).
3. **Continuation (V2.1 semantics, unchanged):** escalation remains *continuation / re-dispatch* — never in-flight model mutation. V2.2 does not alter escalation packets, bounds, or labels.

## 9. Deployment / Runtime Considerations

### 9.1 Feature Flags (conceptual; declared in router `config.json`, defaults safe)

```text
v22ScoringEnabled            default false   master switch for the L3 decision engine
v22HealthScoringEnabled      default false   reliability dimension uses RuntimeHealthStore
v22EvaluationFeedbackEnabled default false   evaluator output → evidence stores
v22ShadowMode                default true    log hypothetical V2.2 route vs actual V2.1 route
v22OptimizedRouting          default false   V2.2 route becomes the executed route (opt-in)
```

Dependency order: `v22OptimizedRouting` requires `v22ScoringEnabled`; `v22HealthScoringEnabled` and `v22EvaluationFeedbackEnabled` feed evidence and may run under shadow. `v22ShadowMode` is safe with everything else off. **Shadow-only is the initial production posture.** Invalid flag combinations (e.g., OPTIMIZED without SCORING) are rejected at config validation, before any routing occurs.

### 9.2 Decision Modes

| Mode | Semantics |
|---|---|
| OFF | V2.1 behavior only; V2.2 code inert |
| SHADOW | V2.1 decides; V2.2 computes + records the hypothetical route and deltas; zero runtime influence |
| ADVISORY | V2.2 route recorded as a recommendation with deltas; V2.1 still decides; surfaced in logs/CLI only |
| OPTIMIZED | V2.2 route is executed; still passes through the full V2.1 permission/breaker validation |
| AUTO | Reserved; OPTIMIZED plus limited automatic weight-profile selection — **not part of MVP** |

ADVISORY never mutates routing. Only OPTIMIZED changes behavior, and only when explicitly enabled.

### 9.3 Performance Budget (control plane, per decision)

| Step | Budget |
|---|---|
| RequirementBuilder | < 1 ms (table lookup) |
| CandidateDiscovery + gates | < 5 ms for 13 models × variants |
| Health/cost/latency evidence lookup | < 5 ms (small file-backed stores) |
| Scoring + selection | < 5 ms (pure arithmetic) |
| Explanation assembly | < 2 ms |
| Evidence write (async, off critical path) | background |

Total synchronous decision overhead target: **< 20 ms**, vs model inference measured in seconds. Control-plane latency is measured separately from model latency and reported independently.

### 9.4 Storage Layout (new files; nothing existing is rewritten)

```text
.opencode/ai/evidence/health-snapshots.jsonl      (append-only)
.opencode/ai/evidence/evaluation-signals.jsonl    (append-only)
.opencode/ai/evidence/shadow-decisions.jsonl      (append-only)
.opencode/ai/evidence/schema-versions.json        (per-store schema version)
```

All stores: JSONL, append-only, schema-version field on every record, size-threshold rotation keeping N rotations (exact numbers set at implementation). Runtime state directories are gitignored (consistent with the v2.1.0 `.gitignore` release hygiene).

## 10. Final Architecture Position

V2.2 = **deterministic optimization layer** over the frozen V2.1 safety core: gates before scores; evidence with provenance; pure decision functions; one failure boundary to V2.1; shadow-first rollout; no randomness; no permission influence; no vision change; no breaker change.
