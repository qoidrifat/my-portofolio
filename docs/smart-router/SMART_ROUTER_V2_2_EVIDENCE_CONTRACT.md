# SMART ROUTER V2.2 — EVIDENCE CONTRACT v1

Status: **CANONICAL (design revision)** · Authority level: below DECISION_MATRIX, above OBSERVABILITY_DESIGN (ARCHITECTURE §6.0)
Companions: `SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md` (how evidence is captured), `SMART_ROUTER_V2_2_REPLAY_CONTRACT.md` (how it is replayed)

---

## 1. Purpose

Defines the minimum runtime evidence V2.2 requires, per-field semantics, and the rules that keep evidence trustworthy: attribution, statuses, freshness, privacy. Implementation-free: this contract constrains the instrumentation spec and the replay contract; it does not implement anything.

## 2. Evidence Record — 20 canonical fields

Every evidence-producing event (T1–T5) and every ReplayRecord carries fields from this table. `R` = required, `O` = optional (optional fields use `null` + reason when absent — never invented).

| # | Field | Req | Type | Source | Unit | Min quality | Freshness | Privacy | Aggregation | Provenance |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | sessionId | R | string | host session | opaque ID | exact | session | low (ID only) | none | eventId |
| 2 | routeId | R | string | V2.1 router | `R-<id>` | exact | session | low | none | eventId |
| 3 | executionId | R | string | T2 emitter | `E-<id>` | exact | 30 d | low | none | eventId |
| 4 | evaluationId | R (T1) | string | evaluator | `V-<id>` | exact | 30 d | low | none | eventId |
| 5 | providerId | R | string | V2.1 decision record | registry ID | exact | registry change | low | none | eventId |
| 6 | modelId | R | string | V2.1 decision record | registry ID | exact | registry change | low | none | eventId |
| 7 | variant | R | string\|null | V2.1 decision record | registry variant | exact (null = base) | registry change | low | none | eventId |
| 8 | taskClass | R | enum (21 source classes) | V2.1 classifier | enum | exact | per request | low | none | eventId |
| 9 | optimizationClass | R | enum (8 classes) | C4 mapping (DECISION_MATRIX §1.1) | enum | exact (derived) | derived | low | none | mapping table version |
| 10 | riskClass | R | enum LOW/MEDIUM/HIGH/CRITICAL | V2.1 risk engine | enum | exact | per request | low | none | eventId |
| 11 | agent | R | enum | V2.1 agent-router | enum | exact | per request | low | none | eventId |
| 12 | capabilityEvidence | O | per-dim {value, evidenceLevel, confidence, verifiedAt} | capability registry / T5 probe | per-dim | LIVE>INTEGRATION>STATIC>DOC>UNKNOWN | VERIFIED 30 d expiry | low | per (model,dim) | probe/registry version |
| 13 | executionOutcome | R (T2) | enum {COMPLETED, FAILED, ERROR, CANCELLED} + errorClass | T2 emitter | enum | exact class | 30 d | medium (no content) | none | eventId |
| 14 | qualityOutcome | O | {grade 0..1, confidence, evaluatorId} | T1 evaluator | 0..1 | conf ≥ 0.6 to affect stats | 30 d | medium | per segment | evaluator version |
| 15 | failureClass | O | fixed enum (EVALUATION_DESIGN §2 taxonomy) | evaluator / error mapping | enum | enum-exact | 30 d | medium | per segment | eventId |
| 16 | latency | O | {t0,t1,t2,t3, TTFR, completion, timeout} | T3 emitter | ms | all captured timestamps present, else UNKNOWN | 14 d half-life | low | per (model,variant,class,outputBucket) | emitter version |
| 17 | cost | O | {inputUsage, outputUsage, pricingSource, effectiveCost, unit} | T4 emitter / pricing registry | tokens + currency/credit | VERIFIED/PARTIAL/UNKNOWN (§5) | pricing-source change | medium (usage only) | per (model,variant) | pricing source version |
| 18 | health | O | {breakerState, successRate, sampleSize, confidence} | V2.1 breaker + health store | enum + 0..1 | breaker exact; score n ≥ 5 | 24 h | low | per provider / model / provider+model | eventId |
| 19 | timestamp | R | ISO-8601 UTC | host clock | ms precision | monotonic per store | n/a | low | none | eventId |
| 20 | provenance | R | [eventId] + schemaVersion | every emitter | ID list | ≥1 entry | n/a | low | none | — |

