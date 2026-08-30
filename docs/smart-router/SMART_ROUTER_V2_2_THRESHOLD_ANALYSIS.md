# Smart Router V2.2 — Threshold Analysis (offline)

Date: 2026-08-29 · Inputs: same corpus/engine as SIMULATION_RESULTS. No implementation.

## 1. Confidence floors (conf ≥ 0.6 for evidence participation; higher for floors)

Replay across thresholds .5/.6/.7/.8:

| Threshold | Floor-enforceable decisions | Rate |
|---|---|---|
| 0.5 | 76/91 | .835 |
| 0.6 | 76/91 | .835 |
| 0.7 | 76/91 | .835 |
| 0.8 | 76/91 | .835 |

Cause: observed confidence is **bimodal** (0 for unevidenced dims, 1 for fully-sampled harness proxies). Intermediate values do not exist in the corpus → thresholds are empirically indistinguishable.

**Verdict: UNCALIBRATABLE from current evidence.** The 0.6 default is defensible only a priori (design rationale), not empirically. Calibration requires graded-confidence evidence (partial windows, partial attribution), which does not exist yet.

## 2. Weight sensitivity (P12)

For each of the 7 dims, ±10% and ±20% perturbation (renormalized):

| Dim | ±10% churn | ±20% churn |
|---|---|---|
| quality | 12/91 (13.2%) | 12/91 (13.2%) |
| capability | 12/91 | 12/91 |
| reliability | 12/91 | 12/91 |
| latency | 12/91 | 12/91 |
| cost | 12/91 | 12/91 |
| context | 12/91 | 12/91 |
| recent | 12/91 | 12/91 |

Uniform across dims and perturbation sizes → churn is driven by near-zero score margins (median divergence gap 0.0047), not by weight structure.

**Verdict: weights are currently UNVALIDATABLE.** No evidence-backed tuning is possible; any tuning would be curve-fitting to proxy noise (prohibited: no tune-until-it-looks-right).

## 3. Threshold/floor failure modes exposed by replay

1. **Variant collapse:** per-model evidence + T2 score tie + T6 ASCII → systematic downshift to lexicographically lower variants (45/90 divergences). Threshold design cannot fix this; it needs variant-level evidence or an explicit variant policy (design gap D-VAR).
2. **All-UNKNOWN set:** threshold floors never bind (conf 0 for everyone) → ASCII winner. Design gap D-COLD: recommend all-UNKNOWN → V2.1 ladder head.
3. **Floor enforceability coverage:** with graded evidence absent, capability floors (e.g., security-review review+reasoning ≥ INTEGRATION) can never exclude anyone except via LIVE SSOT results — floors are currently nominal.

## 4. Oscillation threshold

Evidenced-peer margin GLM/MiniMax = 0.0058. A minimum-score-delta hysteresis of 0.02 (or per-session stickiness) is required before any live scoring; without it, expected route flapping between evidenced peers under evidence churn.

## 5. Recommended threshold work before authorization

1. Instrument graded confidence (partial-window attribution) so conf is not bimodal.
2. Re-run this grid with real quality/latency/cost evidence; only then revisit 0.6 and the 0.02 hysteresis constant.
3. Resolve design conflicts C1/C2 (EVIDENCE_AUDIT §2) before any threshold is treated as normative — C2 changes deep-research weighting outright.
