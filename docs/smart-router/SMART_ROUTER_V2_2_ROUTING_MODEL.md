# SMART ROUTER V2.2 — ROUTING MODEL

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Baseline: Smart Router v2.1.0 (immutable) · Companion to `SMART_ROUTER_V2_2_ARCHITECTURE.md`

---

## 1. Task Requirement Model

`RequirementBuilder` deterministically maps V2.1 outputs — `(taskClass, riskLevel, agent, promptStats)` — to a `TaskRequirement`. No LLM call, no inference: table lookup + arithmetic.

```text
TaskRequirement {
    taskClass            enum    produced by V2.1 classifier (8 canonical classes)
    riskLevel            enum    LOW | MEDIUM | HIGH | CRITICAL  (V2.1 risk engine)
    agent                enum    build | plan | research | reviewer | general (V2.1)
    reasoningDemand      0..1
    codingDemand         0..1
    researchDemand       0..1
    debuggingDemand      0..1
    reviewDemand         0..1
    toolUseDemand        0..1
    contextDemand        tokens  estimated total context need (prompt + files + expected output)
    modality             enum    text | vision        (vision ⇒ BLOCKED until verified, see §4)
    latencySensitivity   0..1    0 = hours acceptable, 1 = seconds
    costSensitivity      0..1
    reliabilityRequirement 0..1
}
```

Per-dimension definition:

| Dimension | Range | Meaning | Producer | Confidence | Fallback (missing input) |
|---|---|---|---|---|---|
| taskClass | 8 enums | Canonical class | V2.1 classifier | high (deterministic) | `routine-review` + confidence 0.2 |
| riskLevel | 4 enums | V2.1 risk engine verdict | V2.1 risk-engine | high | MEDIUM |
| agent | enum | Threading identity | V2.1 agent-router | high | build |
| reasoning/coding/research/debugging/review/toolUse Demand | 0..1 | Demand intensity per capability axis | class→demand table (§7 of DECISION_MATRIX) | high (table) | class default row |
| contextDemand | tokens (int ≥ 0) | Estimated context need = prompt tokens + declared/attached file estimate + expected output allowance | prompt stats + file-attach count × constant; **no repository crawl** | medium | prompt tokens only |
| modality | text/vision | Required modality | classifier; vision only when explicitly requested | high | text |
| latencySensitivity | 0..1 | How much ranking should prefer speed | class table + user override | high (table) | class default |
| costSensitivity | 0..1 | How much ranking should prefer cheap | class table + budget presence | high (table) | class default |
| reliabilityRequirement | 0..1 | Minimum trust in execution success | risk → reliability mapping | high | risk default |

Explicit non-dimension: **task specialization beyond the 8 classes is NOT modeled** — V2.1's classifier defines the canonical segmentation; inventing finer classes without evaluation data is rejected (ADR-002).

## 2. Candidate Model

```text
Candidate {
    candidateId              canonical: "<provider>/<model>#<variant>" (ASCII, sortable)
    provider                 string  (SSOT registry)
    model                    string  (SSOT registry)
    variant                  string  (SSOT registry variants; null = base)
    capabilities             Map<CapabilityDim, CapabilityEvidence>
    capabilityFit            0..1 + confidence      computed (§4)
    availability             enum    OPEN | HALF_OPEN | CLOSED | UNKNOWN   (breaker state, V2.1)
    health                   HealthSnapshot | null  (§5)
    reliability              0..1 + confidence      computed (§5.3)
    quality                  0..1 + confidence      computed (§7)
    latency                  LatencyStats | null    (§6.2)
    cost                     CostEstimate | null    (§6.1)
    contextFit               0..1 + confidence      computed (§8)
    historicalPerformance    SegmentStats | null    (§9 of EVALUATION_DESIGN)
    policyStatus             enum    ALLOWED | FORBIDDEN | GATED   (policy/agent/variant constraints)
    permissionCompatibility  enum    COMPATIBLE | INCOMPATIBLE     (V2.1 resolver view of this candidate for this agent/risk)
}
```

Field semantics (source / type / unit / update frequency / confidence / missing behavior / hard-soft / user-visible):

