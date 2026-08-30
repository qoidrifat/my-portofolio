# SMART ROUTER V2.2 — SHADOW CORPUS COLLECTION PROTOCOL v1.0

Status: **PROTOCOL — COLLECTION NOT STARTED** · Epoch: **NONE**
Governs: shadow corpus collection for baseline `v2.2.0-shadow.1`
Companions (canonical): `SMART_ROUTER_V2_2_EVIDENCE_CONTRACT.md` (field semantics), `SMART_ROUTER_V2_2_EVALUATION_DESIGN.md` (outcome model, taxonomy), `SMART_ROUTER_V2_2_REPLAY_CONTRACT.md` (replay), `SMART_ROUTER_V2_2_OBSERVABILITY_DESIGN.md` (T1–T5), `SMART_ROUTER_V2_2_SECURITY_BOUNDARY.md` (safety), `SMART_ROUTER_V2_2_SHADOW_BASELINE.md` (frozen state), `SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md` (capture), `SMART_ROUTER_V2_2_IMPLEMENTATION_GATE.md` (gates).

This protocol changes NO implementation, NO scoring, NO policy, NO schema. It defines how shadow evidence is collected, judged, protected, and counted — nothing more.

---

## 3.1 Frozen baseline binding

| Field | Value |
|---|---|
| baselineVersion | `v2.2.0-shadow.1` |
| baselineCommit | `2c2bacecf9805cdd32df28ccecf59c0f41d74748` |
| parentV2.1Commit | `fca4f595d4c1344c901f544093efcee93584d5b9` (tag `v2.1.0`) |
| sourceManifest | `.opencode/ai/verification/v22-shadow-baseline/source-manifest.json` (42 entries: 17 sources + 7 tests + 6 wiring + 12 contracts) |
| protocolVersion | `1.0` |
| schemaVersion | `1` (telemetry envelope, ReplayRecord, host shadow record — frozen by baseline) |

The corpus epoch binds: baseline commit, schemaVersion, protocolVersion, collection configuration (`.opencode/ai/verification/v22-shadow-corpus/corpus-config.json`), and start time. These MUST NOT mutate after the epoch starts (§3.24).

## 3.2 Observation unit

**One OpenCode task execution** = one attributed attempt with its evaluation and outcome. Corpus record fields:

```text
sessionId, routeId, executionId, evaluationId
providerId, modelId, variant          (candidate identity — joint, I-018)
taskClass (21-class), optimizationClass (8-class), riskClass (LOW/MEDIUM/HIGH/CRITICAL), agent
actualV2_1        candidate V2.1 dispatched (ground truth)
shadowV2_2        V2.2 hypothetical candidate + score + confidence + tier
evidence          capability / quality / latency / cost / health snapshot refs
outcome           ExecutionOutcome + QualityOutcome + EnvironmentOutcome (§3.11)
```

Missing data rule: field absent → `null` + explicit machine-readable reason (`UNKNOWN:<cause>`). Never fabricate, never default to 0/free/neutral-with-confidence (EVIDENCE_CONTRACT §3 no-silent-degradation).

## 3.3 Evidence statuses

Per record (corpus-level classification, distinct from per-field VERIFIED/PARTIAL/UNKNOWN in EVIDENCE_CONTRACT §3):

```text
COMPLETE   attribution chain intact (I-016) AND candidate identity joint-valid AND at least
           ExecutionOutcome present. Enters outcome/quality aggregates.
PARTIAL    attribution intact but one or more signal families missing (latency/cost/quality),
           each explicitly UNKNOWN+reason. Enters aggregates for the families present only.
UNKNOWN    attribution incomplete OR identity unresolvable. Stored audit-only; NEVER enters
           model-quality, reliability, recent-success, or health aggregates (I-016, zero effect).
INVALID    fails schema/bounds/dedup/consistency rules (§3.x data quality). Kept, classified,
           never silently deleted; never enters any aggregate.
```

## 3.4 Sampling universe (actual repository vocabulary)

21 source task classes (types.ts `SOURCE_TASK_CLASSES`):

```text
crud-simple, standard-coding, complex-implementation, latency-sensitive,
ui-implementation, react-next-architecture, routine-review, deep-review,
security-review, complex-debugging, repo-research, deep-research,
architecture-analysis, documentation, testing, database, performance,
deployment, tooling, orchestration, vision-task
```

Vision-task: policy BLOCKS (`VISION_TASK_BLOCKED`, requirement.ts); expected corpus presence = 0 records with dispatch (blocked records may appear as audit evidence — they count toward safety metrics, not routing evidence).

## 3.5 Optimization class mapping

8 canonical optimization classes (types.ts `OPTIMIZATION_CLASSES`):

```text
routine-coding, frontend, complex-debugging, security-review,
routine-review, deep-review, deep-research, repo-research
```

