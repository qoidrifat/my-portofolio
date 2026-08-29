# SMART ROUTER v2 — Final Report

Date: 2026-08-28 · Verified on OpenCode **1.18.25** (Windows, pwsh)

## Executive Summary

Smart Router v2 is fully operational. This session's work: fixed 4 failing tests (2 root-cause bugs), fixed a live false-positive in the secret guard, corrected stale version metadata, fixed the ESLint scope leak that broke `npm run lint`, and re-verified the complete system end-to-end (84/84 smart-router tests, 116/116 total tests, lint/typecheck/build exit 0, live `opencode run` round-trip with the plugin active).

## Detected OpenCode Version

1.18.25 (`opencode --version`; `opencode debug startup` PASS; plugin registered in `opencode debug config`).

## Current Runtime Capabilities

- `chat.message`: classification + routing metadata + session state (read-only; model cannot be mutated in-flight — directive #61 honored).
- `chat.params`: effort clamping to verified ceilings (B.AI never receives `xhigh`).
- `permission.ask` + `tool.execute.before`: permission routing + hard-deny guard.
- `tool.execute.after` / `event`: evaluator signals, circuit breaker.
- Commands: `/router`, `/router-status`, `/router-matrix`, `/router-history`, `/router-explain`, `/router-permissions`, `/auto`.

## Architecture

See `.opencode/FINAL_SMART_ROUTER_ARCHITECTURE.md`.

## Task Classification

Two-stage: deterministic heuristic first; GLM reasoning stage reserved for low-confidence/ambiguous tasks (no LLM call for trivial requests). 18 task classes incl. vision (BLOCKED by design).

## Agent Routing

build / frontend / research / reviewer — all PASS (model-router + integration tests; golden scenario routes research).

## Model Routing

- MiniMax M3 (minimaxm3new): PASS — live round-trip 2026-08-28.
- GLM-5.3 Flash: PASS — VERIFIED variants, golden-scenario route target.
- DeepSeek V4 / Qwen3.8: PASS — VERIFIED registry entries, wired as fallback chains.

## Variant Routing

`xhigh` never sent to B.AI; `hy3`/`mimo` max unsupported; verified `max` selectable; effort clamp logged. Capability tests 7/7.

## Capacity / Quality / Cost / Latency Routing

Profiles supported (`economy|balanced|quality`, `interactive|balanced|deep`) — consumed by model router; defaults balanced.

## Permission Intelligence

safe/standard/elevated/yolo PASS. Precedence: HARD DENY > read-only force > env escalation > gates > profile > ASK. `execute:*` no longer implies file-write (bug fixed).

## YOLO

Toggle verified live (`set-permissions yolo|standard`); hard denies, Git guard, Secret guard remain ACTIVE; production downgrades YOLO. Tests incl. 13 destructive operations denied under YOLO.

## Risk Engine

low/medium/high/critical from task class + production indicators. Tests PASS.

## Fallback

Chains resolved from capability registry; same-model → same-agent → variant → model → provider ordering; unsupported parameters never retried. Tests 14/14.

## Escalation

Evidence-based; live CLI escalation produced GLM#high continuation packet from simulated insufficient result; max 3 reroutes; semantics labeled honestly as automatic re-routing (not in-flight mutation).

## Session Continuity

File-persisted state survives turns/reroutes/restarts; 50-session bound. PASS.

## ZCode

File/git handoff state machine verified 2026-08-27 (`zcode-handoff.log`: full lifecycle to DONE).

## Orca / Herdr / Multica / Cloud

- Orca: adapter E2E pass (2026-08-27, `orca-e2e.log`).
- Herdr: lifecycle probe PASS v0.8.2 (2026-08-27, `herdr-e2e.log`).
- Multica: UNAVAILABLE (no authenticated runtime detected).
- Cloud: LOCAL active; OCI/ALIBABA/VPS not present.

## Windows Hardening

Prompts via `--prompt-file`/stdin avoid argv limits; UTF-8 JSON output; CLI verified under pwsh; long-prompt path documented in `/router` template.

## Test Results / Regression Results

| Check | Result |
|---|---|
| Smart-router suite | **84/84 PASS** (was 80/84) |
| Full project suite | **116/116 PASS** |
| Baseline routing tests | included above, no regression |
| Lint | **exit 0** (was failing: staging-dir scope leak, fixed) |
| Typecheck | **exit 0** |
| Build | **exit 0** (vite + PWA, metrics regenerated) |
| Live E2E | `opencode run` → model "OK" + routing log entries written |

## Failures Repaired (this session)

1. `permission-resolver.ts` — `execute:read-only` in a profile's allow list incorrectly allowed file writes in SAFE mode (`.startsWith("execute")`). Now shell-grants never imply write.
2. `router.ts` — policy loaders crashed with ENOENT on project roots without policy files; now fall back to shipped defaults bundled with the module.
3. `permission-policy.json` — `env-file-read` pattern hard-denied benign commands containing `process.env.` text (live false positive); now matches only real env-file reads (`cat .env`, `rg KEY .env.local`...). All previous denies preserved.
4. `eslint.config.js` — untracked tooling/staging dirs were being linted by `eslint .`, failing CI-style lint. Global ignores added; src rules untouched.
5. Version metadata corrected 1.18.23 → 1.18.25 (status.ts, cli.ts, both policy JSONs).

## Known Limitations

- MiniMax M3 variants are CONFIGURED (registry), not individually runtime-verified against the upstream API.
- No in-flight model switching in OpenCode 1.18.25 — escalation = continuation re-dispatch (honest labeling enforced in output).
- Vision tasks BLOCKED (no verified multimodal backend).
- Multica not present.

## Rollback

Pre-existing backups: `.opencode-backups/`, `%USERPROFILE%\.config\opencode\opencode.jsonc.backup-*`. Plugin can be disabled without removal via `set-mode --value off` or by removing the `plugins/smart-router.ts` file.

## Exact Files Modified (this session)

- `.opencode/smart-router/permission-resolver.ts`
- `.opencode/smart-router/router.ts`
- `.opencode/smart-router/permission-policy.json`
- `.opencode/smart-router/routing-policy.json`
- `.opencode/smart-router/cli.ts`
- `.opencode/smart-router/status.ts`
- `eslint.config.js`
- `src/data/performance-metrics.json` (regenerated by `npm run build`)

## Exact Files Created (this session)

- `.opencode/smart-router/final-status.json`
- `.opencode/FINAL_SMART_ROUTER_ARCHITECTURE.md`
- `SMART_ROUTER_V2_FINAL_REPORT.md` (this file)

(Core system — plugin, 20 modules, 7 commands, 5 test files — was built in earlier sessions and is retained unchanged except the fixes above.)

## Overall

**PASS — VERIFIED AND OPERATIONAL** (mode ADVISORY by default; AUTO/OFF switchable via `set-mode`).
