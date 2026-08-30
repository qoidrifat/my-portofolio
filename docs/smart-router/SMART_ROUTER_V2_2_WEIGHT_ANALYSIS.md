# Smart Router V2.2 — Weight Analysis (offline)

Date: 2026-08-29 · Same corpus/engine as SIMULATION_RESULTS. No implementation.

## 1. Profile-by-profile replay outcome

Observed traffic (107 decisions) mapped to V2.2 profiles:

| V2.2 class | Observed decisions | Direct / approx / none | Replay outcome |
|---|---|---|---|
| security-review | 47 | direct | 46 diverge: 45 variant-ASCII (`#max`→`#high`), 1+ proxy swaps |
| routine-coding | 43 | 40 approx (standard-coding) + 3 approx (crud-simple) | all diverge: proxy-noise swaps (GLM vs MiniMax margin .003–.005) |
| (unmapped: architecture-analysis, documentation, vision-task*) | 15+1 | no V2.2 profile | V2.1 fallback by design (14) + BLOCKED gate (1) |
| deep-review, deep-research, repo-research, frontend, routine-review | 1 | zero/near-zero observed traffic | unexercised |

*vision-task routed to BLOCKED by gate, not by profile.

**51% of observed decisions reach a V2.2 profile only through undocumented approximations (conflict C4); 13% have no profile at all.** The weight table is untested against 5 of its 8 classes.

## 2. Weight-profile conflict (C2, restated)

`deep-research` weights differ between ROUTING_MODEL §10.4 (`.40/.20/.20/.05/.05/.08/.02`) and DECISION_MATRIX (`.40/.20/.15/.02/.03/.15/.05`). Both sum to 1.0; rank order of a worked example is unaffected, but the normative source is ambiguous. Must be resolved to a single table before authorization.

## 3. What weights actually did in replay

- Only `latency` + `recent` carried any evidence (harness proxy). Effective scoring = renormalized 2-dim model: e.g. security-review effective weights .035 lat + .05 recent (post risk-adjust) on a .035/.05 denominator → score = weighted mean of two proxy values.
- Result: winner selection among evidenced peers decided by 0.003–0.006 margins; among same-model variants decided by ASCII; cost/context/quality weights arithmetically present but behaviorally inert.
- Uniform ±20% churn (12/91 across every dim) confirms: the weight vector's *shape* had no observable effect. The 50/50 observed/intrinsic quality blend could not be exercised (no observed side at all).

## 4. Evidence-weight interaction findings (input to design revision)

| Finding | Impact | Design response needed |
|---|---|---|
| Per-model proxy cannot separate variants | 45/90 divergences are ASCII, not evidence | Variant-level evidence requirement (D-VAR) or explicit default-variant policy |
| Harness duration ≠ inference latency | 43 noise swaps | Exclude decision-path durations from latencyFit; require inference-level source |
| Evidence-availability dominance | unevidenced candidates systematically lose | Acceptable under conf floors, but document as intended behavior (currently implicit) |
| All-UNKNOWN set → ASCII winner | cold-start determinism exists but is arbitrary | D-COLD: all-UNKNOWN → V2.1 ladder head |
| Evidenced-peer margin < hysteresis constant | oscillation risk live | Require min-delta 0.02 / session stickiness before enablement |

## 5. Verdict

**Weight profile: NOT VALIDATED.** Structure (7 dims, gates, renormalization, tie-break) behaves deterministically and safely; the *values* are untested because 5 of 7 dims had no evidence. No tuning performed or recommended at this stage. Re-run this analysis after the instrumentation listed in IMPLEMENTATION_GATE prerequisites.