The 21→8 mapping is **normative and already approved** — canonical source: `policy-data.ts` `CLASS_MAPPING` + `SMART_ROUTER_V2_2_DECISION_MATRIX.md` §1.1 (C4). This protocol does NOT redefine it. The mapping-table version used is bound by the baseline manifest.

## 3.6 Risk strata

```text
LOW, MEDIUM, HIGH, CRITICAL
```

Subject to actual runtime applicability per the policy (`routing-policy.json` `risk` per class; e.g. security-review=CRITICAL, deep-review/complex-debugging/deployment/database/react-next-architecture/architecture-analysis=HIGH, no CRITICAL routine class exists). Do NOT fabricate task/risk combinations that cannot occur at runtime; record observed (taskClass, riskClass) pairs as they actually co-occur.

## 3.7 Stratification

**Primary: optimizationClass × riskClass** (8 × applicable risks; actual pairs only).
**Secondary (analysis views, never primary quotas):** agent × taskClass; provider × model × variant.

Minimum-cell guard: a cell with n < 5 (`VARIANT_MIN_N`) is reported as INSUFFICIENT — never presented as statistically meaningful; store-level rules (n≥5 variant, n≥20 model, shrinkage K=10, EVIDENCE_CONTRACT §5) apply unchanged. Avoid over-stratification: no tertiary segmentation beyond the two secondary views.

## 3.8 Organic vs synthetic

Every corpus record carries `source: ORGANIC | SYNTHETIC`.

```text
ORGANIC     real user/project traffic through the normal V2.1 path
SYNTHETIC   controlled probe (e.g., classifier-mapped prompts like the baseline smoke set),
            used ONLY for invariant validation and coverage gaps that organic traffic cannot fill
```

Rules: analysis separates them (`source` is a mandatory analysis dimension; no silent merge). Synthetic records never contribute to organic outcome aggregates. Do NOT manufacture artificial user tasks merely to fill a quota.

## 3.9 Attribution

Canonical chain (EVIDENCE_CONTRACT §4 / I-016, all links required for statistics):

```text
sessionId → routeId → executionId → candidate(providerId, modelId, variant) → taskClass → evaluationId
```

- Candidate identity preserves provider+model+variant jointly (I-018); variant-missing = incomplete (D-VAR).
- Incomplete attribution → audit-only, zero model-quality/health/ranking effect (I-016, testable; enforced by `attributionComplete` flag in `EvaluationSignal`).

## 3.10 Deduplication

Duplicate identity: `(eventId)` unique per store append; `(executionId, evaluationId)` unique per corpus record. Collection tooling MUST dedupe on executionId first, evaluationId second, eventId third.

Duplicates MUST NOT inflate quality, reliability, recentSuccess, or health. On duplicate detection: keep first occurrence, classify the rest `INVALID` with reason `DUPLICATE:<key>` (§3.3) — retained for audit, zero aggregate effect.

## 3.11 Outcome contract

Three record types, never collapsed (EVALUATION_DESIGN §3.1, I-013):

```text
ExecutionOutcome     COMPLETED | FAILED | ERROR | CANCELLED + errorClass
QualityOutcome       grade 0..1 + confidence + evaluatorId + failureClass (null on success)
EnvironmentOutcome   { timeout, network, quota, tooling, userCancel } flags
```

Explicit separations (canonical):

```text
timeout ≠ automatic quality failure
environment failure ≠ model failure
user cancellation ≠ automatic model penalty
```

## 3.12 Failure taxonomy

Fixed enum (EVALUATION_DESIGN §2, F01–F14) with attribution:

```text
MODEL_RELEVANT   F04, F05, F06(authoring), F08, F09, F10, F03(model), F07(model)
ENVIRONMENT      F12, F01(provider), F03(env), F06(flaky), F02-transport
USER             F13
UNKNOWN          F14, unclassifiable
```

Only `MODEL_RELEVANT` penalizes quality/reliability/recent (M6). Provider outage MUST NOT become a model-quality failure (F01 → health only). Re-interpretation is a new append, never an edit.

## 3.13 Latency

```text
t0 request start · t1 provider dispatch · t2 first response/token · t3 completion
TTFR = t2−t0 · completion = t3−t0 · decision-path overhead = control-plane time (V2.1 router + V2.2 shadow compute), tracked separately
```

The V2.1 harness `duration_ms` is EXCLUDED permanently from inference latency (ADR-017). Harness duration is never labeled as inference latency. Missing any timestamp → latency UNKNOWN for that record (per-field). Ranking stats p50 primary / p95 budget (EVIDENCE_CONTRACT §5).

## 3.14 Cost

