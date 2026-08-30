# SMART ROUTER V2.2 — ARCHITECTURE DECISION RECORDS

Status: all ADRs **PROPOSED** (design-approved; implementation not authorized)
Baseline: Smart Router v2.1.0 (immutable) · OpenCode 1.18.25

---

## ADR-001 — Scoring architecture: hard gates + weighted linear score

**Context.** V2.1 orders candidates via a static ladder. V2.2 needs a scoring architecture that is deterministic, explainable, cheap, and safe.

**Decision.** Hard eligibility gates (binary, pre-scoring) followed by a weighted linear score over 7 normalized dimensions, with task-class weight profiles and risk multipliers. Floors are gates, not weights. Missing dimensions take neutral prior + weight renormalization.

**Alternatives considered.**
- *Weighted geometric score* — punishes any weak dimension; good for "no fatal weakness" semantics; rejected: score collapses are hard to explain ("quality .95, cost .10 → total .31"), and floor behavior is already handled by gates, making the geometric penalty redundant.
- *Pareto frontier filtering then scoring* — theoretically clean; rejected for runtime: frontier computation on 13 candidates is cheap but explanation ("why was X on/off the frontier") is unintuitive for humans; kept as an offline analysis tool only.
- *Lexicographic ranking* (quality first, then next dim...) — extremely explainable but brittle: without calibrated scales, the first dimension dominates; effectively reintroduces a ladder.
- *Learned model (ML ranker)* — rejected outright: non-deterministic retraining, unexplainable, violates the central principle.

**Trade-offs.** Linear scoring can let a dominant weight mask a weak-but-eligible dimension — mitigated by floors-as-gates for dimensions that matter per task class. Renormalization on missing data changes effective weights — documented, deterministic, and confidence-visible.

**Consequences.** Every score is reproducible by hand from the logged breakdown. Adding a dimension = adding a weight profile column + evidence source. Pareto analysis remains available offline (EVALUATION_DESIGN §10).

**Status.** PROPOSED.

## ADR-002 — Capability model: 13-dimension evidence-backed taxonomy

**Context.** "General intelligence" as one scalar cannot express "strong coding, weak long-context". Capability claims must not be invented from model names.

**Decision.** 13 capability dimensions (reasoning, coding, debugging, architecture, research, review, agenticToolUse, contextWindow, structuredOutput, vision, fileHandling, multimodality, speed), each with per-(model,dim) evidence records at five levels (LIVE > INTEGRATION > STATIC > DOCUMENTATION > UNKNOWN). capabilityFit = demand-weighted fit; UNKNOWN → neutral + confidence 0; mandatory dims gate.

**Alternatives.** Single quality scalar (rejected: hides task-relevant gaps); name/family-derived priors (rejected: fabrication); per-provider coarse tiers (rejected: too coarse for axis-targeted escalation).

**Trade-offs.** 13 × N evidence cells need maintenance; mitigated by evidence levels (a STATIC row is one line) and the mandatory-gate rule keeping sparse registries usable. Speed deliberately derives from latency evidence, not names.

**Consequences.** Escalation can target an axis ("stronger reasoning") instead of "bigger". Vision/multimodality stay structurally BLOCKED until a LIVE record exists.

**Status.** PROPOSED.

## ADR-003 — Health model: breaker remains binary authority; score ranks only CLOSED peers

**Context.** V2.1's breaker (per-model, threshold 3, cooldown 300s, half-open probe) is live-verified. V2.2 wants richer health (success rate, latency, timeouts) without touching that machine.

**Decision.** HealthSnapshot (windowed, segment-scoped, confidence-bearing) feeds only the reliability dimension among CLOSED candidates. OPEN ⇒ hard exclude. HALF_OPEN ⇒ probe rule (eligible only as the single next attempt). The health score cannot override the breaker — structurally, because gates run before scoring.

**Alternatives.** Replace breaker with health score (rejected: loses the proven state machine and its chaos-verified guarantees); binary-only health (rejected: this ADR exists to fix it).

