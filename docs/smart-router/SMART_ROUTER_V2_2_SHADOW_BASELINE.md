# Smart Router V2.2 — Shadow Baseline (v2.2.0-shadow.1)

Date: 2026-08-30
Tag: `v2.2.0-shadow.1` (annotated)
Parent commit: `fca4f595d4c1344c901f544093efcee93584d5b9` (tag `v2.1.0`)
Baseline mode: **OFF** (repo state). No flags file is committed; SHADOW was engaged locally via a temporary uncommitted flags file during smoke and removed after.

## Purpose

Immutable, reproducible reference point for all future V2.2 corpus collection and optimization work. This baseline freezes the exact V2.2 host-integrated, closed-loop, security-bounded implementation whose verification evidence is summarized below. Nothing in this document authorizes production optimization.

## Frozen State

- V2.1 remains the sole dispatch authority; `v2.1` behavior unchanged from tag `v2.1.0`.
- V2.2 is observational-only in every shipped mode. It cannot dispatch a production model, cannot mutate permission, cannot mutate breaker, cannot change security settings. Enforcement: `host.ts` observational sidecar (I-021 fail-open, ZERO PRODUCTION INFLUENCE), OFF-mode constructs no host, CLI `v22 shadow` is compute+print only. Evidence: `v22-host-integration.test.ts` (25 tests), `v22-wave2-evidence-loop.test.ts` (38 tests), release-hardening (6 tests).
- CRITICAL-1 (store identity) is CLOSED. DeepSeek re-review verdict: APPROVED (`SMART_ROUTER_V2_2_CRITICAL_1_REREVIEW.md`).
- Open findings (documented, non-blocking for shadow baseline): MEDIUM-1 (T1 staleness bypass), MEDIUM-2 (NaN guard on load), MEDIUM-3 (resolveOutcome attribution check), LOW-1..4, INFO-1..3. See `SMART_ROUTER_V2_2_WAVE2_ADVERSARIAL_REVIEW.md` and `SMART_ROUTER_V2_2_CRITICAL_1_REREVIEW.md`.
- H2 degrade for `deep-research` with no floor-verified candidate (floor confidence gate 0.6; n=5 gives 0.33) is by design (C1 V2.1 fallback), documented in Wave 2 review (INFO-3). Not an identity bug.

## Verification Evidence

- Regression: 303/303 tests PASS (18 files) — independently re-run during CRITICAL-1 remediation and re-review.
- Typecheck: PASS (tsc -p ./jsconfig.json && tsc -p ./tsconfig.v22.json). Lint: PASS. Build: PASS.
- Shadow isolation, security, determinism (×5 real-wire), schema integrity: PASS. See `.opencode/ai/verification/v22-shadow-baseline/integrity-results.json`.
- Privacy: telemetry records store route/execution IDs, provider/model/variant, task class, requirement, evaluation and outcome signals, usage/cost — no prompt/part content, no secret-shaped keys. Evidence: `v22-host-integration.test.ts` Phase 27 privacy tests; logger fail-open + secret-redacting (V2.1 `appendJsonl`).

## Smoke Test (shadow cold-start behavior)

Runner: `node .opencode/smart-router/cli.ts v22 shadow` with temporary SHADOW flags; file removed after; mode restored to OFF (verified via `v22 status`, `diagnostics.written: 0`).

| taskClass | v2.1 actual | v2.2 hypothetical | Divergence |
|---|---|---|---|
| standard-coding | minimaxm3new/MiniMaxAI/MiniMax-M3#deep | same | none |
| routine-review | b-ai/glm-5.3-flash#high | same | none |
| deep-review | b-ai/glm-5.3-flash#max | same | none |
| security-review | b-ai/glm-5.3-flash#max | same | none |
| repo-research | b-ai/glm-5.3-flash#max | same | none |
| deep-research | b-ai/glm-5.3-flash#max | same | none |

Verdict: PASS 6/6. D-COLD anchor equals the V2.1 route; all tiers UNPROVEN (empty store); `degradedToV21: false`; zero telemetry writes; zero dispatch influence. Full data: `smoke-results.json` (in `.opencode/ai/verification/v22-shadow-baseline/`).

## Frozen Configuration

- Flags: `.opencode/smart-router/v22-flags.json` (git-ignored, never committed). Default when absent/corrupt: `{ mode: "OFF", shadowZeroInfluence: true }`. Ladder: OFF → SHADOW → ADVISORY → OPTIMIZED.
- Schemas: `schemaVersion: 1` across telemetry envelope, ReplayRecord, host shadow record. Any semantic change requires explicit v1 → v2 versioning.
- Paths: telemetry `.opencode/ai/telemetry/v22/`, evaluation store `.opencode/ai/evidence/v22/evaluation-signals.jsonl`, hysteresis `.opencode/ai/evidence/v22/hysteresis-state.jsonl`, shadow decisions/deltas JSONL under `.opencode/ai/evidence/v22/`. Retention: 30 days.
- Identity: store candidateKey vocabulary is canonical UNQUALIFIED `provider/model#variant` via `parseQualifiedModel`; telemetry T1/T2 modelId remains QUALIFIED (Attributed flat schema) per host-integration contract.
- Full details: `configuration.json` in the baseline verification directory.

## Baseline Artifacts

`.opencode/ai/verification/v22-shadow-baseline/`:

- `baseline.json` — this baseline's machine-readable summary.
- `source-manifest.json` — SHA-256 of all 17 `v22/*.ts` sources, 7 V2.2 test files, 6 integration-wiring files (`.gitignore`, `package.json`, `tsconfig.v22.json`, `cli.ts`, `plugins/smart-router.ts`, `classifier.ts`), and 12 design-contract docs.
- `configuration.json` — flags, schemas, paths, retention, V2.1 baseline pointer, policy task classes, identity contract.
- `smoke-results.json` — cold-start shadow data above.
- `integrity-results.json` — gates, review state, shadow invariants, privacy, determinism, schema integrity, post-smoke runtime state.

Plus prior audit evidence: `.opencode/ai/verification/v22-wave2-review/` (before/after CRITICAL-1 probes, re-review probe, gate logs).

## Rules After Freeze

1. Corpus collection must run from this exact baseline (verify via `source-manifest.json` hashes before starting).
2. Promotion beyond SHADOW (ADVISORY/OPTIMIZED) is **NOT AUTHORIZED** and requires: minimum corpus per class per engine tier, a separately approved promotion review, and updated gates.
3. No scoring-weight, policy-class, schema, or flag-ladder changes without a new baseline and re-review.
4. H2/C1 fallback behavior is part of the frozen contract; do not tune floors without corpus evidence.
5. The tag `v2.2.0-shadow.1` denotes a shadow-readiness baseline only — it does not imply production readiness.
