# Smart Router V2.2 — Host Integration Report

Date: 2026-08-29
Route used for the task: `R-62959dea92` (reviewer → host fell back to default primary agent, GLM#max, packet `continuation-1787996112406.json`).

## VERDICT: HOST-INTEGRATED (VERIFIED) · PROMOTION NOT AUTHORIZED

## What was proven at runtime (not just by imports)

| Contract | Proof |
|---|---|
| Plugin lifecycle reach | Live `opencode run` under SHADOW produced `shadow-decisions.jsonl`, `shadow-deltas.jsonl` (chat.message hook) and T1–T4 telemetry (event + dispose hooks). |
| Correlation chain | delta + T1 + T2 + T3 + T4 all carry `executionId = exec-d6b7b321-edec-4d21-adf5-7503482fe6ac`. |
| OFF inertness | `v22 status` → OFF; `v22 shadow` under OFF returns byte-identical passthrough reason; no telemetry written. |
| SHADOW zero influence | V2.1 dispatched its own route (minimaxm3new/MiniMax-M3#deep); V2.2 shadow computed and recorded only. Route object and breaker file byte-unchanged (tested). |
| Fail-open | All host hooks swallow errors; unwritable-root test passes with host contract intact (I-021). |

## Integration surface (additive, observational)

- `.opencode/plugins/smart-router.ts`: `v22?.onEvent(event)` on the event bus (T2 outcome, T3 t2/t3, T4 usage) and `v22?.onDispose(result)` (T1 attribution + T3 fallback). Both wrapped in `try {} catch {}` — fail-open.
- `.opencode/smart-router/v22/host.ts`: THE V2.1↔V2.2 bridge. Shadow compute reads real breaker state (read-only D4); all other evidence stays null (cold-start, ADR-008).
- `.opencode/smart-router/cli.ts`: new `v22 probe` subcommand (T5, outside decision path).
- `.gitignore`: `.opencode/ai/telemetry/`, `.opencode/ai/evidence/`, `.opencode/ai/verification/` added (runtime state).

## Fixes applied during integration (auto-fix scope: allowed)

1. **D-COLD ASCII-winner bug** (`v22/scoring.ts`): all-UNPROVEN cold start returned `ranked` alphabetically sorted while `applyProbeRule` selects `ranked[0]` — ladder head was bypassed for an ASCII winner (I-017 violation). Fix: D-COLD orders `ranked` with the head first.
2. **Replay double-qualification** (`v22/replay.ts`): `candidateIdOf` produced `b-ai/b-ai/model#variant` because `v21Route.modelId` is already provider-qualified — every record misclassified as divergent (`cold-start-artifact`). Fix: never re-qualify.
3. **Test/schema mismatch** (`tests/smart-router/v22-host-integration.test.ts`): T2 rows follow the `Attributed` flat schema (`modelId`), not a nested `candidate` object. Test corrected — schema unchanged.
4. Determinism test raised ×3 → ×5 (Phase 25 minimum).

## T3/T4/T5 wiring status

- **T3**: t0 (chat.message), t1 (chat.params), t2 (first `message.part.updated`), t3 (`message.updated` completed) captured on a real request; ttfr + completion derived; missing window → null + `missingReason` (never substituted). p50/p95/EWMA(α=.3)/recent-20 computable but **not validated at scale** (ADR-017). Host limitation: t2 requires streaming part events.
- **T4**: host tokens + host cost relayed with `pricingSource: opencode-host`; no host cost → `effectiveCost: null` + `pricingSource: null` (UNKNOWN never becomes 0). No price table invented.
- **T5**: `v22 probe` emitted 10 INTEGRATION records for runtime-verified variants (dimension: reasoning). Vision NOT probed — remains BLOCKED (I-005).

## Regression

222/222 PASS (197 prior + 25 new host-integration), lint PASS, typecheck PASS, build PASS. V2.1 test loss: 0. V2.1 source changes: 0 (plugin additions are additive and fail-open).

Machine-readable evidence: `.opencode/ai/verification/v22-host-integration/`.
