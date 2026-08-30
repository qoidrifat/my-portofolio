# SMART ROUTER V2.2 — DECISION MATRIX

Status: **DESIGN ONLY — IMPLEMENTATION NOT AUTHORIZED**
Companion to `SMART_ROUTER_V2_2_ROUTING_MODEL.md` (definitions) and `..._EVALUATION_DESIGN.md` (failure classes).

All numeric weights below are **initial hypotheses to be validated in shadow mode** (Migration Phase 1). They are policy data, not code.

**Normative authority (C2 resolution):** this document is the **sole normative source for task-class/risk weight profiles, floors, and sensitivities**. Other design documents may contain illustrative examples but MUST NOT define competing canonical weights. Any profile found elsewhere and contradicting this table is SUPERSEDED (see ROUTING_MODEL §10.4 for the retired duplicate).

**Display rule (C3 resolution):** all arithmetic is computed at full precision; display rounds to 3 decimal places, ROUND-HALF-UP (e.g., exact .8145 displays as .815). Display rounding never feeds back into comparisons — comparisons use full precision.

---

## 1. Task-Class Decision Matrix

| Row | routine-review | deep-review | security-review | complex-debugging | repo-research | deep-research | routine-coding | frontend |
|---|---|---|---|---|---|---|---|---|
| Default risk | LOW | MEDIUM | HIGH | HIGH | LOW–MEDIUM | MEDIUM–HIGH | LOW | LOW–MEDIUM |
| Capability floor (hard) | review ≥ STATIC | review ≥ STATIC, reasoning ≥ STATIC | review+reasoning ≥ INTEGRATION | debugging+coding ≥ STATIC, toolUse ≥ STATIC | research ≥ STATIC | research+reasoning ≥ INTEGRATION, contextDemand ≤ usableWindow | coding ≥ STATIC | coding ≥ STATIC, frontend evidence preferred |
| Health floor (hard) | none | successRate ≥ 0.3 (conf ≥ .6) | successRate ≥ 0.5 (conf ≥ .6) | successRate ≥ 0.3 (conf ≥ .6) | none | successRate ≥ 0.4 (conf ≥ .6) | none | none |
| Quality floor (hard) | none | none | intrinsic ≥ 0.6 OR observed ≥ 0.6 (conf ≥ .6) | none | none | intrinsic ≥ 0.6 (conf ≥ .6) | none | none |
| Latency sensitivity | 0.6 | 0.2 | 0.3 | 0.3 | 0.4 | 0.1 | 0.7 | 0.6 |
| Cost sensitivity | 0.6 | 0.2 | 0.2 | 0.2 | 0.5 | 0.2 | 0.6 | 0.5 |
| Preferred objective | fast + cheap, adequate quality | quality-first | quality + reliability dominate | capability-targeted (debugging) | cheap + decent context | quality + context dominate | speed + cost | speed + cost, coding fit |
| Weight profile (q, cap, rel, lat, cost, ctx, recent) | .15,.15,.15,.20,.20,.10,.05 | .35,.20,.15,.05,.05,.15,.05 | .40,.15,.25,.05,.05,.05,.05 | .30,.25,.15,.10,.05,.10,.05 | .15,.15,.15,.10,.15,.25,.05 | .40,.20,.15,.02,.03,.15,.05 | .15,.20,.15,.20,.20,.05,.05 | .15,.20,.10,.20,.20,.10,.05 |
| Fallback strategy | re-score; allow cheaper | re-score; keep quality floor | re-score within floor; escalate security tier | capability-axis targeted (debugging) | re-score; allow weaker context | context-inverted re-gate first | re-score; prefer cheaper/fast | re-score; prefer faster |
| Escalation strategy | VARIANT_UP if reviewDemand unmet | VARIANT_UP → MODEL_STRONGER | MODEL_STRONGER within security tier only | MODEL_STRONGER (debugging axis) | PROVIDER_SWITCH allowed early | context re-gate → MODEL_STRONGER | RETRY_SAME once → re-score | RETRY_SAME once → re-score |

Weight profile keys: q=quality, cap=capabilityFit, rel=reliability, lat=latencyFit, cost=costFit, ctx=contextFit, recent=recentSuccess. Each row sums to 1.00.

## 1.1 Canonical Class Mapping (C4 resolution — 21 source classes → 8 optimization classes)

V2.1's policy defines 21 task classes; the optimization matrix has 8 profiles. Mapping is total (no orphans, no duplicates) and deterministic. `agent` alignment follows the V2.1 class definitions; `risk` and `review` preserve V2.1 policy semantics.