| Field | Source | Type/Unit | Update frequency | Confidence | Missing behavior | Hard/Soft | User-visible |
|---|---|---|---|---|---|---|---|
| candidateId | registry | string | registry change | 1.0 | registry empty → BLOCKED | hard (identity) | yes |
| provider/model/variant | SSOT `opencode.jsonc` + matrix | string | registry change | 1.0 | n/a | hard | yes |
| capabilities | capability registry (§4) | evidence records | on verification events | per-evidence | UNKNOWN | hard-if-mandatory, else soft | yes (explanations) |
| capabilityFit | computed | 0..1 | per decision | derived | 0.5 + conf 0 | soft | yes |
| availability | breaker state file | enum | every failure/success/recovery | 1.0 (state machine) | UNKNOWN → treat as CLOSED + conf 0 | **hard** (OPEN excludes) | yes |
| health | RuntimeHealthStore | snapshot | on each evaluation batch | per-sample-size | null → priors | soft (except hard health floor) | yes |
| reliability | computed from health+breaker | 0..1 | per decision | derived | 0.5 + conf 0 | soft (floor = hard where configured) | yes |
| quality | intrinsic registry tier ⊕ observed evaluation | 0..1 | on evaluation events | derived | intrinsic-only | soft (floor = hard for high risk) | yes |
| latency | LatencyStats (p50/p95, ms) | ms | per evaluation batch | per sample-size | null → neutral + conf 0 | soft (budget = hard) | yes |
| cost | CostEstimate | normalized 0..1 fit + nominal enum | registry/policy change; usage-derived rarely | per source | UNKNOWN → neutral + conf 0 | soft (budget = hard) | yes |
| contextFit | computed | 0..1 | per decision | medium | 0.5 + conf 0 | soft | yes |
| historicalPerformance | EvaluationStore | SegmentStats | append-only events | per sample-size | null → global segment | soft | yes |
| policyStatus | routing+permission policy | enum | policy change | 1.0 | FORBIDDEN (conservative) | **hard** (FORBIDDEN excludes) | yes |
| permissionCompatibility | V2.1 resolver (read-only preview) | enum | per decision | 1.0 | INCOMPATIBLE | **hard** (INCOMPATIBLE excludes) | audit-only |

`permissionCompatibility` is a **read-only preview** of the existing V2.1 resolver — it never feeds back into permission inputs (ADR-001/SECURITY_BOUNDARY §3).

## 3. Candidate Discovery & Gate Order

```text
D1  Enumerate all (provider, model, variant) from the SSOT registry.
D2  PolicyGate:      drop policyStatus=FORBIDDEN, agent-restricted, variant-ceiling violations,
                    permissionCompatibility=INCOMPATIBLE, provider unavailable.
D3  CapabilityGate:  apply canonical requirement taxonomy (§4.4): MANDATORY / REQUIRED-FLOOR /
                    OPTIONAL. vision task with no verified vision ⇒ BLOCKED route, not exclusion.
D4  HealthGate:      drop availability=OPEN; apply hard health floor / quality floor where
                    the task class + risk declares one (DECISION_MATRIX).
D5  BudgetGate:      drop candidates violating a declared cost/latency budget (§6, §10).
→ ELIGIBLE SET (order-independent; exclusion reasons recorded per candidate per gate)
```

Gate order is fixed and matters only for which exclusion reason is recorded first; the eligible set itself is order-independent (all gates are predicates).

## 4. Capability Model

### 4.1 Taxonomy (13 dimensions — no single "intelligence" scalar)

```text
reasoning            multi-step inference, planning
coding               code generation/editing correctness
debugging            hypothesis-driven fault isolation
architecture         system design quality
research             retrieval synthesis, citation discipline
review               defect detection in existing artifacts
agenticToolUse       multi-step tool orchestration fidelity
contextWindow        usable context capacity (tokens; measured, not marketing)
structuredOutput     schema-conformant outputs
vision               image input                      (BLOCKED workspace-wide until verified)
fileHandling         large-file / repo-scale handling
multimodality        multi-input-type support          (BLOCKED until verified)
speed                responsiveness class (ties to latency evidence, not a name-based guess)
```

### 4.2 Evidence hierarchy (V2.1 principle, preserved)

```text
LIVE VERIFIED          > INTEGRATION VERIFIED > STATIC REGISTRY > DOCUMENTATION > UNKNOWN
(confidence 0.95)        (0.8)                  (0.6)             (0.4)          (0.0)
```

