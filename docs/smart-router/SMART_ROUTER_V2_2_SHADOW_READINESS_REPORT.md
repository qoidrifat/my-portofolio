# Smart Router V2.2 — Shadow Readiness Report

Date: 2026-08-29

## VERDICT: SHADOW-READY (mechanism verified) · EVIDENCE NOT YET SUFFICIENT · PROMOTION NOT AUTHORIZED

## State separation (do not collapse)

| State | Status |
|---|---|
| IMPLEMENTED | YES |
| HOST-INTEGRATED | YES (live runtime proof, see HOST_INTEGRATION_REPORT) |
| SHADOW-VERIFIED | YES for mechanism (isolation, correlation, determinism, D-COLD); corpus = 1 live request + tests |
| EVIDENCE-SUFFICIENT | NO |
| PROMOTION-AUTHORIZED | NO |

## Shadow mechanism verified

- **Activation ladder**: OFF (default, fail-safe on absent/corrupt flag file) → SHADOW via `.opencode/smart-router/v22-flags.json`. ADVISORY/OPTIMIZED untouched.
- **Isolation**: shadow selection never dispatched; route object, permission, breaker state, dispatch untouched (tested + live). `shadowZeroInfluence: true` is structural (flags.ts type).
- **Cold start (D-COLD)**: all-UNPROVEN → V2.1 ladder head, live-verified twice (CLI: glm#max; host: minimax#deep = v21 route, no divergence). ASCII-winner bug fixed pre-verification.
- **Breaker interplay**: OPEN candidate excluded by gate (D4); shadow never resurrects or mutates breaker state.
- **Determinism**: ×5 identical inputs → identical decisionId + selection + explanation.
- **Replay-2**: live shadow records parse, run, classify (`no-divergence` after fix); duplicate lines yield both rows (append-only, consumer-side dedup); outcomes stay UNKNOWN unless observed in evaluation store (honesty rule).
- **Fail-open**: telemetry/store failure → swallowed + degraded counter; V2.1 continues.
- **Privacy**: live stores scanned — no prompt/part content, no secret-shaped keys; only ids, enums, epoch timings, token/cost numbers.

## What shadow readiness does NOT claim

- No claim that V2.2 selections are better/worse than V2.1 (counterfactuals remain UNKNOWN — no observed outcomes on divergent routes).
- No validated thresholds: H = 0.02 stays PROVISIONAL; EWMA/p50/p95 latency metrics implemented but unvalidated (ADR-017).
- No cost claims: host cost relayed where present; absent → UNKNOWN (null), never 0/FREE.
- No capability claims beyond runtime-verified variants; vision stays BLOCKED.

## Collection window (next phase, human-gated)

Accumulate shadow corpus across diverse task classes (routine coding, review, security review, research) before re-evaluating G3–G7 and G9/G11 per IMPLEMENTATION_GATE. Current live corpus (1 request) is evidence of mechanism, not of behavior quality.

Machine-readable evidence: `.opencode/ai/verification/v22-host-integration/`.
