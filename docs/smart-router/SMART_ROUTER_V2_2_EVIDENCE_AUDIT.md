# Smart Router V2.2 — Evidence Audit (offline, read-only)

Date: 2026-08-29 · Scope: V2.1.0 baseline `fca4f59` (tag `v2.1.0`), working tree clean during replay.
Method: direct JSONL inventory + offline replay engine (`.opencode/ai/verification/v22-simulation/replay.mjs`). No production routing executed. No implementation changes.

## 1. Corpus inventory

| Source | Records | Fields present | Fields missing (V2.2-relevant) |
|---|---|---|---|
| `routing-decisions.jsonl` | 146 (107 route decisions + 39 continuation-packet) | taskType, matched_task_class, agent, model, variant, permission, risk, decision, fallback ladder | **outcome, latency, cost, quality, per-variant evidence** |
| `smart-router.jsonl` | 395 (193 chat.params-invoke, 56 dispose-evaluation, 40 advisory-mismatch, 107 route) | quality/action/reasons (evaluations), live/recommended (advisory) | **model/variant/taskClass attribution on evaluations** |
| `model-routing-tests.jsonl` | 85 | duration_ms, pass, decision | production inference latency (duration_ms = decision-path harness proxy, p50 13–31 ms) |
| `permission-decisions.jsonl` | 11 | permission decisions | — |
| continuation packets | 22 | escalation chains | outcome deltas |
| `circuit-breaker.json` | entries all closed | per-model keys | — |
| capability SSOT + `capability.ts` | 13 models | variant verification (VERIFIED/UNSUPPORTED/BLOCKED_UPSTREAM), vision=false | 11 of 13 capability dims (quality, cost, context, per-dim fit) have **no source** |

Observed class distribution (107): security-review 47, standard-coding 40, architecture-analysis 13, crud-simple 3, complex-debugging 1, routine-review 1, documentation 1, vision-task 1.

## 2. Design consistency audit (P1) — 4 conflicts found, independently verified

| # | Conflict | Location | Severity |
|---|---|---|---|
| C1 | UNKNOWN mandatory capability: Example 3 keeps M5 eligible under security-review capability floor vs §6.4/§4.3 ("mandatory + UNKNOWN → blocked") | DECISION_MATRIX Ex.3 vs ROUTING_MODEL §6.4/§4.3 | Substantive |
| C2 | deep-research weights `.40/.20/.20/.05/.05/.08/.02` vs `.40/.20/.15/.02/.03/.15/.05` | ROUTING_MODEL §10.4 vs DECISION_MATRIX row | Substantive |
| C3 | Arithmetic: §10.4 candidate A sums to .837 (doc states .832); Ex.1 M2 sums to .8145 (doc .815, rounding) | ROUTING_MODEL §10.4, DECISION_MATRIX Ex.1 | Editorial (winners unchanged) |
| C4 | Segmentation: V2.1 policy defines 21 task classes; V2.2 matrix defines 8; 14/107 observed decisions (13%) have **no** V2.2 class, 43/107 (40%) need an undocumented approximation (standard-coding→routine-coding, crud-simple→routine-coding) | routing-policy.json vs DECISION_MATRIX | Substantive |

Unresolved conflicts are recorded, not silently patched. Fixes belong to a design-revision pass, not this validation task.

## 3. Capability evidence matrix (P4)

Evidence levels: LIVE (runtime-verified) / HARNESS-PROXY / STATIC / UNKNOWN.

| Dim | Evidence | Level |
|---|---|---|
| variant effort configurability | SSOT runtime tests (GLM high/max PASS, xhigh UNSUPPORTED; hy3 max UNSUPPORTED; mimo max BLOCKED) | LIVE (partial: b-ai only) |
| vision | all models false, b.ai runtime-rejected | LIVE (negative) |
| latency | `model-routing-tests.jsonl` duration_ms (GLM n=30 p50 13 ms, MiniMax n=35 p50 31 ms, mimo/hy3 n=5) | HARNESS-PROXY — **not inference latency, treated as invalid for latencyFit** |
| recent success | harness pass rates (GLM 100%, MiniMax 97.1%, n≥5 only) | HARNESS-PROXY |
| quality (intrinsic) | no source in workspace | UNKNOWN |
| quality (observed per segment) | dispose-evaluation has no model/task attribution | **IMPOSSIBLE from current data** |
| reliability / success-rate production | no outcome field in routing-decisions | UNKNOWN (chaos events only, out of corpus) |
| cost | zero pricing evidence anywhere | UNKNOWN |
| context window / demand | no source, no demand records | UNKNOWN |
| coding/reasoning/review fit | no per-dim source | UNKNOWN |

## 4. Signal verdicts (P5–P8)

- **Health (breaker/failure feedback): PARTIAL.** Breaker closed across corpus; chaos T1–T6 transitions live-verified in release tests; escalation packets (22) are the only failure trace; no outcome field → recent-20 segments: top segments (GLM/MiniMax, n≥30) workable, tail segments n<5 insufficient.
- **Quality: INSUFFICIENT.** 56 evaluations exist but unattributed → the 50/50 observed/intrinsic blend cannot be computed; intrinsic side has no source. V2.2's core differentiator has **no data**.
- **Cost: UNKNOWN (all models).** Dimension is inert under renormalization; no instability observed in replay.
- **Latency: INSUFFICIENT.** Only decision-path harness durations exist; replay shows treating them as latencyFit produces arbitrary winners (median divergence score gap **0.0047**, below any meaningful margin).

## 5. Evaluation feedback (F01–F14 prerequisites)

- dispose-evaluation: 54 good / 1 insufficient / 1 uncertain; actions 54 continue / 1 escalate / 1 retry. No attribution → F01–F14 formulas cannot be exercised offline.
- Advisory-mismatch (40): live GLM#max vs recommended MiniMax#deep — direction consistent; no outcome → benefit unmeasurable.

## 6. Counterfactual integrity statement

No record links a route decision to an outcome. Therefore **every** V2.2-vs-V2.1 divergence in this audit has counterfactual = UNKNOWN. Nothing in this audit claims V2.2 would outperform or underperform V2.1.