**Trade-offs.** Two health representations (state + statistics) can disagree transiently (model CLOSED but degraded) — by design: state decides eligibility, statistics decide preference.

**Consequences.** Chaos suite semantics unchanged; new health tests layer on top. Cold start: prior 0.5 + confidence 0; breaker applies from observation 1.

**Status.** PROPOSED.

## ADR-004 — Evaluation feedback: attributed signals, recent-N windows, hierarchical segments

**Context.** V2.1's evaluator drives continuation only; the signal dies there. Naive feedback would let one noisy event corrupt ranking.

**Decision.** EvaluationSignal with 14-class failure taxonomy and attribution (MODEL/PROVIDER/ENVIRONMENT/EVALUATOR/USER/POLICY). Environment/user/uncertain signals never penalize models. Segmentation `(taskClass, model)` with parent fallback; recent-N (20) windows; EWMA as trend-only. n ≥ 5 before any segment affects ranking.

**Alternatives.** Pure EWMA (not human-auditable); global-only memory (no attribution); per-prompt adaptation (unbounded, non-deterministic in effect); risk/agent/language segment keys in MVP (rejected: segment explosion outpaces evidence).

**Trade-offs.** recent-20 forgets slowly-improving models slower than EWMA — accepted for auditability; trend EWMA covers direction.

**Consequences.** Every aggregate is recomputable from the append-only store by counting lines. Oscillation bounded: one event ≤ 1/20 of one segment dimension.

**Status.** PROPOSED.

## ADR-005 — Deterministic tie-breaking: fixed 6-tier chain

**Context.** Equal scores are inevitable (cold start, symmetric evidence). Non-deterministic tie-breaking would violate G-03.

**Decision.** Canonical chain: score → capabilityFit → reliability → p50 → costFit → candidateId ASCII ascending. Candidates pre-sorted by candidateId before ranking as defensive normalization.

**Alternatives.** Random tie-break (rejected: G-03/H-no-randomness); registry-order tie-break (fragile to SSOT edits); hash-based (opaque).

**Trade-offs.** The final ASCII rule is arbitrary by nature — accepted because it is total, stable, and explainable ("registry ID order").

**Consequences.** Same-state reproducibility is bit-for-bit; `decisionId` makes it verifiable in production logs.

**Status.** PROPOSED.

## ADR-006 — V2.1 fallback compatibility: re-scoring inside unchanged bounds

**Context.** V2.1 fallback walks a static ladder, bounded MAX_REROUTES=3, with continuation packets. V2.2 wants evidence-driven re-selection.

**Decision.** On failure: classify → attribute → update evidence → exclude failed candidate for the chain → re-gate → re-score → select optimum. Bounds, packets, labels, and BLOCKED semantics unchanged. Scoring unavailable mid-chain → remaining chain degenerates to ladder walk.

**Alternatives.** Shuffle-free but static ladder (status quo, rejected as the whole point of V2.2); unbounded re-scoring (rejected: violates I-011).

**Trade-offs.** Re-scoring cost per attempt (< 20 ms budget) for better next-hop choice; honest semantics preserved ("continuation / re-dispatch", never in-flight mutation).

**Consequences.** Escalation becomes axis-targeted (ROUTING_MODEL §13); V2.1 chaos suite remains the safety floor.

**Status.** PROPOSED.

## ADR-007 — Confidence handling: gate + explanation, not score multiplier

**Context.** Score ("how good") and confidence ("how trustworthy") must not conflate. Example: A score .91/conf .42 vs B .87/conf .93.

**Decision.** Confidence (1) gates floor enforcement (floors require conf ≥ .6), (2) appears in explanations, (3) does NOT multiply scores in MVP. A low-confidence high-score candidate can win ranking but cannot trigger floor-based exclusions of others on garbage evidence, and its own floors don't enforce.

**Alternatives.** Confidence-weighted score (B would win; rejected for MVP: makes score vary with evidence availability in ways that break intuitive reproducibility and the same-state contract reads oddly once evidence availability is itself state — it is, but the interaction is subtle); confidence as exploration driver (rejected: no runtime exploration).

