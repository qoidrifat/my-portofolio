# SMART ROUTER V2.1 — FINAL BASELINE

```text
==================================================
SMART ROUTER V2.1 FINAL RELEASE
==================================================

Release:
v2.1.0

Git Commit:
d8bf7b1 feat(smart-router): finalize v2.1 closed-loop runtime

Tag:
v2.1.0

OpenCode:
1.18.25

Tests:
144/144 PASS

Lint:
PASS

Typecheck:
PASS

Build:
PASS

Chaos:
9/9 PASS

Determinism:
5/5 PASS

Circuit Breaker:
PASS

Dynamic Fallback:
PASS

Recovery:
PASS

Security:
PASS

Observability:
PASS

Continuation:
PASS

Agent Identity:
THREADED / HOST-LIMITED

chat.params:
LIVE FIRED / HOST-LIMITED

Vision:
BLOCKED

Shell Indirection:
NO DEMONSTRATED BYPASS

Release:
READY
```

Baseline date: 2026-08-29 · Release commit: `d8bf7b1` on `main` (parent `ce47b9d`) · Annotated tag: `v2.1.0`

## Release Integrity

- HEAD == `v2.1.0` target commit: PASS (verified after tagging)
- Working tree: CLEAN (all remaining files ignored via `.gitignore` runtime-state/tooling section added in the release commit)
- Tag verified: `git tag --list` / `git show v2.1.0`
- Smoke: `cli health` reports Smart Router 2.1.0 on the tagged tree

## Commit Contents (82 files, +6182/−4)

| Class | Files |
|---|---|
| SOURCE | `.opencode/smart-router/*.ts` (22), `.opencode/plugins/smart-router.ts`, `.opencode/command/*.md` (7), `eslint.config.js` (tool-dir lint ignores), `vite.config.js` (test glob incl. `ts`) |
| POLICY | `.opencode/smart-router/routing-policy.json` (v2.0.0), `permission-policy.json` (v2.0.0, 15 hard denies / 4 gates), `config.json` (shipped defaults: advisory/standard) |
| TEST | `tests/smart-router/*.test.ts` (8 files, 144 tests total incl. 6 release-hardening) |
| DOCUMENTATION | `SMART_ROUTER_V2_FINAL_REPORT.md`, `SMART_ROUTER_V2_PRODUCTION_ACCEPTANCE_REPORT.md`, `SMART_ROUTER_V2_1_CLOSED_LOOP_ACCEPTANCE_REPORT.md`, `SMART_ROUTER_V2_1_RELEASE_READINESS.md`, `OPENCODE_EFFORT_MATRIX_FINAL_REPORT.md`, `SMART_ROUTER_V2_1_FINAL_BASELINE.md` (this file), `.opencode/FINAL_SMART_ROUTER_ARCHITECTURE.md` |
| VERIFICATION ARTIFACT | `.opencode/ai/verification/{pat-2026-08-28, pat-v2.1-2026-08-28, release-v2.1}/` (34 files: probes, machine-readable evidence, chaos matrix + runner, health snapshot) |
| GENERATED (tracked, refreshed) | `src/data/performance-metrics.json` (timestamp only) |
| REPO HYGIENE | `.gitignore` (runtime state + tooling dirs excluded from VCS) |

Excluded from the release commit (verified, not lost — present locally, now gitignored): `.opencode/ai/{permissions,routing,logs,handoffs}` runtime state, `.opencode/smart-router/{status,final-status}.json`, `.opencode-backups/`, `.opencode-skill-staging/`, `.bsp/`, `.lighthouseci/`, `.mimosa/`, `.scala-build/`, `lighthouse-reports/`, `opencode-effort-config-*`, `opencode-skill-*` audit artifacts.

Secret audit of the entire staged set: **NO SECRETS** (pattern scan: key shapes, bearer/authorization, private keys, credential assignments — 0 hits across source, policies, tests, verification evidence, reports).

## Version Consistency

- Smart Router version: `ROUTER_VERSION = "2.1.0"` (`config.ts`) — consistent with runtime status and all reports.
- Policy schema version: `2.0.0` in both policies (schema-level, distinct from router version — frozen by design).
- OpenCode version: `1.18.25` in all v2.1 reports; `1.18.23` appears only in historical references (effort-matrix report, changelog correction note) — intentionally preserved.

## Terminology Guarantees

- Vision is **BLOCKED** everywhere — no artifact claims verified vision.
- Escalation is **continuation / re-dispatch** — no artifact claims in-flight model switching (the single "in-flight" match is the explicit negation).

## Known Non-Blocking Debt

1. Literal-free shell obfuscation classified ASK while host auto-approves bash.
2. breaker cooldownMs is sticky file-persisted.
3. chat.params xhigh is normalized by host pre-hook.
4. host does not expose reviewer/research agent identity in all required contexts.
5. true in-flight model mutation is unsupported by OpenCode 1.18.25.

None reclassified as blockers. Evidence: `SMART_ROUTER_V2_1_RELEASE_READINESS.md` §6–7, `security-results.json`, `chaos-results.json`.

## Reproduction

```text
npm test                    # 144/144
npm run lint && npm run typecheck && npm run build
node .opencode/smart-router/cli.ts health
node .opencode/ai/verification/release-v2.1/release-chaos.mjs
```

This is the immutable v2.1.0 baseline. V2.2 starts from here — design only, no implementation.