Per record (T4): provider, model, variant, usage (input/output tokens), pricingSource, effectiveCost, unit (currency/credit), timestamp, confidence. Status ladder VERIFIED (pricing+usage) / PARTIAL (one) / UNKNOWN (neither).

UNKNOWN cost remains UNKNOWN — never 0, never FREE, never CHEAP (ADR-018: costFit neutral 0.5, confidence 0 → inert via renormalization).

## 3.15 Quality

```text
intrinsic     registry tier / documented capability — never observed outcome
observed      attributed T1 evaluations (grade + evaluator confidence ≥ 0.6, n ≥ 5 per segment)
environment   EnvironmentOutcome — never blended into quality
```

Observed quality requires: complete attribution (§3.9) + candidate identity joint-valid + task context (taskClass) + evaluator confidence ≥ 0.6 + failure classification present. Otherwise quality = UNKNOWN → dimension inert (EVIDENCE_CONTRACT §5).

## 3.16 Shadow decision contract

Per record, store BOTH:

```text
actual V2.1        candidate + variant actually dispatched (ground truth)
shadow V2.2        hypothetical candidate + variant + score + confidence + tier
                   + excluded candidates (gate exclusions) + decision reason
                   (ok | degraded H2 REQUIRED_FLOOR | blocked) + degradedToV21 flag
```

V2.2 shadow does NOT dispatch. `shadowZeroInfluence` invariant holds in every recorded mode; V2.1 remains the sole dispatch authority (SECURITY_BOUNDARY; baseline integrity-results.json).

## 3.17 Divergence taxonomy

Canonical drivers (replay.ts `REPLAY_DRIVERS` — the actual enum):

```text
no-divergence                  V2.2 selects the V2.1 candidate
variant-ascii-tiebreak         equal score resolved by ASCII variant order (T1 tie-break)
proxy-noise-swap               near-tie flipped by noisy proxy evidence
evidence-availability-bias     one candidate has evidence, the other does not (availability, not merit)
cold-start-artifact            D-COLD ladder-head anchoring produces the pick
gate-difference                D1–D5 gate outcome differs (exclusion on either side)
other                          documented reason string required
```

Every divergence MUST be categorized with exactly one driver. Mapping guidance: score-delta-driven flips with |margin| within noise floor → proxy-noise-swap; flips where the winner simply had no rival evidence → evidence-availability-bias; flips only explainable by all-UNPROVEN ordering → cold-start-artifact. Divergence records live in `shadow-deltas.jsonl` (host.ts) and are the analysis surface for "why V2.2 differed".

## 3.18 Counterfactual rule

For every divergence:

```text
ALLOWED     "V2.2 would have selected candidate B" (computational fact, replayable)
FORBIDDEN   "candidate B would have succeeded" — unless candidate B was actually
            dispatched under V2.1 chain fallback and independently observed
```

Outcome knowledge status per record: `OBSERVED` (actually executed) | `ESTIMATED` (derived, with method documented) | `UNKNOWN`. Estimates MUST carry their estimation method; fabrication of counterfactual success is a FATAL stop condition (§3.27).

## 3.19 Capability

Ladder (ADR-002): `UNKNOWN → DOCUMENTED → STATIC → INTEGRATED → VERIFIED`.

- Promotion requires evidence AT the target level (live runtime proof for VERIFIED); documentation alone never claims runtime capability.
- VERIFIED expires after 30 days without re-verification → demote one level.
- Vision: BLOCKED (I-005) until runtime-verified multimodal proof exists; no ladder path bypasses. Expected vision dispatch count in corpus: 0.

## 3.20 Health

```text
breaker = hard authority; health score = ranking signal only
OPEN      → candidate excluded (hard)
HALF_OPEN → probe only
CLOSED    → eligible for health-score ranking
```

Health score requires sampleSize ≥ 5, freshness 24 h (×0.5 decay), UNKNOWN at 72 h (I-019). Provider, model, provider+model health stay separate records — never collapsed (EVIDENCE_CONTRACT §5).

## 3.21 Statistical sufficiency

**Structural minimum (this protocol defines):**

```text
every optimization class represented
every applicable risk level represented
valid provider/model/variant attribution on valid records
UNKNOWN rate < 20% of records
```

**HUMAN APPROVAL REQUIRED** for all numeric statistical thresholds (power, CI width, per-cell n targets). Structural coverage alone NEVER declares statistical sufficiency or significance. Ratified decision 2026-08-30: numeric sufficiency requires separate human review after pilot data + drift review.

## 3.22 Corpus health dashboard

Tracked per epoch and rolling:

```text
records collected · valid · partial · unknown · invalid
attribution completeness % · evaluation completeness %
latency coverage % · cost coverage %
capability coverage (VERIFIED per dim)
task-class coverage (21) · risk coverage · provider/model/variant coverage
shadow divergence rate + driver distribution
UNKNOWN rate (headline; unknowns are reported, never hidden)
```