**Trade-offs.** MVP may rank a high-score/low-confidence candidate first where a human might prefer the trustworthy one — mitigated by explanation surfacing confidence explicitly; revisit with shadow data behind a flag.

**Consequences.** Floors never enforce on UNKNOWN/low-confidence evidence (prevents garbage-driven exclusions); deterministic under all evidence-availability states.

**Status.** PROPOSED.

## ADR-008 — Missing/stale evidence: neutral prior, confidence 0, never fabricated

**Context.** New models, empty windows, stale stores. "Unknown" must not silently become "best" or "worst".

**Decision.** UNKNOWN → value 0.5 + confidence 0 + provenance UNKNOWN; weight renormalization over known dimensions. Staleness: ×0.5 confidence after 24h, UNKNOWN after 72h. UNKNOWN blocks only when the dimension is mandatory for the class. All-UNKNOWN candidate scores exactly 0.5 after renormalization — mathematically unable to beat any candidate with real evidence ≠ 0.5 on any weighted dimension.

**Alternatives.** Conservative default (treat unknown as bad — makes every new model unroutable); optimistic default (unknown as good — the "unknown becomes best" trap); drop candidate (same as conservative).

**Trade-offs.** 0.5 is a semantic claim ("neutral") — justified because scores are relative within an eligible set and every real-evidence candidate moves away from exactly-neutral deterministically.

**Consequences.** Cold start routes by intrinsic registry evidence + priors; the system degrades gracefully to V2.1-like behavior as evidence availability → 0.

**Status.** PROPOSED.

## ADR-009 — Cost/latency normalization: task-shape-relative, UNKNOWN-preserving

**Context.** Providers differ in pricing schema (token/request/credit/quota) and latency meaning (output-size dependent). Naive $/token or raw ms comparisons are wrong.

**Decision.** Cost: normalize to expected task shape (input + expected output at class default) → relative fit against the eligible set max → 0..1; schema enum includes QUOTA/FREE/UNKNOWN; UNKNOWN → fit .5/conf 0, never "cheapest". Latency: p50 for ranking, p95 for budget gates, per output-size bucket, timeoutRate feeds reliability only (no double count).

**Alternatives.** Global absolute price table (rejected: fabrication risk, maintenance, cross-currency); raw ms ranking (rejected: bucket incomparability); one blended "speed-cost" scalar (rejected: unexplainable).

**Trade-offs.** Relative normalization means costFit shifts with the eligible set composition — deterministic per decision, but a candidate's costFit is not a stable absolute; acceptable because ranking, not reporting, is the consumer (reporting uses nominal values).

**Consequences.** Budget gates stay hard and simple (absolute threshold on nominal/effective cost); ranking stays honest under UNKNOWN pricing.

**Status.** PROPOSED.

## ADR-010 — V2.2 failure isolation: pure decision layer, single degradation boundary

**Context.** The optimizer must not become a new single point of failure.

**Decision.** L3 is pure (no I/O in decision functions). One catch boundary at the L2→L3 call site: any exception or budget overrun → V2.1 ladder route + `scoring-degraded` event. Stores read-only to L3; writes asynchronous post-decision. Feature flags degrade layer-by-layer; OFF = byte-identical v2.1.0 behavior.

**Alternatives.** Resilient in-process retry with cached state (rejected: caches create hidden state, violating reconstructability); circuit-breaker for the scorer itself (rejected as over-engineering: a pure function either runs within budget or degrades — no state to protect).

**Trade-offs.** Async evidence writes can lose the last records on crash — accepted: evidence loss degrades future ranking, never safety, and stores are reconstructable from logs.

**Consequences.** V2.2 rollout risk is bounded to "worse ranking", never "broken routing". Shadow mode can measure the optimizer with zero production risk.

**Status.** PROPOSED.

---

## ADR-011 — UNKNOWN mandatory capability: 3-tier requirement taxonomy (C1)