| Source Class (V2.1) | Optimization Class | Risk Overlay | Review Requirement | Rationale |
|---|---|---|---|---|
| crud-simple | routine-coding | LOW | optional | mechanical work |
| standard-coding | routine-coding | MEDIUM | reviewer-on-request | default coding |
| complex-implementation | routine-coding | MEDIUM | reviewer-on-request | multi-file but execution-shaped |
| latency-sensitive | routine-coding | LOW | optional | lat/cost weight .20/.20 fits |
| documentation | routine-coding | LOW | optional | routine work |
| testing | routine-coding | LOW | optional | execution work |
| tooling | routine-coding | LOW | optional | scripts = coding |
| database† | routine-coding | HIGH | **independent-review REQUIRED** | schema/migration risk |
| deployment† | routine-coding | HIGH | **independent-review REQUIRED** | deploy risk; zcode_independent_review |
| ui-implementation | frontend | MEDIUM | reviewer-on-request | frontend evidence axis |
| react-next-architecture | frontend | HIGH | reviewer-required | architecture demands |
| performance | complex-debugging | MEDIUM | reviewer-on-request | diagnosis-shaped |
| complex-debugging | complex-debugging | HIGH | reviewer-required | direct |
| security-review | security-review | CRITICAL | reviewer-plus-independent | direct |
| routine-review | routine-review | MEDIUM | reviewer-on-request | direct |
| deep-review | deep-review | HIGH | reviewer-required | direct |
| deep-research | deep-research | MEDIUM–HIGH | reviewer-on-request | direct |
| architecture-analysis | deep-research | HIGH | reviewer-required | research profile fits (quality .40 + ctx .15) |
| orchestration | deep-research | MEDIUM | reviewer-on-request | planning = quality/context heavy |
| repo-research | repo-research | LOW–MEDIUM | reviewer-on-request | direct |
| vision-task | — | MEDIUM | — | **BLOCKED** (no profile; hard gate, not a mapping) |

Adversarial validation (ADR-012): every row was checked for wrong model family, wrong capability floor, wrong fallback, wrong risk treatment, wrong agent alignment, wrong cost/latency objective. Material findings: none — the two highest-risk compressions (database/deployment → routine-coding) preserve their V2.1 HIGH risk and independent-review requirement via the overlay, and architecture-analysis/orchestration → deep-research matches their research-agent alignment and context-heavy demands. C4 = **RESOLVED**. If future evidence shows a compression distorting routing (e.g., deployment needs a distinct latency/permission objective), a 9th optimization class may be introduced — the number 8 is an abstraction target, not a law.

## 2. Risk Overlay (applies on top of task class)

| Risk | Effect on weights | Floors activated | Fallback depth | Notes |
|---|---|---|---|---|
| LOW | cost ×1.3, latency ×1.3 (renormalized) | none | MAX_REROUTES=3 (V2.1) | maximum optimization freedom |
| MEDIUM | baseline profile | class defaults | 3 | — |
| HIGH | quality ×1.3, reliability ×1.3; cost ×0.7, latency ×0.7 | health floor (class), quality floor if class declares | 3 | stricter eligibility |
| CRITICAL | quality ×1.5, reliability ×1.5; cost ×0.5, latency ×0.5 | health + quality floors mandatory; evidence level ≥ INTEGRATION required | 3; escalation restricted to tiered candidates | security-review class is the canonical CRITICAL consumer |

Risk never modifies gates D2 (policy/permission) or D3 capability *mandatory* rules — it only adds floors and reweights (SECURITY_BOUNDARY INV-C).

## 3. Candidate Eligibility Gate Summary

| Gate | Evaluates | Excludes when | Source |
|---|---|---|---|
| D2 Policy | policyStatus, agent restrictions, variant ceiling, provider availability | FORBIDDEN / INCOMPATIBLE / restricted | V2.1 policies |
| D3 Capability | mandatory capability dims per class | mandatory dim missing or UNKNOWN-with-mandatory-rule | capability registry |
| D4 Health | breaker state, class health floor, class quality floor | OPEN; floor violated with conf ≥ .6 | breaker + health/eval stores |
| D5 Budget | cost budget, latency budget (p95) | budget exceeded | budget config |

## 4. Worked Routing Examples

All numbers are **ILLUSTRATIVE** — they demonstrate mechanics, not measured performance. Registry assumption for examples (matches the 13-model b-ai-family workspace shape):