- Evidence is per (model, capability) — never inferred from model names, families, or marketing tiers (ADR-002).
- `contextWindow` may carry a numeric token value with its evidence level; `speed` is derived from latency evidence only, never from names like "flash"/"mini".
- Registry records carry: `value`, `evidenceLevel`, `confidence`, `verifiedAt`, `source`. UNKNOWN is a first-class status (Table D).

### 4.3 Capability Fit Function

```text
For each capability dim d with demand r_d > 0:
    fit_d = clamp(candidateValue_d / requiredValue_d, 0, 1)      for numeric dims (contextWindow)
    fit_d = candidateValue_d                                     for ordinal dims (0..1 scale)
    fit_d = 1.0 if evidenceLevel ≥ required minimum, else 0.0    for binary/level dims (vision, structuredOutput)

capabilityFit = Σ(w_d · fit_d) / Σ(w_d)          w_d = r_d (task demand weights the axis)
confidence(capabilityFit) = min(confidence of contributing evidence)
```

Rules:
- Dimensions with `fit_d = 0` where the demand is *mandatory* never reach scoring — they were excluded at D3.
- Dimensions with UNKNOWN evidence contribute the neutral prior 0.5 at confidence 0.0; they drag the dimension's *confidence*, not its score floor.
- capabilityFit ∈ [0,1]; missing demands (r_d = 0) do not contribute.

### 4.4 Canonical Requirement Taxonomy (C1 resolution — normative)

Every capability requirement declared by a task class is one of exactly three tiers. Evidence states: `KNOWN-SUPPORTED` (evidence ≥ required level), `KNOWN-UNSUPPORTED` (verified negative), `UNKNOWN` (no evidence at or above required level). This section is the **single canonical rule**; DECISION_MATRIX Example 3 and all other documents defer to it.

| Tier | KNOWN-SUPPORTED | KNOWN-UNSUPPORTED | UNKNOWN |
|---|---|---|---|
| **MANDATORY** | eligible | EXCLUDE | **EXCLUDE** |
| **REQUIRED-FLOOR** | eligible + floor credit | EXCLUDE | eligible, **NO floor credit** |
| **OPTIONAL** | contributes fit | contributes fit 0 | neutral prior 0.5, conf 0, weight renormalization |

Tier-level edge rules:

```text
MANDATORY, eligible set becomes empty   → BLOCK (no silent degradation; vision-task precedent)
REQUIRED-FLOOR, ≥1 floor-verified candidate exists
                                        → UNKNOWN candidate stays eligible WITHOUT floor credit
                                          (it can never receive the floor; see §9 gate rule)
REQUIRED-FLOOR, NO floor-verified candidate exists
                                        → do NOT BLOCK, do NOT let UNKNOWN win by tie-break:
                                          degrade to the V2.1 route for this decision
OPTIONAL UNKNOWN                        → neutral prior 0.5 + confidence 0 + renormalization (§10.3)
```

Rationale (ADR-011): the three tiers differ by blast radius. MANDATORY means the task cannot succeed without the capability (exclusion is safe; blocking beats silent text-only degradation — the vision-task precedent). REQUIRED-FLOOR is a quality bar: unverifiable evidence must not credit a candidate, but must not destroy routing either — V2.1 made that decision under human-verified policy, so the safe path is V2.1 fallback, never an accidental UNKNOWN winner. OPTIONAL is scoring-only. Examples: vision = MANDATORY for vision-task; `review+reasoning ≥ INTEGRATION` = REQUIRED-FLOOR for security-review; long context = OPTIONAL for routine-review.

### 4.5 VariantEvidence (D-VAR resolution — normative)

Routing identity is `provider + model + variant`; evidence is stored at that granularity.

```text
VariantEvidence {
    schemaVersion     int
    providerId        string
    modelId           string
    variant           string            (null = base model)
    dimensions {                        per capability/evidence dim:
        value         number | null
        confidence    0..1
        sampleSize    int
        lastUpdated   ISO-8601
        source        enum { LIVE_RUNTIME | INTEGRATION | STATIC | DOCUMENTATION | USAGE_OBSERVED }
    }
    provenance        [eventId]
}
```

Aggregation hierarchy (used ONLY when the specific level lacks data; never silently skips a level):