**Context.** Replay and design audit found the security-review capability floor treated inconsistently: DECISION_MATRIX Example 3 kept an UNKNOWN-evidence candidate eligible while ROUTING_MODEL §6.4 implied blocking (conflict C1).

**Problem.** UNKNOWN evidence must not silently become eligibility for a capability a task cannot succeed without; but over-blocking (treating every unknown as fatal) would nuke routing on any registry gap.

**Decision.** Canonical 3-tier taxonomy (ROUTING_MODEL §4.4): MANDATORY (UNKNOWN → exclude; empty eligible set → BLOCK), REQUIRED-FLOOR (UNKNOWN → eligible without floor credit; no floor-verified candidate → V2.1 fallback), OPTIONAL (UNKNOWN → neutral prior + renormalization).

**Alternatives.** (a) UNKNOWN → exclude everywhere — rejected: single unknown dims would block tasks that remain satisfiable; (b) UNKNOWN → prior path everywhere — rejected: an unverified candidate could silently win a security floor; (c) BLOCK whenever no floor-verified candidate exists for REQUIRED-FLOOR — rejected: blocks work V2.1 already routes safely.

**Trade-offs.** REQUIRED-FLOOR + UNKNOWN yields "eligible but floorless" candidates that can appear in explanations — accepted, floor credit gating (§9) prevents them from passing quality floors.

**Consequences.** Vision-task BLOCK path preserved; security-review floor semantics consistent across documents.

**Validation required.** Unit tests: mandatory-unknown excludes; floor-unknown eligible-no-credit; no-floor-verified → V2.1 fallback; empty-mandatory → BLOCK. **Status.** ACCEPTED (design revision).

## ADR-012 — Task-class abstraction: 21 source classes → 8 optimization classes (C4)

**Context.** V2.1 policy defines 21 task classes; the V2.2 matrix defined 8 profiles with no mapping — 13% of observed traffic had no profile and 40% relied on undocumented approximations (EVIDENCE_AUDIT C4).

**Decision.** Total deterministic mapping (DECISION_MATRIX §1.1): routine-coding ← 9 classes (incl. database/deployment with HIGH risk + independent-review REQUIRED preserved), frontend ← 2, complex-debugging ← 2, security/routine/deep-review ← 1 each, deep-research ← 3 (deep-research, architecture-analysis, orchestration), repo-research ← 1, vision-task → BLOCKED (gate, not mapping). Adversarial validation found no material contradiction.

**Alternatives.** 21 per-class profiles (rejected: no per-class evidence exists; multiplies segments faster than evidence accrues); 8 classes with implicit/default mapping (rejected: orphans — the original defect).

**Trade-offs.** Compressed classes share weight profiles; risk overlay + review requirements preserve their distinct V2.1 semantics. If evidence later shows a compression distorting routing, a 9th class may be added — "8" is a target, not a law.

**Consequences.** Every V2.1 task class has exactly one optimization profile; no orphan, no ambiguity.

**Validation required.** Test: mapping is total over the 21 classes and deterministic. **Status.** ACCEPTED (design revision).

## ADR-013 — Variant-level evidence hierarchy (D-VAR)

**Context.** Routes are `provider + model + variant`, but V2.1 evidence is model-grain; replay showed per-model evidence cannot separate variants, letting ASCII tie-breaks become the de facto variant policy (45/90 divergences).

**Decision.** VariantEvidence stored at (provider, model, variant) grain (ROUTING_MODEL §4.5); aggregation variant (n≥5) → model (n≥20) → family/global with explicit inheritance marking and confidence cap ×0.5; shrinkage conf = n/(n+10); staleness half-life 14 days. No unmarked cross-variant inference (I-018).

**Alternatives.** Model-grain only (status quo — the defect); variant-grain only (rejected: starves new variants of any signal); confidence-free blending (rejected: unmarked inheritance is fabricated evidence).

**Trade-offs.** Sparse variant segments mostly inherit model data initially — accepted; marking keeps it auditable.