```text
M1 GLM-5.3-flash      ctx 200k  intrinsic q .85  cost med   lat med   strong: reasoning/coding
M2 DeepSeek-v4-flash  ctx 128k  intrinsic q .78  cost low   lat fast  strong: coding, weak: long-context
M3 Qwen3.8-flash      ctx 128k  intrinsic q .74  cost low   lat fast  strong: general
M4 MiniMax-M3         ctx 1M    intrinsic q .70  cost low   lat med   strong: long-context
(remaining registry entries analogous; breaker states per scenario)
```

---

### Example 1 — Routine review, all healthy

```text
Prompt: "Review src/utils/date.js for obvious bugs."
Class: routine-review · Risk: LOW · Agent: reviewer
Requirements: reviewDemand .8, reasoning .4, contextDemand ~4k tokens, latSens .6, costSens .6
Eligible: M1, M2, M3 (all CLOSED, floors none)
Scoring (profile .15,.15,.15,.20,.20,.10,.05):
  M1: q.85 cap.80 rel.95 lat.55 cost.45 ctx 1.0 recent.85 → .150+.120+.143+.110+.090+.100+.043 = .756
  M2: q.78 cap.75 rel.90 lat.80 cost.75 ctx 1.0 recent.80 → .117+.113+.135+.160+.150+.100+.040 = .815
  M3: q.74 cap.70 rel.88 lat.82 cost.78 ctx 1.0 recent.75 → .111+.105+.132+.164+.156+.100+.038 = .806
Tie-break: not needed (M2 highest)
Selected: M2 (DeepSeek#balanced-equivalent) — cheap+fast wins at LOW risk.
Why not runner-up M3 (.806): lower quality and review fit; gap .009 within noise but deterministic.
Display note (C3): M2 exact sum = .8145; displayed .815 per the 3dp round-half-up rule. Full
precision is used for comparisons; the winner is unchanged under both.
```

### Example 2 — Deep review, quality dominates

```text
Prompt: "Review the auth middleware for architectural flaws."
Class: deep-review · Risk: MEDIUM · Agent: reviewer
Requirements: reasoning .8, review .9, context ~30k, latSens .2, costSens .2
Eligible: M1, M2, M3 (floors: health ≥ .3)
Scoring (profile .35,.20,.15,.05,.05,.15,.05):
  M1: q.85 cap.88 rel.95 lat.55 cost.45 ctx .90 recent.85 → .298+.176+.143+.028+.023+.135+.043 = .846
  M2: q.78 cap.74 rel.90 lat.80 cost.75 ctx .55 recent.80 → .273+.148+.135+.040+.038+.083+.040 = .757
Selected: M1. Why not M2: contextFit .55 vs .90 and quality gap dominates at weight .35.
```

### Example 3 — Security review with quality floor (rewritten per canonical C1, §4.4 ROUTING_MODEL)

```text
Prompt: "Security review of payment processing module."
Class: security-review · Risk: CRITICAL · Agent: reviewer
Floors: health ≥ .5 (conf≥.6), quality ≥ .6 (conf≥.6); capability floor:
        review+reasoning ≥ INTEGRATION — tier REQUIRED-FLOOR
Candidates: M1 (q .85, review+reasoning evidence INTEGRATION → KNOWN-SUPPORTED,
            eligible + floor credit),
            M2 (q .78, review evidence STATIC → below required level → KNOWN-UNSUPPORTED
            at the floor → excluded D3),
            M3 (q .74, STATIC → excluded D3),
            M5-new-model (capability evidence UNKNOWN → REQUIRED-FLOOR + UNKNOWN →
            eligible WITHOUT floor credit; ≥1 floor-verified candidate (M1) exists, so
            M5 may not claim the floor; scored with neutral priors on unknown dims)
Scoring (profile .40,.15,.25,.05,.05,.05,.05):
  M1: q.85 cap.90 rel.95 lat.55 cost.45 ctx .80 recent.85 → .340+.135+.238+.028+.023+.040+.043 ≈ .845
      (contributions displayed at 2dp for readability; exact sum .845 — comparisons use full precision)
  M5: q.50(unknown) cap.50(unknown) rel.50(unknown) lat.50 cost.50 ctx.50 recent.50
      → renormalized all-known-neutral = .500
Selected: M1. Why not M5: M5 is eligible but holds no floor credit and every unknown dimension
is the neutral prior at confidence 0 — it cannot beat a floor-verified candidate with real
evidence (ADR-008). Had NO floor-verified candidate existed, the decision would have degraded
to the V2.1 route (never an UNKNOWN tie-break win, never BLOCK — C1 §4.4).
```