```text
variant level   n ≥ 5     → authoritative for that variant
model level     n ≥ 20    → used for a variant only when variant n < 5, marked inherited=true
family/global             → priors only, confidence 0 contribution
```

- Confidence shrinkage: `confidence = n / (n + 10)`; staleness: 14-day half-life multiplier.
- **No cross-variant inference**: a variant never inherits stronger evidence merely because its parent model is strong; inherited model-level data is explicitly marked and confidence-capped (×0.5).
- Variant verification status (VERIFIED / UNSUPPORTED / BLOCKED_UPSTREAM, from the V2.1 SSOT registry) remains a hard D2 gate independent of VariantEvidence scoring.

## 5. Health Model

### 5.1 HealthSnapshot

```text
HealthSnapshot {
    schemaVersion      int
    timestamp          ISO-8601
    provider           string
    model              string
    breakerState       OPEN | HALF_OPEN | CLOSED        (mirrored from V2.1, read-only)
    successRate        0..1        (windowed)
    errorRate          0..1
    latencyStats       { p50, p75, p95 ms, timeoutRate }
    recentFailures     [ { timestamp, failureClass, severity } ]   (capped list, N=10)
    recoveryStability  0..1        (successful half-open probes / attempts)
    sampleSize         int         (observations in window)
    confidence         0..1        (sample-size + freshness derived, §5.4)
    window             { type: "recentN", n: 20, ewma: { halfLifeEvents: 10 } }
}
```

Attribution levels are separate records: **provider health**, **model health**, **provider+model health** (ADR-003). A provider-level snapshot aggregates across its models; "provider degraded, all models affected" and "provider healthy, one model unhealthy" are both representable and never collapsed.

### 5.2 Thresholds & lifecycle

| Condition | Rule |
|---|---|
| sampleSize < 5 | status UNKNOWN → neutral prior 0.5, confidence 0 — no statistical claim |
| 5 ≤ sampleSize < 20 | status LOW-CONFIDENCE → usable for ranking, confidence scaled `n/20` |
| sampleSize ≥ 20 | full confidence (modulo freshness) |
| staleness > 24h (no new observations) | confidence ×= 0.5; > 72h → treated as UNKNOWN |
| cold start (new model) | prior 0.5 + confidence 0; breaker still applies from observation 1 |
| outlier event | single observation cannot move successRate by more than 1/n of the window |

### 5.3 Reliability dimension

```text
reliability = 0.6 × successRate + 0.25 × (1 − timeoutRate) + 0.15 × recoveryStability
confidence(reliability) = health.confidence
```

Breaker relationship (mandatory, ADR-003):

```text
CIRCUIT OPEN      ⇒ HARD EXCLUDE (gate D4) — health score is irrelevant
CIRCUIT HALF_OPEN ⇒ SPECIAL PROBE RULE: candidate eligible ONLY as the single next attempt
                    (probe), never as a ranked winner among healthy peers; consumes the
                    V2.1 half-open semantics verbatim
CIRCUIT CLOSED    ⇒ HEALTH SCORE MAY AFFECT RANKING ONLY
```

The health score never overrides the breaker. It only differentiates among CLOSED candidates.

### 5.4 Windowing / decay

- Primary: **recent-N (N=20) sliding window per segment** — interpretable, bounded, easy to reconstruct.
- Secondary: EWMA with half-life 10 events, kept as a trend indicator only (display + confidence), not the ranking input. Rationale: recent-N is auditable by a human counting lines; EWMA alone is not (ADR-004).

## 6. Cost & Latency Models

### 6.1 Cost

```text
CostEstimate {
    schema        enum { TOKEN_IN_OUT, PER_REQUEST, CREDITS, FREE_TIER, QUOTA, UNKNOWN }
    nominal       { inputPerMTok?, outputPerMTok?, perRequest?, currency? }
    effective     0..1 normalized fit (computed)
    confidence    0..1
    provenance    REGISTRY | POLICY | USAGE_OBSERVED
}
```