**Consequences.** Harness proxies stay model-grain until variant-level telemetry exists (INSTRUMENTATION_SPEC T3/T4).

**Validation required.** Tests: aggregation thresholds; inheritance marking; no cross-variant inference. **Status.** ACCEPTED (design revision).

## ADR-014 — Cold-start routing: tier ordering over ASCII (D-COLD)

**Context.** Offline replay proved an all-UNKNOWN eligible set resolves to the lexicographically smallest candidateId — an arbitrary winner (SIMULATION_RESULTS §5).

**Decision.** Tier ordering EXCLUDED < UNPROVEN < KNOWN-EVIDENCED applied before score ranking (ROUTING_MODEL §10.3): all-UNPROVEN set → V2.1 ladder head; mixed set → evidenced candidates by score, unproven follow in V2.1 seed order; ASCII (T6) is the final tie-break only among evidenced equals. No exploration in AUTO mode.

**Alternatives.** ASCII tie-break (the defect); random/rotational exploration (violates I-015 determinism); confidence-weighted score hack (conflates score and confidence, ADR-007).

**Trade-offs.** New models receive no AUTO traffic until evidenced — deliberate: evidence accrues via explicit selection, OPT-IN routing, and capability probes (T5).

**Consequences.** Deterministic, safe cold start; "UNKNOWN ≠ best, ≠ worst-artifact, ≠ ASCII winner" holds.

**Validation required.** Property test: for arbitrary candidate sets, all-UNPROVEN → ladder head; ASCII never decides cold start. **Status.** ACCEPTED (design revision).

## ADR-015 — Route stability: calibrated hysteresis, PROVISIONAL H=0.02

**Context.** Replay found evidenced-peer score margins ≈ 0.0058 → route churn risk under live evidence updates.

**Decision.** Session stickiness per (taskClass, risk) + route-change cooldown; replacement requires score(new) − score(current) > H. H is a calibration parameter: PROVISIONAL 0.02; current evidence only establishes H > ≈ 0.006. Reset: 3 consecutive evaluations > H, or > 2H for 24h. Breaker OPEN overrides stickiness; 2 consecutive EnvironmentOutcome events drop stickiness (ROUTING_MODEL §16).

**Alternatives.** Hardcode 0.02 as validated (rejected: not evidence-backed); no mechanism (accepted churn risk); pure cooldown without delta (insensitive to evidence magnitude).

**Trade-offs.** Stickiness can delay a genuinely better candidate by up to the reset conditions — bounded and overridable by safety.

**Consequences.** Deterministic (stickiness state is decision state); calibration procedure defined (EVIDENCE_CONTRACT §Calibration); final H requires replay-2 + human approval.

**Validation required.** Tests: replacement below H blocked; reset rules; breaker override; instability drop. **Status.** ACCEPTED (design revision, value provisional).

## ADR-016 — Evidence attribution: mandatory chain, no attribution → no update (R/I-016)

**Context.** 56/56 historical evaluations have zero model/variant/task attribution — the core feedback loop has no data (EVIDENCE_AUDIT).

**Decision.** Canonical chain sessionId → routeId → executionId → candidate(provider, model, variant) → taskClass → evaluationId. Incomplete attribution → record stored for audit, zero effect on quality/health/ranking. Three-way outcome separation (Execution/Quality/Environment) prevents timeout/environment/user-cancel from becoming model-quality penalties.

**Alternatives.** Best-effort attribution with partial updates (rejected: poisoned statistics — the exact defect being fixed); dropping unattributed records entirely (rejected: audit value).

**Trade-offs.** Strict gating reduces usable sample size early — accepted; correct data beats more wrong data.

**Consequences.** Instrumentation spec T1/T2 are the source of attributed signals; quality blend activates only when attribution coverage permits.

**Validation required.** Test: unattributed signal → no state change (property). **Status.** ACCEPTED (design revision).

## ADR-017 — Latency measurement: lifecycle windows, harness duration excluded