Dashboard artifacts are corpus artifacts → 30-day retention (§3.26).

## 3.23 Drift monitoring

Monitor distribution drift across epochs/windows for: taskClass, riskClass, agent, provider, model, variant. A corpus becoming heavily biased toward one class is FLAGGED (non-fatal warning). Drift report compares windowed distributions to epoch-start snapshot; material shift → flagged before any sufficiency claim (a biased corpus cannot justify promotion).

## 3.24 Baseline mutation during collection

Before/during an epoch, verify: commit unchanged, source-manifest hashes match, schemaVersion unchanged, scoring configuration unchanged, flags unchanged. If ANY changes:

```text
PAUSE COLLECTION → identify/new-baseline → version protocol/epoch → NEVER mix corpus versions
```

Baseline mutation during an active epoch is a fatal stop condition. Implementation baseline tag is never retagged; new state = new baseline tag + new epoch.

## 3.25 Privacy

Never persist: API keys, tokens, credentials, authorization headers, .env contents, private keys, user secrets, prompt/part content, file contents. Telemetry is IDs, enums, timings, token counts only (EVIDENCE_CONTRACT §6). Evaluator free-text (`insufficiencyReason`) is display-only, never persisted. Logger fail-open + secret-redacting (V2.1 `appendJsonl`) applies. Prefer metadata over raw prompts wherever sufficient.

## 3.26 Retention

**All corpus artifacts: 30 days** — raw evidence, aggregates, metrics, dashboard artifacts. Aligns with the existing 30-day telemetry design (RETENTION_DAYS 30). No long-term corpus retention introduced by this protocol. Ratified decision 2026-08-30.

## 3.27 Stop conditions

**Fatal (STOP COLLECTION immediately):**

```text
security violation · permission regression · breaker violation
schema corruption · attribution corruption · baseline drift
counterfactual fabrication · production influence from V2.2
```

**Non-fatal warnings (continue, flag, review):**

```text
UNKNOWN rate spike (approaching 20%) · latency coverage decline · cost coverage decline
task/traffic imbalance (drift flags) · evaluation completeness decline
```

Safety expectations during collection: 0 security violations, 0 permission regressions, 0 breaker violations, 0 vision dispatches, 0 fabricated counterfactuals, 0 production influence. Any zero-expectation violation is fatal.

## 3.28 Promotion gate

The corpus ultimately feeds gates G3 (Attribution), G4 (Outcome), G5 (Latency), G6 (Cost), G7 (Capability). A gate passes ONLY with: mechanism (exists and verified) + sufficient evidence (per §3.21, human-approved thresholds) + stable analysis (drift-checked) + human approval. `mechanism exists ≠ gate PASS`. Promotion beyond SHADOW remains NOT AUTHORIZED by this protocol (see SMART_ROUTER_V2_2_SHADOW_BASELINE.md rules).

---

## Collection modes (kept separate)

```text
REAL TRAFFIC SHADOW        organic records via host sidecar (SHADOW mode, zero influence)
CONTROLLED SYNTHETIC PROBE tagged SYNTHETIC; classifier-mapped prompts; invariant/coverage use
REPLAY                     offline re-decision against frozen baseline + frozen evidence stores
```

No mode merges records into another's aggregates. REPLAY determinism: identical (evidence, policy, baseline) → identical V2.2 candidate, score, confidence (deterministic inputs; signalId excluded from decision inputs — EVALUATION_DESIGN §1). Replay must reproduce the original shadow decision for identical state.

## Data quality rules (rejection → INVALID + reason, never silent delete)

```text
invalid JSON · impossible timestamps · negative latency · negative cost
unknown candidate identity · conflicting provider/model · duplicate execution
duplicate evaluation · broken references · bounds violation
```

All classified INVALID with machine-readable reason; retained for audit; zero aggregate effect.

---

## Machine configuration

`.opencode/ai/verification/v22-shadow-corpus/corpus-config.json` — config only (no records, no epoch, no run state). The epoch identifier format: `v2.2.0-shadow.1-<UTC yyyymmddThhmmssZ>` bound at start time to baseline commit + schemaVersion 1 + protocolVersion 1.0 + corpus-config content hash.

## Governance rule

Once the first epoch starts: baseline + protocol + schema + sampling configuration are FROZEN. Any substantive change → PAUSE → new version → new baseline/protocol as appropriate → new epoch. Never silently mix incompatible experimental conditions.

## Fundamental experiment principle

```text
IMPLEMENTATION ≠ SHADOW EVIDENCE ≠ STATISTICAL SUFFICIENCY ≠ PROMOTION
```

A V2.2 shadow decision is not a V2.2 observed outcome; neither is "V2.2 proven superior". Every claim carries its evidence level.
