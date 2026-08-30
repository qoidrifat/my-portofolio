# Smart Router V2.2 — T1 Lifecycle Verification

Date: 2026-08-30
Scope: runtime verification only (no implementation changes)
Baseline: v2.2.0-shadow.1 (2c2bace) + protocol 41ec861; HEAD 061fe13

## Question

Does the real OpenCode lifecycle produce a valid T1 evaluation event for a completed
execution, and does that event converge with T2 into the canonical evidence chain
without manual intervention?

## Verdict

**T1 WORKING — CASE A CONFIRMED.** T1 is emitted by the plugin `dispose` hook, i.e.
during the OpenCode host disposal/evaluation lifecycle. It is absent while a session's
server process is alive, and appears after normal disposal. No defect found.

## Baseline (Phase 0)

| Check | Result |
|---|---|
| git status | clean |
| npm test | 303/303 PASS (18 files) |
| npm run typecheck | PASS |
| npm run lint | PASS |
| npm run build | PASS |

Tag `v2.2.0-shadow.1` resolves to 2c2bace (annotated tag); HEAD 061fe13 = tag + protocol
41ec861 + epoch-start commit.

## T1 Trigger (Phases 1–2)

Exact call path:

```
OpenCode host process shutdown
→ plugins/smart-router.ts:281   dispose hook
→ evaluate(SIGNALS)             V2.1 post-turn evaluator → EvaluationResult
→ v22.onDispose(result)         v22/host.ts:430
→ trackOf(lastSessionId)        last chat session of the plugin instance
→ emitEvaluation(...)           v22/wire.ts:84
   → evaluationId = EVAL-${executionId}      wire.ts:95 (deterministic per executionId)
   → signalId    = SIG-EVAL-${executionId}   wire.ts:96
   → emitT1      → .opencode/ai/telemetry/v22/t1.jsonl   telemetry.ts:53
   → if attributable() → EvaluationStore.record(signal)  wire.ts:120
```

Trigger condition: plugin `dispose` — OpenCode server disposal, NOT session end or turn
completion. Hook presence verified in installed host types:
`.opencode/node_modules/@opencode-ai/plugin/dist/index.d.ts:174`
(`Hooks.dispose?: () => Promise<void>`).