**Context.** Replay validated that `duration_ms` (13–31 ms decision-path timing) is NOT inference latency; using it as latencyFit produced 43 noise-driven route swaps.

**Decision.** Inference latency measured on t0 request-start → t1 provider dispatch → t2 first-response/token → t3 completion (TTFR, completion latency, timeout). Ranking: p50 primary; p95 for budget gates; EWMA α=.3 + recent-20 marked DESIGN PROPOSAL until validated. Harness duration_ms is excluded from latencyFit permanently (I-007: no substitution of unobtainable metrics).

**Alternatives.** Keep harness proxy (the defect); infer from provider docs (fabrication).

**Trade-offs.** Latency evidence may be entirely UNKNOWN until lifecycle hooks exist — accepted: neutral prior + conf 0 is safe and honest.

**Consequences.** T3 latency-window event defined in INSTRUMENTATION_SPEC; if the host cannot observe t2, latency stays UNKNOWN (declared, not faked).

**Validation required.** Test: latencyFit never populated from harness duration; UNKNOWN → inert. **Status.** ACCEPTED (design revision).

## ADR-018 — Cost measurement: explicit statuses, UNKNOWN is not zero

**Context.** Zero cost evidence exists anywhere in the workspace; treating UNKNOWN as free would systematically bias ranking toward unevidenced models.

**Decision.** CostEvidence carries provider/model/variant, input/output usage, pricing source, effective cost, unit, timestamp, confidence with statuses VERIFIED / PARTIAL / UNKNOWN. UNKNOWN → costFit = 0.5, confidence 0, dimension inert via renormalization; never 0, never free, never cheap. No fabrication (I-007).

**Alternatives.** Default-to-zero (rejected: implicit "cheapest" prior); hardcode price table (rejected: stale, unverifiable); drop the dimension (rejected: cost is a declared class objective).

**Trade-offs.** Cost sensitivity is dormant until a pricing source exists — accepted and documented.

**Consequences.** T4 cost-usage event defined; class cost objectives (e.g., routine-coding cost weight .20) require VERIFIED/PARTIAL pricing to take effect.

**Validation required.** Test: UNKNOWN cost → inert; no zero-cost path. **Status.** ACCEPTED (design revision).

## ADR-019 — Quality evidence: confidence-weighted blend, 50/50 provisional

**Context.** The 50/50 intrinsic/observed blend is unvalidatable with current evidence (zero attribution); a fixed ratio risks weighting garbage.

**Decision.** Both sides present & gates pass → confidence-weighted blend with observed weight clamped [0.25, 0.75]; only intrinsic → intrinsic alone with confidence ×0.5; neither → UNKNOWN → dimension inert. 50/50 remains PROVISIONAL, valid only while measured confidences are comparable. Observed side requires complete attribution (ADR-016), n ≥ 5, evaluator confidence ≥ 0.6.

**Alternatives.** Fixed 50/50 always (rejected: unvalidated); observed-only (rejected: throws away registry evidence); intrinsic-only forever (rejected: discards the core differentiator once evidence exists).

**Trade-offs.** Blend weights vary with evidence quality — deterministic (derived from recorded confidences) and explainable.

**Consequences.** Quality activates progressively as instrumentation accrues; floors stay conf-gated (§9).

**Validation required.** Tests: blend bounds; single-source paths; attribution gate. **Status.** ACCEPTED (design revision).

## ADR-020 — Observational instrumentation: fail-open, five events, zero behavior change

**Context.** Replay-2 requires attributed evidence; V2.1 is frozen — instrumentation must not alter routing, permission, breaker, or security behavior.

**Decision.** Exactly five observational event types (T1 evaluation-attributed, T2 execution-outcome, T3 latency-window, T4 cost-usage, T5 capability-probe) per INSTRUMENTATION_SPEC: additive emitters in V2.1 paths, fail-open (emitter failure → no-op + degraded flag), non-blocking, storage `.opencode/ai/telemetry/v22/`, retention 30 days. No event may alter decisions (I-021). V2.1 test suite must remain green unchanged.