- Normalization: `costFit = 1 − clamp(cost_c / cost_ref, 0, 1)` where `cost_c` is the candidate's normalized cost for the *expected task shape* (input tokens + expected output tokens at the class default) and `cost_ref` is the max cost across the current eligible set (relative normalization keeps determinism without global price tables).
- **UNKNOWN pricing: never fabricated.** `costFit = 0.5`, confidence 0, provenance UNKNOWN. An UNKNOWN-cost candidate can still win if cost weight is low, but the explanation will show `cost=UNKNOWN (confidence 0)`.
- Nominal ≠ effective: effective cost includes observed output-token overhead (verbose models cost more for the same task) when usage observation exists; otherwise effective = nominal shape estimate.
- Free-tier/quota candidates: treated with `schema: QUOTA`; a session-level budget in force may exclude them when exhausted (hard gate D5).

### 6.2 Latency

```text
LatencyStats { p50, p75, p95 (ms), timeoutRate (0..1), sampleSize, lastUpdated }
```

- Ranking uses **p50** (median user experience); **latency budget gates use p95** (tail protection).
- Comparability rule: latency observations are recorded per (provider, model, variant, taskClass, outputSizeBucket); ranking compares within the same output-size bucket where available, else falls back to global model stats with confidence penalty. This prevents comparing a 50-token reply against a 5k-token generation.
- Cold start: no samples → neutral 0.5 + confidence 0.
- `timeoutRate` feeds reliability (§5.3), not latencyFit, to avoid double-counting.

## 7. Quality Model

Two coexisting components (never merged into one opaque number):

```text
qualityIntrinsic    0..1   STATIC REGISTRY tier + LIVE/INTEGRATION capability evidence
                           (what the model is capable of, per evidence hierarchy)
qualityObserved     0..1   evaluation-derived task success/quality aggregates
                           (how it actually performs on THIS workspace's task mix)
                           sample-gated: < 5 evaluations → not used
quality = confidence-weighted blend (EVIDENCE_CONTRACT §Quality — canonical):
    both sides present & gates pass:  w_o = clamp(conf_o / (conf_i + conf_o), 0.25, 0.75), w_i = 1 − w_o
    only intrinsic available:         quality = intrinsic, confidence capped × 0.5
    neither available:                quality = UNKNOWN → dimension inert (renormalization §10.3)
    w_i = w_o = 0.5 (50/50) is PROVISIONAL, valid only while measured confidences are comparable;
    it is NOT validated by current evidence (EVIDENCE_AUDIT §4: quality = INSUFFICIENT)
confidence(quality) = min(evidence confidences)
```

Observed quality signals (defined fully in EVALUATION_DESIGN §2): task success, evaluation score, tests passed, review acceptance, tool-call correctness, regression rate, continuation frequency (negative), retry frequency (negative). **Continuation/retry frequency penalizes observed quality, not breaker health** — a model that often needs re-dispatch is lower quality, not necessarily broken.

## 8. Context Fit

```text
contextFit = clamp(usableWindow / contextDemand, 0, 1) × truncationPenalty
    usableWindow  = registry contextWindow (evidence-level numeric) minus reserved output allowance
    contextDemand = TaskRequirement.contextDemand (tokens)
    truncationPenalty = 0.9^k   (k = observed truncation events for this candidate in segment,
                                 capped at k=3; recovered to 1.0 after 10 clean events)
```

- Context window size is **not** a quality proxy: it enters only here and in D3 (hard exclusion when demand > window).
- Missing window data → UNKNOWN → 0.5 + confidence 0.

## 9. Confidence Model

```text
candidateConfidence = min over contributed dimensions of dimensionConfidence
```

- Score and confidence are **separate outputs** (ADR-007): score = "how good", confidence = "how trustworthy the evidence is".
- Use in V2.2: (a) **gate** — quality floors and health floors are only enforced when the underlying evidence confidence ≥ 0.6 (a floor cannot exclude on garbage data); (b) **explanation** — displayed per candidate; (c) **NOT a score multiplier** in MVP (mixing them makes score irreproducible across evidence-availability states and breaks the "same state → same route" contract in confusing ways). Alternative (confidence-weighted score) is documented in ADR-007 as a future option behind a flag.

## 10. Scoring Engine

### 10.1 Dimensions (Table B — Candidate Score Model)

