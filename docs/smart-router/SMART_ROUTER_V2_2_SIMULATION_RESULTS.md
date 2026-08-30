# Smart Router V2.2 — Offline Replay & Scoring Simulation Results

Date: 2026-08-29 · Engine: `.opencode/ai/verification/v22-simulation/replay.mjs` · Machine output: `simulation-results.json` (same dir).
Corpus: 146 routing-decision records (V2.1.0 baseline + this validation session), read-only.

## 1. Replay construction

- Candidates per decision = V2.1's own eligible set (primary + fallback ladder). No invented candidates.
- Gates: vision-task BLOCKED; UNSUPPORTED variants (GLM#xhigh, hy3#max, mimo#max) excluded; breaker closed at record time (chaos states out of corpus, noted).
- Evidence applied: harness latency/pass proxy (per model, n≥3/5). All other dims UNKNOWN → prior 0.5, conf 0, weight renormalization (design §6.4).
- Class mapping: 8 V2.2 classes; `standard-coding`/`crud-simple` → `routine-coding` (flagged approximation, C4); unmapped classes → V2.1 fallback (design §"unprofiled").

## 2. Headline results

| Metric | Value |
|---|---|
| Route decisions replayed | 107 |
| BLOCKED (vision) | 2 — V2.2 agrees by gate |
| Unprofiled → V2.1 fallback | 14 — V2.2 agrees by construction |
| Profiled decisions | 91 |
| V2.2 pick == V2.1 pick | **1 (1.1%)** |
| Divergence | **90 (98.9%)** |
| Determinism (double run) | identical ✓ |

## 3. Divergence drivers (the finding that matters)

| Driver | Count | Median score gap | Interpretation |
|---|---|---|---|
| `variant-ascii-tiebreak` | 45 | 0 | Per-model evidence cannot separate variants of the same model → T6 ASCII prefers lexicographically lower variants (`#high` < `#max`, `#balanced` < `#deep`). **ASCII ordering is the de facto variant policy.** |
| `proxy-noise-swap` | 43 | 0.0047 | Model swaps between harness-evidenced peers (GLM vs MiniMax) decided by 13 ms vs 31 ms decision-path durations normalized against 120 s — margin below any meaningful threshold. |
| `evidence-availability-bias` | 2 | ~0.5 | Unevidenced candidates always lose to evidenced ones regardless of task fit. |

**Conclusion:** divergence is dominated by evidence *shape* artifacts (per-model-only proxy + ASCII tie-break), not by demonstrated quality differences. With counterfactual = UNKNOWN for all 90, no performance claim is possible in either direction.

## 4. Stability & sensitivity

- Weight ±10% / ±20% per dim: uniform churn **12/91 (13.2%)** for every dimension — churn tracks near-zero margins, not dimension importance. Weight tuning is meaningless until real per-dim evidence exists.
- Confidence thresholds .5/.6/.7/.8: floor-enforceable set identical (**76/91**) at every level — conf is bimodal (0 or 1) in current evidence → thresholds empirically indistinguishable.
- Oscillation: evidenced peers GLM/MiniMax margin **0.0058** (< 0.02) → oscillation risk REAL under live evidence churn. Guard required: hysteresis min-delta 0.02 or session route stickiness (design amendment for ADR-001 follow-up). Unevidenced-peer margin 0.4999 (stable, trivially).

## 5. Micro-simulations

- **Cold start:** all-UNKNOWN eligible set → winner = ASCII-first candidate (`a/a#max` in synthetic test). Design gap: ADR-008 does not specify all-UNKNOWN behavior → recommendation: all-UNKNOWN set → V2.1 ladder head. Unknown inserted among evidenced candidates: never wins (good), ranks last by T2' conf ordering (acceptable).
- **Failure feedback:** F12 (env) attribution → 0 window movement; F04 (reasoning) → bounded 1/20. Runaway suppression holds by construction.
- **Adversarial:** single event ≤ 1/20 window effect; no amplification path in 50/50 blend at current conf levels.

## 6. Security invariant replay (P18) — all PASS

| Invariant | Result |
|---|---|
| Hard denies untouched (no policy mutation in replay) | ✓ |
| Permission-layer independence (I-003) | ✓ by construction (replay never invokes permission layer) |
| OPEN circuit selected | 0 |
| UNSUPPORTED variant selected | 0 |
| Vision routed | 0 |
| YOLO bypass | 0 |

## 7. Fallback simulation (P19)

Scorer disabled → route = V2.1 pick for 107/107 (100%). Degraded mode is exactly V2.1. ✓

## 8. Honest summary

The replay does **not** validate V2.2 scoring quality — it validates its *failure modes under missing evidence*: variant collapse to ASCII order, proxy-noise model swaps, inert cost/context dims, uncalibratable thresholds. Security behavior is clean and determinism holds. These are pre-authorization findings, not blockers to the design itself; they define what instrumentation must exist first.