Per-session note: `SessionTrack` is keyed by sessionId, so one T1 fires per session at
dispose (the last execution's track). Earlier cancelled executions of the same session
remain evaluation-less audit rows by design (see Phase 11 below).

## Runtime Evidence (Phases 3–7)

Run 1 — interactive session `ses_fadc4c136ffeLP2FMg7NvFp4rX` (the session from the task
brief) was normally disposed after the brief was written:

- T2 COMPLETED `exec-8f929a43` @ 10:33:50Z; T1 @ 10:39:27Z (post-dispose)
- `evaluationId=EVAL-exec-8f929a43-…`, `attributionComplete=true`, grade 1

Run 2 — new headless session (`opencode run`, read-only task, nothing modified),
`ses_fadad99bbffegiSoDZMXa9xFw3`, completed normally and exited:

- T2 COMPLETED `exec-11afc878` @ 10:58:56Z (in-flight)
- T1 @ 10:59:57Z **after child process exit** → headless `opencode run` invokes plugin
  dispose on normal exit. `evaluationId` populated, `attributionComplete=true`.

Before-dispose (live session `ses_fadbddd50ffeVgIM3Ab3mpkadn`): T2 present, T1 absent —
consistent with the design; not a failure.

## Convergence / Attribution / Store (Phases 7–9)

Read-only probe (temp `.mts`, `file:///` ESM import) loads the REAL
`evaluation-signals.jsonl` through `EvaluationStore` and prints the store's own merge
view. Final state:

| executionId | signals | outcome | evaluationId | converged |
|---|---|---|---|---|
| exec-936f748b | 1 | CANCELLED (user) | "" | no — audit row |
| exec-8f929a43 | 2 | COMPLETED | EVAL-exec-8f929a43 | **yes** |
| exec-a674b57c | 1 | COMPLETED (live) | "" | pending dispose |
| exec-11afc878 | 2 | COMPLETED | EVAL-exec-11afc878 | **yes** |

Store stats: total 6, attributed 2, incomplete 2, conflicts 0.
Out-of-order convergence (T2 first with `evaluationId:""`, late T1 completes it) works
exactly as specified; no stale duplicate rows block convergence; store identity is
canonical (unqualified modelId in store, qualified in telemetry — CRITICAL-1 holds).

Full attribution chain (sessionId → routeId → executionId → candidate → taskClass →
evaluationId) is COMPLETE for both converged executions.

## Quality Aggregation Eligibility (Phase 10)

Converged evidence is accepted and counted (`attributed=2`, `completed=2`), but produces
no aggregate rows: n=1 per candidate < VARIANT_MIN_N=5 (quality), < 5 (recent-success
window), < 5 (reliability). Correct gating — evidence accepted, influence withheld until
n≥5. This matches the protocol expectation ("evidence is accepted correctly", not "score
useful at n=1").

## User Cancellation Negative Control (Phase 11)

`exec-936f748b` (CANCELLED, `userCancel=true`, `errorClass=user-cancellation`) remains
stored untouched, contributes to `failureBreakdown.user` nothing (it is an incomplete
audit row), and never penalizes model quality. PASS. No files modified.

## Second Session Evidence Visibility (Phase 12)

Session 2's shadow decision (10:58:47Z) ran with the store loaded from disk (host.ts:141,
contains session 1's converged signals) and persisted hysteresis continuity
(`stickinessApplied=true`, `status=SHADOW`, `divergent=false`). Evidence visible;
influence correctly gated at n<5 (tier UNPROVEN). No candidate replacement required.

## Host Lifecycle / Defect (Phases 13, 16–17)

No missing T1 remains to explain: two independent lifecycle paths (TUI disposal, headless
run exit) both produced real T1 + convergence. `HOST LIFECYCLE: VERIFIED`.
Runtime defect: **NO** → no regression test added (existing coverage already exercises
this boundary: `tests/smart-router/v22-host-integration.test.ts:101,171,339`,
`tests/smart-router/v22-wave2-evidence-loop.test.ts:129`). No code changes.

## Security (Phase 18)

`V2.1=ADVISORY actual authority, permissions STANDARD; V2.2=SHADOW only;
shadowZeroInfluence=true (type-literal, flags.ts:14); OPTIMIZED=OFF; AUTO=OFF.`
Live shadow deltas show `v22.selected == v21 route` (divergent:false). No permission,
breaker, hard-deny, or routing path touched. PASS.

## Determinism (Phase 19)

2 independent lifecycle runs → identical T1 behavior. Not ambiguous → third repeat not
required. PASS.

## Regression (Phase 20)

No implementation change was made; Phase 0 full suite stands as the regression evidence
(303/303 + typecheck + lint + build). Wave 1/Wave 2/host-integration/identity suites are
included in the 303.

## Gates (Phase 21)

- **G3 (attribution): PASS (mechanism verified)** — 2/2 completed executions converged
  with complete chains in real runtime.
- **G4 (outcome): PARTIAL** — corpus n=2; aggregation thresholds require n≥5. Mechanism
  verified ≠ corpus sufficient.
- **Promotion: NOT AUTHORIZED** (unchanged).

## Artifacts

`.opencode/ai/verification/v22-t1-lifecycle/`:
`preflight.json`, `t1-observation.jsonl`, `probe-baseline.txt`,
`before-dispose.json`, `after-dispose.json`, `t1-t2-convergence.json`,
`evaluation-store-state.json`, `second-session-evidence.json`,
`security-results.json`, `determinism-results.json`,
`probe-after-second-session.txt`.

## Next Step

ORGANIC CANARY CHECKPOINT-002, then controlled shadow corpus collection. Do not start
large corpus collection from this task.
