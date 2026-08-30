# SMART ROUTER V2.2 — SHADOW CORPUS RUN REPORT (OPERATIONAL)

Epoch: `v2.2.0-shadow.1-260830-001` · Date: 2026-08-30 · Status: **ACTIVE — 0 organic records yet**
This is an operational report, NOT a promotion report. No superiority claim, no sufficiency claim.

## Baseline binding (verified this session)

```text
implementation: v2.2.0-shadow.1 → 2c2bacecf9805cdd32df28ccecf59c0f41d74748 (parent fca4f595… = v2.1.0)
protocol: 41ec861f6f4be659b47f1d4a578070242d184534 → v1.0.1 amendment 702a01b (epoch id format)
source manifest: 42/42 recomputed PASS
gates: 303/303 tests · typecheck · lint · build — all re-run PASS this session
```

## Pre-baseline quarantine (Phase 3)

7 runtime files (t1–t5.jsonl, shadow-decisions.jsonl, shadow-deltas.jsonl; 2026-08-29 development artifacts) archived to `.opencode/ai/verification/v22-shadow-corpus/pre-baseline/` with SHA-256 manifest, classification `PRE_BASELINE_DEVELOPMENT`. Contents unmodified. Official stores initialized empty; zero pre-baseline records in the epoch.

## Canary (Phase 40) — PASS

- **Wire-path (temp dir, createHostV22 SHADOW):** one complete flow → shadow-decisions.jsonl (chain + requirement + v21 route + candidate set + explicit evidence gaps), shadow-deltas.jsonl, evaluation-signals.jsonl (`attributionComplete: true`, canonical candidate `minimaxm3new/MiniMaxAI/MiniMax-M3#deep`), T1/T2/T3/T4 telemetry (written=4, degraded=0). Official stores untouched. Full records: `canary-evidence.json`.
- **Determinism ×2 (CLI `v22 shadow`, identical prompt):** byte-identical output; D-COLD anchor == V2.1 route; `degradedToV21=false`; replay-consistency evidence (Phase 43).
- Counterfactual integrity: shadow records hypothetical selection only; no outcome claims anywhere in stores.
- T2/T3 explicitly record environment flags and `missingReason` (t2-unobservable path verified earlier: `no-completion-observed`) — UNKNOWN+reason discipline holds.

## Collection mechanism (honest scope statement)

Host sidecar engages at **plugin load time** (`loadFlags` once; flags absent → OFF → no host). Therefore in-session engagement is impossible; `v22-flags.json` (gitignored, local) is now set to `SHADOW` and **every new opencode session** will construct the V2.2 host sidecar and append organic records (shadow decisions/deltas + telemetry + evaluation signals) while V2.1 remains the sole dispatch authority. Organic canary validation of the first real record happens at the next checkpoint.

## State at checkpoint-001

```text
organic records: 0   synthetic canary records: 1 (temp dir, excluded from epoch aggregates)
invalid: 0   duplicates: 0   fatal violations: 0
warnings: no organic traffic yet in this session (expected; session started before flags)
coverage seen (canary only): standard-coding / routine-coding / medium / minimaxm3new/MiniMaxAI/MiniMax-M3#deep
UNKNOWN rate: n/a until organic records exist
```

## Safety (Phase 24/35)

OPTIMIZED=OFF, AUTO=OFF, vision=BLOCKED, `shadowZeroInfluence=true`, V2.1 = actual authority, V2.2 = shadow only. Zero production influence observed. Promotion NOT AUTHORIZED. Statistical sufficiency: HUMAN APPROVAL REQUIRED.

## Retention (Phase 33)

All corpus artifacts 30 days (telemetry sweep via `v22 sweep`; stores under gitignored runtime dirs). Artifacts in `.opencode/ai/verification/v22-shadow-corpus/` are metadata (preflight/epoch/canary/checkpoint/quarantine manifests), committed for audit trail; they contain no corpus records.

## Artifacts

`preflight.json` · `epoch.json` · `canary.json` · `canary-evidence.json` · `runtime-health.json` · `corpus-checkpoint-001.json` · `pre-baseline/quarantine-manifest.json` (+ `corpus-config.json`, protocol v1.0.1)

## Next

Let real opencode sessions accumulate organic shadow records; checkpoint periodically (Phase 28/42); apply stop conditions (Phase 37); after sufficient organic coverage → human review of sufficiency → Replay-2 → G3–G7 evidence review. The most valuable result may be "V2.2 does not outperform V2.1" — no tuning during collection; any tuning = new baseline + new epoch.