**Alternatives.** Full telemetry framework (rejected: scope); piggybacking on V2.1 logs with schema changes (rejected: byte-compatibility of V2.1 events).

**Trade-offs.** Separate telemetry directory duplicates some envelope logic — accepted for isolation and byte-compatibility.

**Consequences.** Replay-2 evidence pipeline exists without production risk; coverage targets require human approval after a baseline instrumentation window (REPLAY_CONTRACT §Acceptance).

**Validation required.** Regression: V2.1 144/144 unchanged with instrumentation active; failure-injection: emitter throw → no routing effect. **Status.** ACCEPTED (design revision).

---

## 12. Final Questions

**Q1 — What exactly is V2.2 optimizing?**
Expected task success per unit of cost and latency, subject to hard safety/eligibility constraints — operationalized as the 7-dimension weighted score with task-class profiles. It optimizes *selection among eligible candidates*; it does not optimize permissions, policies, or capabilities themselves.

**Q2 — Which values are hard constraints?**
Policy/permission/agent/variant-ceiling compatibility; mandatory capability dims (incl. vision); circuit OPEN; provider availability; cost budget; p95 latency budget (LOW-risk only by default); task-class quality/health floors (HIGH/CRITICAL, evidence-conf ≥ .6).

**Q3 — Which values are soft objectives?**
quality, capabilityFit, reliability, latencyFit (p50), costFit, contextFit, recentSuccess — all 0..1, weighted per class/risk profile.

**Q4 — How is model capability represented?**
13-dimension taxonomy with per-(model,dim) evidence at five levels (LIVE > INTEGRATION > STATIC > DOCUMENTATION > UNKNOWN), each with value/confidence/verifiedAt/provenance; fit = demand-weighted; never inferred from names.

**Q5 — How is runtime health represented?**
Breaker state (binary authority, unchanged) + HealthSnapshot (windowed successRate, errorRate, latency p50/p75/p95, timeoutRate, recentFailures, recoveryStability) at three attribution levels (provider / model / provider+model), with sample-size confidence, staleness decay, and recent-20 windows.

**Q6 — How is evaluation converted into routing evidence?**
Evaluator emits EvaluationSignal (result, qualityScore, failureClass from a 14-class taxonomy, attribution, confidence, evidence counters) → append-only store → segment-scoped windowed aggregates update quality/reliability/recentSuccess dimensions; capability-class failures target the matching capability axis for escalation. Environment/uncertain signals never penalize models.

**Q7 — How is confidence handled?**
Separate from score. Gates floor enforcement (conf ≥ .6 required), surfaces in explanations, and tracks evidence availability (sample size, freshness, evaluator certainty). Not a score multiplier in MVP (ADR-007).

**Q8 — How is determinism guaranteed?**
Pure decision functions; no RNG anywhere; fixed gate order (set-semantics); fixed tie-break chain terminating in ASCII candidateId; `decisionId` = hash of canonical inputs making same-state-same-route verifiable in production logs; iteration-order normalization.

**Q9 — How does V2.2 fail safely?**
Single catch boundary: any L3 exception/timeout/store failure → V2.1 deterministic ladder route + degradation event; flags default OFF/shadow; OPTIMIZED without SCORING rejected at config validation; evidence writes async (loss degrades ranking, never safety).

**Q10 — What is the minimum viable V2.2 architecture?**
RequirementBuilder (class table) + registry candidate discovery + the three hard gates (policy/capability/health) + 7-dimension weighted scorer with class profiles + 6-tier tie-break + explanation logging + shadow reporter. Evidence stores may start empty (priors) — the MVP works from registry evidence alone and degrades to V2.1 when disabled.

**Q11 — What must explicitly remain in V2.1?**
Classification/risk/agent chain; permission resolver and hard denials; breaker state machine; escalation bounds/packets/semantics; variant ceiling; policy files and their immutability rules; YOLO semantics; vision BLOCKED; the static ladder as degradation path and seed ordering.