Missing required field → record is **incomplete** → stored for audit, excluded from all statistics (§4).

## 3. Statuses

Evidence-bearing fields carry exactly one status:

```text
VERIFIED   produced by a runtime-verified source (live probe, executed usage)
PARTIAL    produced but incomplete (e.g., pricing without usage, latency without t2)
UNKNOWN    absent or below minimum quality — explicit, never fabricated
```

No-silent-degradation: UNKNOWN → PARTIAL/VERIFIED transitions require new evidence, never defaults. UNKNOWN is never coerced to 0, free, cheap, neutral-with-confidence, or any scoring-active value.

## 4. Attribution invariant (I-016)

Canonical chain (all links required for statistics):

```text
sessionId → routeId → executionId → candidate(provider, model, variant) → taskClass → evaluationId
```

- Candidate identity preserves provider + model + variant jointly (I-018).
- Incomplete attribution → record stored, **no model-quality / health / ranking update**. No exception.
- Variant-missing attribution is incomplete even when model attribution exists (D-VAR).

## 5. Signal-specific canonical rules

**Quality.** Intrinsic (registry tier) + observed (attributed evaluations) are separate; blend is confidence-weighted with observed weight clamped [0.25, 0.75] (ROUTING_MODEL §7, ADR-019). 50/50 = PROVISIONAL. Observed quality requires: complete attribution + n ≥ 5 per segment + evaluator confidence ≥ 0.6 + failure classification present. Quality = UNKNOWN otherwise → dimension inert.

**Latency.** t0 request-start, t1 provider dispatch, t2 first response/token, t3 completion. Derived: TTFR = t2−t0, completion = t3−t0, timeout flag. Ranking metric: p50 primary, p95 for budget gates; EWMA α=.3 + recent-20 = **DESIGN PROPOSAL** until replay-2 validates. The V2.1 harness `duration_ms` is **excluded permanently** from latencyFit (ADR-017) — never mixed with inference latency. Unobtainable timestamp → latency UNKNOWN for that request.

**Cost.** Statuses VERIFIED (pricing + usage both present), PARTIAL (one of the two), UNKNOWN. UNKNOWN never becomes 0/free/cheap; costFit = 0.5 + confidence 0 → inert via renormalization (ADR-018).

**Health.** Breaker is authority: OPEN → exclude, HALF_OPEN → probe, CLOSED → eligible for health-score ranking. Health score requires sampleSize ≥ 5, freshness 24 h (×0.5 decay) / 72 h → UNKNOWN (I-019). Provider, model, and provider+model health remain separate records (never collapsed).

**Capability.** Promotion ladder UNKNOWN → DOCUMENTED → STATIC → INTEGRATED → VERIFIED (ADR-002 evidence hierarchy). Promotion requires evidence at the target level (live runtime proof for VERIFIED) — never model names or family reputation. VERIFIED evidence expires after **30 days** without re-verification → demotes one level. Vision remains BLOCKED until runtime-verified multimodal proof exists (I-005); no ladder path bypasses it.

## 6. Privacy

IDs, enums, timings, token counts only. No prompt content, no file contents, no secrets, no user-identifying data beyond opaque session IDs. Evaluator free-text (e.g., `insufficiencyReason`) is display-only and MUST NOT be persisted in telemetry stores (injection surface, EVALUATION_DESIGN §4).

## 7. Calibration procedure (replay-2 input)

1. Instrumentation runs for a baseline collection window (length: REQUIRES HUMAN APPROVAL; recommendation: ≥ 2 weeks of real usage).
2. Compute coverage: attribution completeness %, latency capture %, cost capture %, capability VERIFIED coverage per dim.
3. Set H (hysteresis) ≥ p75 of evidenced-peer score-margin distribution (ROUTING_MODEL §16).
4. Validate conf-threshold .6 against graded-confidence data (THRESHOLD_ANALYSIS §5).
5. Coverage targets and final H: **REQUIRES HUMAN APPROVAL** — no thresholds are invented here.

## 8. Versioning

`schemaVersion` per record; contract version: **v1**. Breaking field changes require a new contract version + migration note in REPLAY_CONTRACT. Append-only stores; corrections are new records referencing the original eventId.