| Dimension | Definition | Range | Weight strategy | Task-dependent | Risk-dependent | Evidence source |
|---|---|---|---|---|---|---|
| quality | blended intrinsic ⊕ observed (§7) | 0..1 | class profile | yes | yes (weight ↑ + floor) | registry + EvaluationStore |
| capabilityFit | §4.3 | 0..1 | class profile | yes | mild | capability registry |
| reliability | §5.3 | 0..1 | class profile | yes | yes (weight ↑ + floor) | breaker + health store |
| latencyFit | 1 − normCost(p50 within bucket) | 0..1 | class profile | yes | mild | latency stats |
| costFit | §6.1 | 0..1 | class profile | yes | mild | cost registry/policy |
| contextFit | §8 | 0..1 | class profile | yes (heavy for research/debug) | no | registry + truncation history |
| recentSuccess | segment successRate (recent-20) | 0..1 | fixed low weight | no | no | EvaluationStore |

All dimensions normalized to [0,1] before weighting. All weights positive, sum fixed at 1 per profile (renormalized when a dimension is UNKNOWN — §10.3).

### 10.2 Score function

```text
Score(candidate, task, state)
  = W_quality(taskClass, risk)      × quality
  + W_capability(taskClass, risk)   × capabilityFit
  + W_reliability(taskClass, risk)  × reliability
  + W_latency(taskClass)            × latencyFit
  + W_cost(taskClass)               × costFit
  + W_context(taskClass)            × contextFit
  + W_recent × recentSuccess
```

- **Gates, not zero-weights:** quality floors / health floors / budgets are hard gates at D4/D5. A floor violation excludes; within eligible set, the floor influences only via its dimension weight. This keeps "eligible but suboptimal" meaningful (ARCHITECTURE §6.4).
- **Risk modification:** risk level selects a column of the weight profile table (DECISION_MATRIX §2): HIGH/CRITICAL raise W_quality and W_reliability (e.g., quality 0.30→0.45), lower W_cost/W_latency, and activate floors. LOW does the opposite. Risk NEVER touches gates D2/D3 (permission/capability hard constraints are risk-invariant).
- **Health modification:** enters only via reliability (§5.3). No separate health term — prevents double-counting with breaker state.
- **Multiplicative exception:** none in MVP. A multiplicative penalty term was considered and rejected for explainability (ADR-001).

### 10.3 Missing data behavior & cold start (D-COLD resolution — normative)

Per dimension with UNKNOWN/prior value: set value = 0.5, confidence = 0, **renormalize the remaining weights** (`W_i' = W_i / Σ_{known} W_j`). Determinism preserved (missing-set is part of state).

Cold-start tier ordering (ADR-014) is applied **before** score ranking:

```text
EXCLUDED (hard gate)  <  UNPROVEN (all evidence UNKNOWN)  <  KNOWN-EVIDENCED (≥1 dim conf > 0)
```

Rules:
- Mixed set: KNOWN-EVIDENCED candidates ranked by score; UNPROVEN candidates follow them, ordered by the V2.1 seed (ladder) order.
- **All-UNPROVEN eligible set → return the V2.1 ladder-head candidate.** Never an ASCII winner.
- ASCII candidateId (T6) is the FINAL tie-break only, and only among candidates already tied at the same tier with genuinely equal, evidenced scores.
- An UNPROVEN candidate is never penalized below EXCLUDED, and never promoted above KNOWN-EVIDENCED by a neutral score. No exploration in AUTO mode (ADR-014); new models accrue evidence via explicit user selection, OPT-IN routing, and capability probes.

### 10.4 Worked scoring sketch (ILLUSTRATIVE numbers)

Weights shown are ILLUSTRATIVE; the normative deep-research profile lives in DECISION_MATRIX §1 (`.40,.20,.15,.02,.03,.15,.05`). **SUPERSEDED:** an earlier revision of this section carried profile `.40,.20,.20,.05,.05,.08,.02` — conflicting canonical weights are retired (C2 resolution; see DESIGN_REVISION_REPORT §C2).

