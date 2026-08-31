# SMART ROUTER — MiniMax M3 Free Migration (OpenRouter)

**Date:** 2026-08-31
**Scope:** standard-coding candidate only. All other task classes unchanged.
**Status:** verified, owner review pending — NOT COMMITTED at time of writing.

## 1. Migration

| | Before | After |
|---|---|---|
| standard-coding primary | `minimaxm3new/MiniMaxAI/MiniMax-M3` (native GMI) | `open-router/minimax/minimax-m3:free` (OpenRouter free aggregate) |
| variant | `deep` | `deep` |
| chain | `mygmicloud/MiniMaxAI/MiniMax-M3` → `b-ai/glm-5.3-flash` | `minimaxm3new/MiniMaxAI/MiniMax-M3` → `b-ai/glm-5.3-flash` |

OpenRouter model metadata (API `GET /api/v1/models`, 2026-08-31):
`minimax/minimax-m3:free`, context 1,048,576, output max_completion 943,718,
`supported_parameters`: `include_reasoning, max_tokens, reasoning, response_format, seed,
temperature, tool_choice, tools, top_p`. Tools supported. Free (prompt/completion $0).

## 2. Verified reasoning contract (live probes, 2026-08-31)

OpenRouter's own 400 error defines the authoritative enum:

```
reasoning.effort: Invalid option: expected one of
"max"|"xhigh"|"high"|"medium"|"low"|"minimal"|"none"
```

| Mechanism | Value | HTTP | Reasoning observed (`reasoning_details`) | Verdict |
|---|---|---|---|---|
| `reasoning.effort` | `low` | 200 | YES (reasoning.text) | OK — fast |
| `reasoning.effort` | `medium` | 200 | YES | OK — balanced |
| `reasoning.effort` | `high` | 200 | YES | OK — deep |
| `reasoning.effort` | `xhigh` | 200 | YES | OK — xdeep |
| `reasoning.effort` | `minimal` | 200 | YES | OK (not exposed in variants) |
| `reasoning.effort` | `none` | 200 | NO (thinking disabled) | OK — off |
| `reasoning.effort` | `max` | 200 | YES | accepted by current API enum, absent from public model docs; intentionally not exposed |
| `reasoning.effort` | `extreme` | **400** | — | invalid — boundary verified |
| `thinking.type` | `adaptive` | 200 | NO | **inert** — silently ignored, MUST NOT be used |
| flat `reasoning_effort` | `high` / `xhigh` | 200 | YES | OK — this is the field OpenCode sends |

Findings:
- MiniMax M3 Free through OpenRouter has a **graduated effort scale**, not a binary toggle:
  OpenRouter translates unified `reasoning.effort` into upstream thinking behavior.
- `thinking.type = adaptive` is NOT a supported control on this path (accepted but produces
  no reasoning; unknown body fields are silently dropped).
- `verbosity` is not in `supported_parameters` but is tolerated (ignored) — OpenCode's
  `textVerbosity` variant setting passes through harmlessly.

## 3. OpenCode transform chain (verified)

1. Variant selection: `--variant deep` → `opencode.jsonc`
   `provider["open-router"].models["minimax/minimax-m3:free"].variants.deep = { reasoningEffort: "high", textVerbosity: "medium" }`
2. Bundled `@ai-sdk/openai-compatible` maps `reasoningEffort` → flat `reasoning_effort`
   (binary-verified in opencode.exe: `reasoning_effort: D.reasoningEffort, verbosity: D.textVerbosity`)
3. OpenRouter accepts flat `reasoning_effort` (probed) → reasoning active.
4. Plugin evidence: `chat.params-invoke` logged
   `model:"open-router/minimax/minimax-m3:free", effortKey:"reasoningEffort", requestedEffort:"high"`.
5. Live round-trip: `opencode run --model open-router/minimax/minimax-m3:free --variant deep
   --agent build "What is 6*7?"` → correct answer, no parameter errors.

The smart-router effort clamp (`chat.params`) does not apply to `open-router` models
(clamping is b-ai-specific in `capability.ts`) — pass-through, no silent rewrite.

## 4. Variant contract (config unchanged — already verified-compatible)

| variant | reasoningEffort | wire reasoning | status |
|---|---|---|---|
| `fast` | low | on (low) | verified via probe |
| `balanced` | medium | on | verified via probe |
| `deep` | high | on | verified via probe + live OpenCode round-trip |
| `xdeep` | xhigh | on | verified via probe |

Unsupported / forbidden values: `thinking.type=adaptive` (inert), effort `extreme` (400),
`max` (accepted by current API enum, absent from public model docs; intentionally not exposed).

## 5. Router integration

- `routing-decisions.jsonl` (live): `standard-coding` → RESOLVED
  `open-router/minimax/minimax-m3:free#deep`, fallback ladder
  `[open-router balanced (CONFIGURED), minimaxm3new deep (CONFIGURED), b-ai glm high (VERIFIED)]`.
- `security-review` and all other task classes unchanged.
- V2.2 remains SHADOW (`v22-flags.json` `{"mode":"SHADOW"}`, `wouldDispatch=false`).
  New candidate will appear in shadow deltas as `open-router/minimax/minimax-m3:free#deep`
  (append-only; historical minimaxm3new evidence untouched).

## 6. Regression

Tests 348/348 · typecheck PASS · lint PASS · build PASS.
Updated assertions: `model-router.test.ts` (standard-coding row),
`breaker-routing.test.ts` (per-model attribution now expects M3FREE for standard-coding).
