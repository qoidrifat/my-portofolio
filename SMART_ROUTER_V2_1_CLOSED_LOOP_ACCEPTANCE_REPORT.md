# SMART ROUTER V2.1 — CLOSED-LOOP ACCEPTANCE REPORT

Date: 2026-08-29 · Executed live on OpenCode **1.18.25** (Windows, pwsh 7, Node v24.15.0)
Baseline: PAT 2026-08-28 (`SMART_ROUTER_V2_PRODUCTION_ACCEPTANCE_REPORT.md`) — CONDITIONAL ACCEPTANCE, 119/119.

---

```text
==================================================
SMART ROUTER V2.1 CLOSED-LOOP ACCEPTANCE
==================================================

Overall:
ACCEPTED

Circuit Breaker Integration:
PASS

Breaker → Model Router:
WIRED

Per-model Attribution:
VERIFIED

Dynamic Fallback:
PASS

All-Circuits-Open Block:
PASS

Half-Open Recovery:
PASS

chat.params Clamp:
HOST-LIMITED

Route-level Clamp:
PASS

Agent Identity:
THREADED

Security:
PASS

Determinism:
PASS

Observability:
PASS

Regression:
138/138 PASS

Lint:
PASS

Typecheck:
PASS

Build:
PASS

Live Runtime:
PASS

Remaining Limitations:
...

Artifacts:
...

Final Architecture Assessment:
...
```

---

## 1. Scope Compliance

Only the three mandated workstreams were implemented. No vision changes, no routing-policy edits, no breaker replacement, no new abstractions.

| Workstream | Change | Files |
|---|---|---|
| A — breaker→routing | `testRouteable` consults `breakerStatus` per candidate (after registry/static availability, before variant resolution); exclusions collected + logged; escalation ladder/fallback-chain walks also breaker-aware | `model-router.ts`, `router.ts`, `escalation.ts`, `cli.ts`, `plugins/smart-router.ts` |
| B — chat.params live verification | Every `chat.params` invocation now logged (`kind: "chat.params-invoke"`) + controlled live probes | `plugins/smart-router.ts` |
| C — agent identity threading | `chat.message input.agent` → session state → `permission.ask` / `tool.execute.before` decisions + logs; missing session → `"build"` (previous behavior) | `plugins/smart-router.ts` |
| — | `ROUTER_VERSION` 2.0.0 → 2.1.0 | `config.ts` |

Version delta: 119/119 → **138/138** (+12 breaker-routing, +7 agent-threading), 0 failures.

## 2. Workstream A — Evidence

**Eligibility contract (A2).** `testRouteable` now returns a per-candidate availability decision derived from `breakerStatus(projectRoot, modelId)`:

- `state === "open"` → `CIRCUIT_OPEN` → candidate removed **before** primary/fallback selection.
- `state === "half_open"` → probe permitted (`isAvailable` semantics unchanged; cooldown-elapsed probe is the permitted probe behavior; a failed probe re-opens via `recordFailure`).
- no entry / `closed` → eligible. No-entry = UNKNOWN → follows the existing safe default (eligible), which is the architecture's established pre-v2.1 behavior — not a silent new assumption.

**Granularity (A3).** Circuit key = full registry id `provider/model` (e.g. `b-ai/glm-5.3-flash`). One model's open circuit provably does not affect unrelated models (test: GLM open → `standard-coding` still routes M3; `architecture-analysis` routes Qwen). **VERIFIED.**

**Filtering position (A4).** Pipeline inside `resolveModelRoute`: policy candidates → registry/capability/vision filter → **circuit availability filter** → variant constraints → eligible candidates → deterministic ranking (policy order) → primary + fallback list. An OPEN candidate can never become the final route.

**Fallback semantics (A5).** Exclusion happens in the same candidate loop, so the chain walks dynamically: `GLM open → DeepSeek#max`, `GLM+DeepSeek open → Qwen#max`, all open → `BLOCKED`. No retries, no oscillation (candidates visited exactly once).

**Failure attribution (A6).** `resolveRoute` writes one `breaker-exclusion` JSONL record per excluded candidate (`timestamp, kind, routeId, sessionId, candidate, provider, model, breakerState, reason, route, result`) to `routing-decisions.jsonl`. Reconstructed live (artifact `breaker-live-acceptance.json` step 7).

**Plugin attribution feed.** `session.error` now records the failure against the session's live model key (`provider/model` from session state) instead of the global `"session"` key (fallback to `"session"` when unknown); successful bash turns record success against the same per-model key. A `breaker-failure-recorded` log line makes every recorded failure reconstructable.

**Escalation.** `validateLadderStep(registry, step, projectRoot?)` additionally rejects breaker-open steps; `nextEscalationRoute` threads `projectRoot` through both the ladder climb and the fallback-chain walk. CLI `escalate` passes `PROJECT_ROOT`. Breaker state can no longer be bypassed by the escalation path.