```text
Task: deep-research, risk HIGH. Profile (DECISION_MATRIX): quality .40, capability .20,
      reliability .15, latency .02, cost .03, context .15, recent .05.
Candidate A: quality .82 (conf .9), capFit .90 (.8), rel .95 (.7), lat .60 (.5),
             cost .30 (.9), ctx .95 (.7), recent .90 (.8)
  Score = .40×.82 + .20×.90 + .15×.95 + .02×.60 + .03×.30 + .15×.95 + .05×.90
        = .328 + .180 + .1425 + .012 + .009 + .1425 + .045 = .859
Candidate B: quality .74 (.6), capFit .80 (.6), rel .70 (.3), lat .85 (.7),
             cost .85 (.9), ctx .60 (.5), recent .70 (.3)
  Score = .296+.160+.105+.017+.0255+.090+.035 = .7285
A wins (full precision .859 vs .7285; display 3dp round-half-up: .859 vs .729).
CORRECTED CALCULATION (C3): the pre-revision sketch printed A = .832 using the superseded
profile and an arithmetic slip (exact sum of that line was .837); the recomputed example above
replaces it. Winner unchanged (A).
```

## 11. Deterministic Tie-Breaking (canonical, ADR-005)

Applied in order; first non-tie wins:

```text
T1  higher Score
T2  higher capabilityFit
T3  higher reliability
T4  lower latency p50 (same output-size bucket)
T5  higher costFit (i.e., lower cost)
T6  candidateId ascending (ASCII lexicographic on "<provider>/<model>#<variant>")
```

T6 is the absolute final tie-breaker and always terminates — **but only after the §10.3 cold-start tier ordering**: an all-UNPROVEN set is resolved by the V2.1 ladder head before any score comparison, and T6 never decides between KNOWN-EVIDENCED and UNPROVEN candidates. No randomness, no hash-order dependence, no iteration-order dependence (candidates sorted by candidateId before ranking as a defensive normalization).

## 12. Fallback (Re-scoring, not shuffling)

```text
execution failure
  → classify failure (EVALUATION_DESIGN taxonomy)
  → update health / evaluation evidence (attribution-aware)
  → mark failed candidate ineligible for THIS continuation chain
  → re-run D2–D5 gates on remaining candidates
  → re-score eligible set with updated evidence
  → select next deterministic optimum
  → bounded by MAX_REROUTES = 3 (V2.1); exhausted → BLOCKED (V2.1 semantics)
```

The failed candidate is excluded for the *chain*, not permanently (its evidence is updated; future independent decisions re-evaluate it). If scoring is unavailable mid-chain, the V2.1 ladder walk takes over for the remainder of the chain.

## 13. Escalation Framework (evidence-driven, ADR-006)

Distinct actions, in increasing severity:

```text
RETRY_SAME          same model+variant, same prompt        — only for ENVIRONMENT/timeout-class failures, max 1
VARIANT_UP          same model, higher reasoning variant   — reasoning/quality insufficiency, model has ceiling headroom
MODEL_STRONGER      different model, same provider         — capability-axis failure with in-provider headroom
PROVIDER_SWITCH     different provider                     — provider-level failure or exhausted ladder
AGENT_ESCALATION    reclassify to stronger agent           — only V2.1 evaluator may trigger (unchanged authority)
HARD_BLOCK          stop with BLOCKED                      — all eligible candidates exhausted / policy violation
```

Decision rule (evaluated in order):

| Evidence (failure class) | Primary action | Rationale |
|---|---|---|
| provider outage (≥2 models of provider failed transport-level) | PROVIDER_SWITCH | provider-attributed; same-provider retry futile |
| timeout (single) | RETRY_SAME → fallback re-score | transient |
| timeout (repeated, same model) | PROVIDER_SWITCH + health penalty | systematic |
| reasoning insufficiency | VARIANT_UP → MODEL_STRONGER (capability axis: reasoning) | capability-targeted |
| context overflow | re-gate with inverted context filter (candidates with usableWindow ≥ demand × 1.2) | capacity-targeted |
| coding failure / test failure | MODEL_STRONGER (coding axis) | capability-targeted |
| security-review insufficiency | MODEL_STRONGER restricted to top security-tier candidates | risk-invariant floor applies |
| tool failure (model-attributed) | MODEL_STRONGER (agenticToolUse axis) | capability-targeted |
| tool failure (environment-attributed) | RETRY_SAME (once) | not the model's fault |
| permission denial | HARD_BLOCK for the chain | policy is not a routing hint |

Escalation remains *continuation / re-dispatch* with V2.1 packet semantics; the table only governs which candidate is chosen next. All actions bounded by MAX_REROUTES=3.

## 14. Adaptation Model (ADR-004)

