# SMART ROUTER V2.2 — DESIGN REVISION REPORT

Status: **CANONICAL (design revision)** · Inputs: EVIDENCE_AUDIT, SIMULATION_RESULTS, THRESHOLD_ANALYSIS, WEIGHT_ANALYSIS, reviewer-analysis, adversarial validation
Result: all named design defects (C1–C4, D-VAR, D-COLD, oscillation guard, canonical weights, evidence contract, instrumentation spec) resolved **in design**. Evidence gates G3–G7 unchanged (require runtime evidence — IMPLEMENTATION_GATE rev 2).

---

## 1. Conflict resolutions (canonical decisions)

### C1 — UNKNOWN mandatory capability → 3-tier taxonomy (ADR-011)
MANDATORY (UNKNOWN → exclude; empty eligible → BLOCK) / REQUIRED-FLOOR (UNKNOWN → eligible WITHOUT floor credit; no floor-verified → V2.1 fallback) / OPTIONAL (neutral prior + renormalize). Canon: ROUTING_MODEL §4.4; matrix Ex.3 rewritten. Resolution of the Ex.3-vs-§6.4 contradiction.

### C2 — canonical weight authority (matrix header)
DECISION_MATRIX weight table = sole normative source. ROUTING_MODEL §10.4 marked SUPERSEDED, example recomputed against matrix profile (A=.859, B=.7285; display 3dp). Resolution of "which of two different weight sets is real".

### C3 — precision + display (matrix header)
Full precision internally; display 3 decimal places, round-half-up (.8145→.815). Internal .837 mismatch in old §10.4 corrected (slip; matrix profile is normative).

### C4 — 21→8 task-class mapping (ADR-012, DECISION_MATRIX §1.1)
Total deterministic mapping; database/deployment keep HIGH risk + independent-review REQUIRED (review integrity invariant preserved); deep-research/architecture-analysis/orchestration → deep-research; adversarial validation of 12-adjacency: RESOLVED, no material contradiction; 9th-class escape hatch documented. Resolution of 51% coverage gap.

### D-VAR — variant-level evidence (ADR-013, ROUTING_MODEL §4.5)
VariantEvidence at (provider, model, variant); aggregation variant n≥5 → model n≥20 → family/global; inheritance marked + confidence cap ×0.5; shrinkage n/(n+10); 14-day half-life; no unmarked cross-variant inference (I-017→ I-018). Resolution of variant-blindness (45/90 divergences).

### D-COLD — cold-start ordering (ADR-014, ROUTING_MODEL §10.3)
Tiers EXCLUDED < UNPROVEN < KNOWN-EVIDENCED; all-UNPROVEN → V2.1 ladder head; ASCII = final tie-break only (T6). Resolution of arbitrary-winner defect.

### Oscillation guard (ADR-015, ROUTING_MODEL §16)
Session stickiness per (taskClass, risk) + cooldown; replacement needs Δscore > H; H = calibration parameter, PROVISIONAL 0.02 (current evidence only: H > ≈ 0.006); reset rules; breaker overrides; 2 EnvironmentOutcome → drop stickiness. Calibration = p75 of replay-2 margin distribution + HUMAN APPROVAL.

### Quality blend (ADR-019, ROUTING_MODEL §7)
Confidence-weighted intrinsic/observed, observed weight clamped [0.25, 0.75]; 50/50 = PROVISIONAL; intrinsic-only → conf ×0.5; neither → UNKNOWN inert.

### R/I — new invariants I-016..I-021 (SECURITY_BOUNDARY §4)
I-016 attribution integrity; I-017 cold-start determinism; I-018 variant-evidence precedence; I-019 health-confidence floor; I-020 counterfactual integrity; I-021 telemetry isolation.

## 2. New canonical documents

| Document | Role |
|---|---|
| EVIDENCE_CONTRACT (v1) | 20 fields × 9 attributes, statuses, attribution invariant, calibration procedure |
| V2_1_INSTRUMENTATION_SPEC | T1–T5 observational events; fail-open; retention 30 d; V2.1 byte-compat |
| REPLAY_CONTRACT | ReplayRecord (null+reason), replay-2 procedure, shadow spec, acceptance criteria (structural hard, coverage = human approval) |

## 3. Adversarial validation (18 scenarios)

Coverage of the reviewer's list (reviewer-analysis.txt) — each checked against the revised canon; FAIL = genuine unhandled defect.