**Live acceptance (the critical new test).** `breaker-live-acceptance.mjs` executed live:
1. baseline route: `b-ai/glm-5.3-flash#max`, routeId `R-62959dea92`
2. breaker forced OPEN (3 controlled failures) → `state=open, available=false`
3. route re-issued → `b-ai/deepseek-v4-flash#max` with warning `circuit-open: 'b-ai/glm-5.3-flash' excluded from routing` — **primary never selected after exclusion**
4. fallback **executed live** (`opencode run --model b-ai/deepseek-v4-flash --variant max`) → real output observed
5. breaker reset → `closed`
6. route re-issued → primary `glm#max` eligible again
7. `breaker-exclusion` record reconstructed from logs (full field set above)

**Regression matrix (all in `tests/smart-router/breaker-routing.test.ts`, 12/12):** closed→eligible; open→excluded before selection; multiple open→next available; all open→BLOCK; unrelated model unaffected; half_open probe permitted then success→closed→eligible; open circuit does not change permission profile/hard denies/agent; exclusion log record reconstructable; determinism (identical breaker state → identical decision + routeId); escalation ladder skips open steps; escalation reaches closed fallback entry.

## 3. Workstream B — Evidence (B1–B4)

Live probes (`opencode run`, plugin active, every `chat.params` invocation logged — new instrumentation):

| Probe | chat.params fired | `options.reasoningEffort` seen | Clamp needed/fired |
|---|---|---|---|
| no variant (baseline) | YES | absent | no |
| `--variant high` | YES | `high` | no (valid) |
| `--variant max` | YES | `max` | no (at verified ceiling) |
| `--variant xhigh` | YES | **absent** | n/a — host dropped it pre-hook |

**Findings:**
- The hook **genuinely fires live** on every LLM request, including the `title` subagent request (observed: `agent=title`, `reasoningEffort=low`) — 12+ live firing records in `smart-router.jsonl`.
- `input` exposes `agent`, `model`, `provider`; `output.options` is mutable (type-verified against installed `@opencode-ai/plugin` 1.18.25).
- **xhigh never reaches the hook.** SSOT `opencode.jsonc` defines only `low|high|max` for b-ai models; the host normalizes an unknown `--variant xhigh` **before** `chat.params`, so no effort key is present and nothing is dispatched. B.AI + xhigh cannot be constructed through the host with the current SSOT.
- **Verdict: HOST-LIMITED (Outcome B)** — the clamp *mutation* path is unreachable via host variant resolution, not because the hook fails (it fires). The clamp remains as defense-in-depth above the **LIVE VERIFIED route-level clamp** (`variant-router.ts` clamps xhigh→max before selection; PAT Phase 7 evidence preserved; regression tests unchanged and passing). No regression from the verified safe state (B4).

## 4. Workstream C — Evidence (C1–C4)

- **C1 (types, verified):** SDK `Permission` carries **no** agent field → `permission.ask` cannot receive agent natively. The host **does** expose agent at `chat.message` (`input.agent?`) and `chat.params` (`input.agent`, live-observed values: `build`, `title`).
- **C2 (implemented):** threading `chat.message input.agent` → session state (`currentRoute.agent`) → `permission.ask` + `tool.execute.before` decisions. This is not fabrication: the threaded value is the host-reported agent for the session; unknown session falls back to `"build"` (exact previous behavior). Decision logs now carry `agent` + `agentSource: "session-threaded"`.
- **C3 (documented host limitations, discovered live):**
  1. The host config defines no `reviewer`/`research`/`frontend` primary agents (only an `explorer` subagent) → `--agent reviewer` is silently defaulted by the host, so a live reviewer-deny via the agent flag is not demonstrable. Read-only force therefore remains enforced where PAT verified it: route layer + policy (`profileForAgent`), unchanged.
  2. `permission.ask` was never invoked live in this environment (host auto-allows edits/bash writes; 0 hook entries vs 7 `tool.execute.before` guard entries in the permission log). The live enforcement layer for shell mutations is the guard, which now receives the threaded agent.
- **C4 (security, test-verified 7/7):** reviewer/research sessions → write/bash-mutation denied (`agent-readonly`); build session → unchanged; unknown session → unchanged (never weaker); **hard deny remains absolute for any threaded agent** (`git reset --hard` denied for reviewer and build alike).

## 5. Cross-Cutting Verification

- **Determinism:** identical prompt + policy + breaker state → identical decision fields and routeId (R-62959dea92 stable vs PAT). Circuit state changes eligibility deterministically; introduces no randomness. Test-enforced.
- **Security / Permission independence:** breaker exclusion does not touch `resolvePermission` inputs (test: open circuit → same `standard` profile, same hard denies, same `reviewer` agent). Hard deny > availability ordering preserved: hard denies evaluate first inside `resolvePermission` and the `tool.execute.before` guard is mode-independent.
- **Live security regression (executed live, twice):** `git reset --hard` attempt via real `opencode run` → `SMART-ROUTER HARD DENY [git-reset-hard]` thrown, command never executed, HEAD `ce47b9d` unchanged, working tree intact — under standard mode **and** under live YOLO mode (restored to standard afterwards; `e2e-evidence.json`).
- **Escalation E2E (live):** provider-failure walk `GLM#max → GLM#high → DeepSeek#max → Qwen#max → BLOCK at attempt 4` — identical to PAT behavior now with breaker-aware step validation.
- **Golden E2E (live):** `dispatch` → M3#balanced, continuation packet written, `dispatchCommand` emitted.

