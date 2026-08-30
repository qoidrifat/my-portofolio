# SMART ROUTER V2.2 — SECURITY BOUNDARY

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Baseline: v2.1.0 security semantics (15 hard denies, 4 gates, mode-independent, live-verified).

---

## 1. The Prime Directive

> V2.2 optimizes *which eligible model runs*.
> It never optimizes *what that model may do*.

Every mechanism in the V2.2 design is subordinate to V2.1's authority order:

```text
HARD DENY  >  read-only force  >  confirmation gates  >  profile  >  default ASK
```

V2.2 sits *between* candidate enumeration and the existing permission check. It reorders candidates; it cannot create, widen, or bypass any permission outcome.

## 2. Hard Constraints (binary, pre-scoring)

| # | Constraint | Gate | Exclusion semantics |
|---|---|---|---|
| H1 | Capability unavailable / mandatory-dim missing | D3 | candidate excluded; vision-task with no verified vision ⇒ route BLOCKED (not "next best") |
| H2 | Vision unsupported | D3 | every candidate (workspace-wide `supportsVision=false` until independently verified) |
| H3 | Permission violation / agent restriction / variant ceiling | D2 | candidate excluded; resolver still runs post-selection (belt and suspenders) |
| H4 | Policy violation (policyStatus FORBIDDEN) | D2 | candidate excluded |
| H5 | Circuit OPEN | D4 | candidate excluded — health score irrelevant, score irrelevant |
| H6 | Provider unavailable | D2 | candidate excluded |
| H7 | Cost budget exceeded | D5 | candidate excluded |
| H8 | Latency budget exceeded (p95) | D5 | candidate excluded — but latency budget alone never rejects in HIGH/CRITICAL tasks unless explicitly configured (task-aware, DECISION_MATRIX) |
| H9 | Quality floor (task class + risk declared) | D4 | candidate excluded; only enforced when evidence confidence ≥ 0.6 |
| H10 | Health floor (task class declared) | D4 | candidate excluded; same confidence rule |

No scoring function, weight, confidence, or future feature may resurrect an excluded candidate.

## 3. Permission Independence (formal statement)

```text
Let P(v21)  = permission outcome of the frozen V2.1 resolver for (operation, agent, risk, mode).
Let S(v22)  = V2.2 selection function output (a candidate ordering).

Invariant:  ∀ operation, state:  P(v21) is a pure function of V2.1 inputs.
            S(v22) influences ONLY which (provider, model, variant) executes.
            No field of any V2.2 artifact (score, explanation, evidence, flag)
            is an input to P.

Corollary:  a "better model" chosen by V2.2 executes under exactly the permission
            envelope that V2.1 would have applied to that same candidate.
```

`permissionCompatibility` in the Candidate schema is a *read-only preview* of P for exclusion purposes; it does not feed back. Evaluation signals (F07/F11) record denials for audit but cannot alter policy, gates, or permission semantics.

## 4. Security Invariants (testable)

```text
I-001  Hard deny is absolute.              No V2.2 state changes any hard-deny outcome
                                           (all modes incl. YOLO).
I-002  OPEN circuit candidates are never selected.  Breaker precedes scoring; score of 1.0
                                           on an OPEN candidate is unreachable by construction.
I-003  V2.2 cannot increase permission.    P depends only on V2.1 inputs (§3); property-tested.
I-004  Unsupported variants cannot be selected.  Variant ceiling remains a D2 hard gate.
I-005  Vision remains blocked until verified.  No capability score enables it; D3 has no
                                           vision exception.
I-006  Same state produces same route.     decisionId determinism (OBSERVABILITY §5);
                                           property test: shuffle iteration order → same winner.
I-007  Missing evidence never becomes fabricated evidence.  UNKNOWN → prior 0.5 + confidence 0;
                                           provenance mandatory; bounds-checked reads.
I-008  Scoring failure falls back safely to V2.1 behavior.  Single catch boundary; pure L3;
                                           no partial state; degraded event logged.
I-009  Evaluation failure cannot cause privilege escalation.  Evaluator output is data, never
                                           policy; schema-validated; F14 has zero routing effect.
I-010  One model's failure does not automatically poison unrelated models.  Attribution levels
                                           (provider/model/provider+model) + segment scoping;
                                           F12 never touches model health.
I-011  Fallback remains bounded.           MAX_REROUTES=3 unchanged; re-scoring cannot extend it.
I-012  Continuation remains explicitly distinct from in-flight mutation.  Packet semantics,
                                           labels, bounds unchanged.
I-013  Flags cannot create unsafe combos.  OPTIMIZED without SCORING rejected at config
                                           validation; defaults are safe (OFF/shadow).
I-014  Evidence stores are append-only.    No decision-path writes; corrections are new records.
I-015  No randomness in the decision path. No RNG anywhere in L3; exploration exists only as
                                            offline/shadow analysis.
I-016  Attribution integrity.              An evaluation/signal with incomplete attribution
                                            (missing session/route/execution/candidate/task link)
                                            updates NO ranking or quality state — stored for
                                            audit only.
I-017  Cold-start determinism.             An all-UNPROVEN eligible set resolves to the V2.1
                                            ladder head; ASCII candidateId is never a cold-start
                                            ranking mechanism (final tie-break only).
I-018  Variant-evidence precedence.        Evidence resolves variant → model → family with
                                            explicit inheritance marking and confidence caps;
                                            no unmarked cross-variant inference.
I-019  Health-confidence floor.            Health/quality dimensions with sampleSize < 5 or
                                            expired freshness contribute neutral priors at
                                            confidence 0 and can never enforce or pass a floor.
I-020  Counterfactual integrity.           Replay/shadow may compute alternative ROUTES but
                                            never alternative SUCCESSES; outcome claims require
                                            independent observation (OBSERVED/ESTIMATED/UNKNOWN).
I-021  Telemetry isolation.                Instrumentation (T1–T5) is fail-open and observational;
                                            its failure or absence alters no routing, permission,
                                            breaker, or security behavior.
```