| # | Scenario | Verdict | Canon |
|---|---|---|---|
| 1 | Vision task, only vision-UNKNOWN candidates | OK — BLOCK (MANDATORY unknown) | RM §4.4 |
| 2 | Vision task, mixed verified/unknown | OK — unknown excluded, verified ranked | RM §4.4 |
| 3 | Security review, all evidence UNKNOWN | OK — eligible without floor credit | RM §4.4 (C1) |
| 4 | Security review, no floor-verified | OK — V2.1 fallback, never BLOCK | RM §4.4, Matrix Ex.3 |
| 5 | Empty mandatory-eligible set | OK — BLOCK, no silent degradation | RM §4.4 |
| 6 | All candidates UNPROVEN | OK — ladder head, no ASCII | RM §10.3 (D-COLD) |
| 7 | One UNPROVEN + one UNKNOWN-evidence | OK — UNPROVEN tier wins | RM §10.3 |
| 8 | Variant evidence inherited conf caps | OK — ×0.5 cap, marked | RM §4.5 |
| 9 | Stale variant evidence (half-life) | OK — conf decay, staleness flag | RM §4.5 |
| 10 | New variant, no data | OK — inherited model evidence, marked | RM §4.5 |
| 11 | Breaker OPEN on sticky route | OK — OPEN overrides stickiness | RM §16 |
| 12 | Two EnvironmentOutcomes on sticky route | OK — stickiness dropped | RM §16 |
| 13 | Timeout in evaluation | OK — EnvironmentOutcome, no quality penalty | RM §10.1 |
| 14 | Cost UNKNOWN | OK — inert, never 0 | ADR-018 |
| 15 | Latency unobservable (no t2) | OK — UNKNOWN declared, no harness substitution | ADR-017 |
| 16 | Unattributed evaluation | OK — no update (I-016) | EVIDENCE_CONTRACT §4 |
| 17 | database task, security floor + HIGH risk | OK — routine-coding + HIGH + review REQUIRED | Matrix §1.1 (C4) |
| 18 | determinism under evidence drift | OK — evidence state hash in decisionId | OBS §5 |

Result: **18/18 handled by the revised canon**. No new defect found. Items 11–12 (instability handling) were strengthened beyond the original reviewer list.

## 4. Change audit (documents touched)

| Document | Changes |
|---|---|
| ROUTING_MODEL | D3→§4.4 ref; §4.4 C1 taxonomy; §4.5 D-VAR; §7 quality blend; §10.3 D-COLD; §10.4 SUPERSEDED + recompute + C3 correction; §11 T6 note; §14 variant-first segmentation; §15 ref fix; §16 hysteresis (new) |
| DECISION_MATRIX | header: sole normative authority + 3dp display; §1.1 C4 mapping (new); Ex.1 display note; Ex.3 C1 rewrite; Ex.7 D-COLD rewrite |
| ARCHITECTURE | §6.0 canonical authority hierarchy (new) |
| EVALUATION_DESIGN | §3.1 attribution chain + invariant + 3-way outcomes (new); §7 variant-level primary key |
| OBSERVABILITY_DESIGN | §1.1 T1–T5 refs; §5 correlation IDs (executionId/evaluationId) + latency t0–t3 contract |
| SECURITY_BOUNDARY | I-016..I-021 added (I-001..I-015 untouched) |
| ADR | ADR-011..ADR-020 added before §12 (ADR-001..010 untouched) |
| IMPLEMENTATION_GATE | rev 2: G1–G14 table + historical rev-1 verdict preserved |

Out of scope, untouched: EVIDENCE_AUDIT, SIMULATION_RESULTS, THRESHOLD_ANALYSIS, WEIGHT_ANALYSIS (historical evidence, read-only); routing-policy.json; all V2.1 code; V2.1 logs/telemetry.

## 5. Open items (explicitly deferred, none blocking design)

1. H final value — calibration data (replay-2) + human approval.
2. Coverage targets G3–G7 — human approval after baseline window.
3. EWMA α/recent-20 — DESIGN PROPOSAL until validated.
4. Shadow-mode promotion ladder — separate proposal after replay-2.

## 6. Q&A recap (§12 Final Questions — rechecked)

Q1/Q2/Q3 answers unchanged; Q2 hard-constraint list now precisely implemented by C1 taxonomy; quality/latency/cost floors all evidence-gated (EVIDENCE_CONTRACT §5). Q10 note: harness latency proxies excluded (ADR-017) — evaluation design must not reintroduce them (validator-checked).