## 6. Regression

| Check | Before | After |
|---|---|---|
| Test suite | 119/119 | **138/138** (+19, 0 failures) |
| lint | exit 0 | exit 0 |
| typecheck | exit 0 | exit 0 |
| build | exit 0 (52 files) | exit 0 (52 files, 726.2 KB JS — unchanged) |
| Golden / Escalation / YOLO / Live runtime E2E | PASS (PAT) | PASS (re-executed live, §5) |

## 7. Remaining Limitations

1. **chat.params clamp = HOST-LIMITED.** Unreachable via host variant resolution with current SSOT (host normalizes unknown variants pre-hook). Retained as defense-in-depth; route-level clamp is the live-verified layer.
2. **No reviewer/research primary agents in host config.** Per-agent read-only force at the permission layer cannot fire live; route-layer + policy enforcement (PAT-verified) remains the active control. Adding host agent definitions is a separate, out-of-scope change.
3. **permission.ask never invoked by host** for auto-allowed operations — threading reaches it when it does fire (unit-verified), but the guard (`tool.execute.before`) stays the live shell-enforcement layer.
4. **Regex-layer hard-deny evasion** (PAT MEDIUM) — unchanged, out of scope.
5. **Half-open probe = implicit.** Routing treats half_open as available; the "probe" is the real provider call. If the probe fails, the breaker re-opens and the next routing decision excludes the model. There is no dedicated synthetic probe mechanism (none existed; none added — change minimization).
6. **Breaker attribution depends on session state.** `session.error` for a session with no recorded route falls back to the legacy `"session"` key (global, conservative: opens the fallback-eligible gate only for that key, which routing never selects — no availability impact on model keys).

## 8. Artifacts

- `.opencode/ai/verification/pat-v2.1-2026-08-28/`
  - `baseline.json` — Phase 0 record
  - `breaker-live-acceptance.mjs` + `breaker-live-acceptance.json` — the live fallback-due-to-breaker E2E
  - `chat-params-probe.json` — WS-B machine-readable evidence
  - `agent-identity-probe.json` — WS-C machine-readable evidence
  - `e2e-evidence.json` — escalation walk, golden dispatch, YOLO hard-deny denies
- Tests: `tests/smart-router/breaker-routing.test.ts` (12), `tests/smart-router/agent-threading.test.ts` (7)
- Code: `model-router.ts`, `router.ts`, `escalation.ts`, `cli.ts`, `plugins/smart-router.ts`, `config.ts`
- Live logs: `.opencode/ai/routing/routing-decisions.jsonl` (`breaker-exclusion` records), `.opencode/ai/logs/smart-router.jsonl` (`chat.params-invoke`, `breaker-failure-recorded`), `.opencode/ai/permissions/permission-decisions.jsonl` (agent-threaded guard denies)

**Reproduction:** `npm test`; `node .opencode/smart-router/cli.ts breaker --action status --key b-ai/glm-5.3-flash`; `$env:SMART_ROUTER_PROJECT_ROOT=<root>; node .opencode/ai/verification/pat-v2.1-2026-08-28/breaker-live-acceptance.mjs`.

## 9. Final Architecture Assessment

The loop below is now closed **with runtime evidence at every edge**:

```text
PROMPT → CLASSIFY → RISK → AGENT → MODEL → VARIANT → PERMISSION → EXECUTE
  → OBSERVE → EVALUATE → FALLBACK / ESCALATE → CIRCUIT STATE → ROUTING ELIGIBILITY → NEXT DECISION
```

What changed vs PAT: the failure observation edge (`session.error`/evaluator) now **writes** per-model circuit state, and the model/variant selection edge **reads** that state before every decision. The previously open edge — "breaker observes failures but routing ignores them" — is closed: a circuit opened by real or controlled failures demonstrably removes the candidate from the next routing decision (live E2E, §2), and the exclusion is logged for reconstruction. Failure information now flows around the full loop and constrains the next decision — that is a closed-loop runtime control system in the engineering sense (state-dependent feedback control), not by terminology: each arrow is backed by a live probe or a targeted test, and the loop's new edge fails safe (corrupt/missing breaker state → closed → prior behavior; guard/permission failures → ASK/deny defaults, never silent allow).

Honesty boundary preserved: ADVISORY mode still has no auto-executor (dispatch is applied via `opencode run` by the operator/agent, as in PAT); escalation remains continuation re-dispatch, not in-flight mutation; vision remains BLOCKED.

**Verdict: ACCEPTED** — closed-loop reliability control achieved with the smallest verifiable change; all pre-existing security guarantees re-verified live and retained.
