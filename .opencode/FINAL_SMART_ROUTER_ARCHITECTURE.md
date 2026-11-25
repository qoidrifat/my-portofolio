# SMART ROUTER v2 — Final Architecture

Verified against OpenCode **1.18.25** (runtime evidence 2026-08-28). Status artifacts: `.opencode/smart-router/final-status.json`, `.opencode/ai/verification/smart-router-health.json`.

## Pipeline

```
PROMPT
 → chat.message hook        classification (stage-1 heuristic; stage-2 GLM only if low confidence)
 → Risk Engine              low/medium/high/critical (task class + production indicators)
 → Agent Router             build | frontend | research | reviewer (routing-policy.json)
 → Model Router             capability registry (SSOT: opencode.jsonc + opencode-effort-capability-matrix.json)
 → Variant Router           clamped to verified effort ceilings (xhigh never sent to B.AI, etc.)
 → Permission Router        ALLOW/ASK/DENY — independent of model choice (#46/#47)
 → Decision + dispatch      deterministic routeId, fallback chain, opencode run --model/--variant/--agent
 → Observation              tool.execute.after / event hooks → evaluator → CONTINUE/RETRY/ESCALATE/FALLBACK/BLOCK
 → Escalation               continuation packet + re-dispatch (automatic re-routing, NOT in-flight mutation)
```

## Model roles

| Model | Role | Variants |
|---|---|---|
| minimaxm3new/MiniMax-M3 | execution engine (coding) | fast / balanced / deep (CONFIGURED) |
| mygmicloud/MiniMax-M3 | fallback engine | fast / balanced / deep (CONFIGURED) |
| b-ai/glm-5.3-flash | PRIMARY reviewer + research + architecture (benchmark-led: Intelligence 58v52, Coding 72v69, Agentic 58v48; 0-Credit on B.AI) | high / max (VERIFIED) |
| b-ai/deepseek-v4-flash | first cross-model fallback + reasoning reserve (SWE-bench 79.0%, 0-Credit offer) | high / max (VERIFIED, live PASS 2026-08-28) |
| b-ai/qwen3.8-flash | fallback reasoning | high / max (VERIFIED) |

Final policy 2026-08-28: GLM-5.3 Flash primary for routine-review(#high), deep-review(#max), security-review(#max), complex-debugging(#max), repo-research(#max), deep-research(#max). Decision was evidence-driven both ways: DeepSeek was briefly promoted (2026-08-28, cost-only rationale) and reverted the same day once benchmark data showed GLM leading all three axes while ALSO being 0-Credit — the two free offers cancel out, capability wins, and the measured 2s latency delta is negligible for low-volume reasoning calls. Author(M3)-vs-reviewer(GLM) independence preserved; DeepSeek stays the first cross-model fallback. Coding engine unchanged (MiniMax M3, dedicated verified endpoint, immune to free-tier expiry).

Note: B.AI docs (checked 2026-08-28) describe GLM-5.3-Flash as natively multimodal (text/image/video/file), but the local registry marks it text-only pending a runtime vision probe — vision-task stays BLOCKED until verified (same discipline that caught deepseek-v4-flash-vision-exp rejecting images).

Hard limits enforced by `chat.params` clamp: B.AI rejects `xhigh`; `hy3`/`mimo-v2.5` have no `max`; vision tasks are BLOCKED (no verified multimodal model) — never silently degraded.

## Permission intelligence

Profiles `safe | standard | elevated | yolo` in `permission-policy.json`.
Precedence: **HARD DENY > read-only agent force > environment escalation > confirmation gates > profile rules > default ASK.**

- YOLO never bypasses: destructive git (reset --hard, clean -f, force push, history rewrite), env/secret reads, firewall/disk/cloud destruction, credential exfiltration.
- Production downgrades YOLO → safe; never auto-YOLO for production.
- research/reviewer are force read-only even under YOLO.
- `execute:*` grants are shell-only and never imply file-write.
- Live guard: `tool.execute.before` throws `SMART-ROUTER HARD DENY` even when a prompt was pre-approved (verified live 2026-08-28).

## State & observability

- `.opencode/ai/routing/session-state.json` — per-session routes, failed/successful routes, reroute counts (max 3 reroutes, no oscillation).
- `.opencode/ai/routing/routing-decisions.jsonl`, `.opencode/ai/permissions/permission-decisions.jsonl`, `.opencode/ai/logs/smart-router.jsonl` — JSONL audit (secrets redacted by logger).
- Circuit breaker per provider/model with cooldown + probe restore; transient failures never permanently blacklist.
- `.opencode/smart-router/status.json` — live status written by the plugin.

## Integrations

- **ZCode**: file/git handoff via `.opencode/ai/handoffs` + review artifacts (verified 2026-08-27).
- **Orca**: Smart Router sits under Orca `run` as execution intelligence; Orca owns workflow state (adapter E2E pass 2026-08-27).
- **Herdr**: persistent runtime; session state is file-backed so it survives detach/reconnect (lifecycle probe PASS 2026-08-27).
- **Multica**: UNAVAILABLE — no authenticated runtime detected.

## Interface

- Commands: `/router`, `/router-status`, `/router-matrix`, `/router-history`, `/router-explain`, `/router-permissions`, `/auto` (`.opencode/command/*.md`).
- CLI: `npx tsx .opencode/smart-router/cli.ts {classify|route|dispatch|matrix|status|history|session|set-mode|set-permissions|escalate|breaker|health|permissions}` — prompts via `--prompt`, `--prompt-file`, or stdin (Windows argv hardening).
- Modes: `advisory` (recommend only), `auto` (apply via supported mechanisms), `off`.