- **Segmentation:** `(taskClass, model, variant)` primary (D-VAR, §4.5); fallback chain `(taskClass, model, variant)` → `(taskClass, model)` → `(taskClass, provider/model family)` → `(model, global)` → prior 0.5. A segment inherits the parent when its sampleSize < 5 (EVALUATION_DESIGN §7); inherited data is confidence-capped (§4.5).
- **Window:** recent-N (20) per segment; EWMA (half-life 10) as trend/confidence indicator only.
- **Reaction speed:** evidence affects the *next* decision, never the current chain (except failed-candidate exclusion, §12). This bounds oscillation: a single bad event changes at most one dimension of one segment by ≤ 1/20.
- **Rejected alternatives:** pure EWMA (not human-auditable), task-class-specific memory without model dimension (loses attribution), global-only memory (too coarse), per-prompt adaptation (non-deterministic in effect, unbounded).

## 15. Signal Catalog (Table A)

| Signal | Source | Unit | Freshness | Confidence | Normalization | Hard/Soft | Missing behavior | Security sensitivity |
|---|---|---|---|---|---|---|---|---|
| breakerState | V2.1 state file | enum | live | 1.0 | n/a | **hard** | UNKNOWN→CLOSED+conf 0 | high (safety) |
| successRate | health store | 0..1 | window | n/20 | 0..1 direct | soft (+floor) | prior 0.5, conf 0 | medium |
| errorRate | health store | 0..1 | window | n/20 | 1−x | soft | prior 0.5, conf 0 | medium |
| p50/p95 latency | health store | ms | window | n/bucket | fit scale | soft (+budget hard) | neutral 0.5, conf 0 | low |
| timeoutRate | health store | 0..1 | window | n/20 | direct | soft | neutral, conf 0 | medium |
| capabilityValue | capability registry | per-dim | on verify | evidence level | per §4.3 | hard-if-mandatory | UNKNOWN policy §4.4 | high (vision!) |
| contextWindow | capability registry | tokens | on verify | evidence level | fit ratio | hard-if-demand> | UNKNOWN→excl. if demand known | low |
| costNominal | cost registry/policy | currency/schema | policy change | source | fit scale | soft (+budget hard) | UNKNOWN, conf 0 | low |
| evaluationScore | evaluation store | 0..1 | per event | n/5 gate | direct | soft (+floor high-risk) | not used until gate | medium |
| failureClass | evaluator | enum | per event | evaluator conf | taxonomy | attribution gate | UNKNOWN→no health impact | medium |
| truncationEvents | evaluation store | count | window | n/10 | penalty §8 | soft | 0 penalty | low |
| providerAvailability | host/registry probe | enum | session | 1.0 | n/a | **hard** | assume available | medium |

Security sensitivity = how much a manipulated value could distort safety-relevant behavior (drives adversarial safeguards in SECURITY_BOUNDARY §6).

## 16. Route Stability / Hysteresis (ADR-015)

Route churn between evidenced peers is a real replay finding (SIMULATION_RESULTS §4: evidenced-peer margin ≈ 0.0058).

```text
H (minimum score delta for route replacement) = CALIBRATION PARAMETER — PROVISIONAL 0.02
Evidence status: current replay data only establishes H > ≈ 0.006 (observed margin 0.0058).
0.02 is NOT empirically validated; final value is set from replay-2 margin distribution.
```

Mechanism:

```text
Trigger:    candidate W' replaces current W for a segment only when score(W') − score(W) > H
Scope:      session stickiness keyed by (taskClass, risk) + a route-change cooldown per segment
Reset:      W' replaces W when it wins 3 consecutive evaluations by > H,
            OR leads by > 2H continuously for 24h
Override:   breaker OPEN on W bypasses stickiness immediately (safety > stability)
Instability: 2 consecutive EnvironmentOutcome events on the sticky route → stickiness dropped
```

Guarantees: no infinite stickiness (reset + instability rules); determinism (stickiness state is part of the decision state, so same state → same route); V2.1 fallback unaffected (stickiness exists only inside the V2.2 scorer). Calibration procedure: during replay-2, record the distribution of score margins between the top-2 evidenced candidates per segment; set H ≥ p75 of that distribution (procedure defined in EVIDENCE_CONTRACT §Calibration; final number requires human approval).