## 5. Failure-Safe Behavior (optimizer failure)

```text
V2.2 optimization unavailable (throw / timeout / store missing / flag off)
        ↓
V2.1 deterministic baseline routing (ladder walk, breaker-aware, permission-gated)
        ↓
degradation event logged; explanation notes degradedToV21=true
```

Rules:
- Exactly one catch boundary wraps L3; the V2.1 path needs nothing from V2.2 (flags OFF = v2.1.0 behavior — verified by compatibility test).
- No cached "half-decisions": L3 purity means a failed decision leaves zero residue.
- Evidence stores being stale/unavailable degrade *quality of ranking*, never *safety* (breaker is read by L2 regardless).
- V2.2 must never be a new single point of failure: if the L3 process cannot run at all, V2.1 runs without it.

## 6. Adversarial Considerations & Safeguards

| Threat | Vector | Safeguard |
|---|---|---|
| Temporary latency spike distorting ranking | probe timing manipulation | windowed p50/p95 with min sample sizes; bucket comparability; spikes move one window slot ≤ 1/n |
| Provider marketing metadata gaming | inflated registry claims | evidence hierarchy: claims are DOCUMENTATION (conf .4) until verified; scores weight LIVE evidence; registry changes are auditable diffs |
| Biased evaluator | systematic qualityScore skew | evaluator confidence gating (< .6 → no update); multi-signal quality (tests/reviews/tools, not one number); F14 path |
| Prompt injection influencing evaluator | adversarial prompt → wrong failureClass | evaluator output schema-validated, fixed enum, free-text display-only; injection attempts classify as F07/POLICY or are ignored |
| Provider-specific formatting tricks | output shaped to look better to evaluator | quality = multi-signal; observed ≠ single-score; segmentation by task class limits cross-task gaming |
| Metric manipulation (store poisoning) | tampered JSONL | schema+bounds validation at read; provenance required; out-of-range rejected + logged; append-only + rotation |
| Stale registry claims | capability drift after model updates | evidence has `verifiedAt`; freshness decay (24h/72h rules); re-verification workflow out of scope but supported by schema |
| Task distribution shift | segments tuned to yesterday's mix | windows bounded (recent-20); hierarchical fallback; no autonomous weight editing (human recalibration only) |
| Evaluator/store unavailable → silent trust collapse | missing evidence treated as good evidence | missing → UNKNOWN → prior + conf 0; floors stop enforcing rather than enforce on garbage (ROUTING_MODEL §9) |

## 7. Preserved V2.1 Guarantees (unchanged by V2.2)

```text
YOLO cannot bypass hard deny (verified 144/144 suite + live; V2.2 adds no bypass path)
research/reviewer read-only force bounded at route layer + policy
variant ceiling enforced (chat.params clamp remains defense-in-depth)
breaker state machine untouched (threshold 3, cooldown 300s, half-open probe)
policy files untouched by routing decisions (policy-self-modify deny intact)
vision BLOCKED (runtime evidence; no new evidence, no new claim)
```

## 8. Design Review Gates — Safety Answers

```text
GATE 2 (safety):       every hard invariant maps to a gate/pure-function boundary; testable.
GATE 5 (isolation):    single catch boundary → V2.1; flags default off; no SPOF introduced.
GATE 9 (rollout):      shadow-first; behavior change only via explicit OPTIMIZED opt-in.
```