### Example 4 — Complex debugging, provider outage

```text
Prompt: "Intermittent test failure in CI; flaky timing in worker pool; diagnose."
Class: complex-debugging · Risk: HIGH · Agent: build
Health: provider of M1 has 2/2 models failing transport (provider outage evidence) →
        M1 excluded (D4, provider attribution); M2 CLOSED but successRate .25 (conf .7) →
        floor .3 violated → excluded; M3 healthy, M4 healthy.
Scoring (profile .30,.25,.15,.10,.05,.10,.05):
  M3: q.74 cap.72(debug) rel.88 lat.82 cost.78 ctx .70 recent.80 → .222+.180+.132+.082+.039+.070+.040 = .765
  M4: q.70 cap.60 rel.85 lat.70 cost.80 ctx .98 recent.70 → .210+.150+.128+.070+.040+.098+.035 = .731
Selected: M3. Why not M4: debugging capability axis gap (cap .72 vs .60) outweighs M4's context edge.
```

### Example 5 — Deep research, context overflow then re-gate

```text
Prompt: "Synthesize architecture across 40 collected docs (≈300k tokens attached)."
Class: deep-research · Risk: MEDIUM · Agent: research
contextDemand ≈ 320k tokens → D3 hard context gate: M1 (200k) EXCLUDED, M2/M3 (128k) EXCLUDED,
M4 (1M) eligible. Scoring: single eligible candidate → selected without tie-break.
Failure path (if M4 context-overflow failure): evidence = failureClass CONTEXT_LIMITATION →
  escalation table → context re-gate inverted (demand × 1.2 = 384k; only M4 qualifies) →
  no alternative ≥ 384k → HARD_BLOCK with BLOCKED semantics + explanation "no candidate context".
```

### Example 6 — Routine coding, latency/cost optimization

```text
Prompt: "Rename variable `d` to `days` in this file."
Class: routine-coding · Risk: LOW · Agent: build
Requirements: coding .6, context ~2k, latSens .7, costSens .6
Scoring (profile .15,.20,.15,.20,.20,.05,.05):
  M2: q.78 cap.80 rel.90 lat.85 cost.80 ctx 1.0 recent.80 → .117+.160+.135+.170+.160+.050+.040 = .832
  M3: q.74 cap.72 rel.88 lat.85 cost.82 ctx 1.0 recent.75 → .111+.144+.132+.170+.164+.050+.038 = .809
  M1: q.85 cap.82 rel.95 lat.55 cost.45 ctx 1.0 recent.85 → .128+.164+.143+.110+.090+.050+.043 = .728
Selected: M2. Expensive-strong M1 correctly last at LOW risk.
```

### Example 7 — Cold start, all candidates UNPROVEN (rewritten per canonical D-COLD, §10.3 ROUTING_MODEL)

```text
Scenario: two candidates with byte-identical score components (fresh registry, identical priors):
  A = "b-ai/glm-5.3-flash#high", B = "b-ai/deepseek-v4-flash#max"
Both are UNPROVEN (no dimension has confidence > 0). Per D-COLD, the all-UNPROVEN eligible set
is resolved by the V2.1 seed order (ladder head) — NOT by ASCII comparison.
Selected: the V2.1 ladder head for this task class.
CORRECTED (C-sim/ADR-014): the pre-revision example selected B via T6 ASCII. ASCII is now the
FINAL tie-break only, applicable exclusively among KNOWN-EVIDENCED candidates tied with real,
evidenced scores. An all-UNKNOWN cold-start set never reaches T6.
Guarantee: any implementation, any iteration order → same winner (V2.1 seed order is
deterministic policy data).
```

### Example 8 — Half-open probe rule

```text
Scenario: M1 circuit OPEN 2h ago; cooldown elapsed → HALF_OPEN. Task: deep-review.
HealthGate: M1 HALF_OPEN → special probe rule: eligible ONLY as probe. Healthy M2/M3 exist →
M1 is NOT selected as ranked winner; M2 selected normally. If NO healthy peer existed,
M1 selected as the single probe attempt (V2.1 half-open semantics preserved verbatim).
Probe success → recordSuccess → CLOSED → next decision ranks M1 normally.
```

---

### Anti-example (explicitly rejected behavior)

```text
Score everything then apply security: M2 (OPEN circuit, score .9) beats M1 (CLOSED, .8).
REJECTED — INV-B: OPEN is a hard gate; M2 never reaches scoring. Filter before score.
```