**Q12 — What evidence is required before implementation begins?**
(1) Shadow-mode replay corpus ≥ 2 weeks of real routing events; (2) offline simulation showing benchmark vector ≥ V2.1 baseline without invariant violations; (3) documented evidence coverage of the capability registry (which cells are STATIC vs UNKNOWN); (4) agreed floor thresholds from the DECISION_MATRIX validated against replay; (5) explicit human approval of weight profiles as policy data. No implementation starts at OPTIMIZED — the first executable artifact is SHADOW.

---

## 13. Final Recommendation

```text
==================================================
SMART ROUTER V2.2 DESIGN REVIEW
==================================================

Architecture:
CONDITIONAL APPROVED — design-complete; implementation gated on shadow/replay evidence

Primary Objective:
maximize expected task success per unit cost+latency within hard safety constraints

Hard Constraints:
policy/permission/agent/variant · mandatory capabilities (vision BLOCKED) · circuit OPEN ·
provider availability · cost budget · p95 latency budget · class/risk quality+health floors

Soft Objectives:
quality · capabilityFit · reliability · latencyFit(p50) · costFit · contextFit · recentSuccess

Capability Model:
13 dims × 5 evidence levels; per-(model,dim) records; no name-derived capability

Health Model:
breaker = binary authority (OPEN exclude / HALF_OPEN probe / CLOSED rank-only);
HealthSnapshot = windowed, segment-scoped, confidence-bearing; 3 attribution levels

Quality Model:
intrinsic (registry evidence) ⊕ observed (evaluation store), sample-gated, coexist
by fixed constants (0.5/0.5 after gate)

Scoring Model:
hard gates + weighted linear score (7 dims), class×risk profiles, floors-as-gates,
UNKNOWN → prior 0.5 + weight renormalization

Evaluation Feedback:
EvaluationSignal → 14-class attributed taxonomy → segment windows (recent-20) →
dimension/axis-targeted updates; env/user/uncertain signals excluded from penalties

Determinism:
pure functions, no randomness, canonical 6-tier tie-break, decisionId verification

Security Boundary:
selection ≠ permission; V2.1 authority order untouched; I-001..I-015 property-testable

Fallback:
re-scoring within MAX_REROUTES=3; ladder walk as degradation; continuation semantics unchanged

Failure Isolation:
single catch boundary → V2.1; zero partial state; async evidence writes

Observability:
11 versioned events + RouteDecision + RouteExplanation; full reconstruction from files

Shadow Mode:
default posture; V2.1 decides, V2.2 records deltas; promotion evidence source

Migration Strategy:
OFF → SHADOW → ADVISORY → OPT-IN OPTIMIZED → limited AUTO → default; gates per phase

Major ADRs:
ADR-001 gates+linear; -002 capability taxonomy; -003 breaker/health split; -004 attributed
feedback; -005 tie-break; -006 fallback compat; -007 confidence as gate; -008 UNKNOWN
handling; -009 cost/latency normalization; -010 failure isolation

Open Design Questions:
output-size bucket boundaries for latency comparability; EWMA half-life tuning;
per-language segment keys (deferred); exploration-free confirmation under long-tail tasks

Implementation Blockers:
none in the design; implementation gated on Q12 evidence list

Required Evidence Before Implementation:
2-week shadow/replay corpus · simulation ≥ baseline · registry evidence coverage map ·
validated floor thresholds · human-approved weight profiles

Recommended V2.2 MVP:
RequirementBuilder + gates + 7-dim scorer + tie-break + explanation + shadow reporter,
flags OFF/SHADOW only, empty evidence stores allowed (priors)

Not Recommended:
runtime exploration; LLM judge in the decision path; geometric/Pareto/lexicographic scoring;
replacing the breaker; autonomous weight editing; OPTIMIZED as initial mode

Final Architecture Position:
a deterministic, explainable decision engine operating on dynamic runtime evidence —
an optimization layer over the frozen V2.1 safety core, never a replacement

Implementation:
NOT AUTHORIZED
```
