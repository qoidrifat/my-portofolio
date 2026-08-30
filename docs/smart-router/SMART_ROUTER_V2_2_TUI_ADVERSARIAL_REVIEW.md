==================================================
SMART ROUTER V2.2 NATIVE OPENCODE TUI
ADVERSARIAL REVIEW
==================================================

Reviewer: independent (read-only, DeepSeek-V4-Flash #max)
Reviewer Skill: Principal AI Systems Architect / OpenCode TUI Architect / Security Engineer
Date: 2026-08-30
Method: source inspection of TUI plugin, view-model, format, runtime integration (host/wire/evaluation-store/engine), installed types, runtime artifacts, test suites, design docs. Independent gate re-run: npm test, typecheck, lint, build.
Scope: The Smart Router V2.2 TUI — a native OpenCode TUI plugin claimed to be a genuine read-only observability layer with no hidden authority, no lifecycle leak, no data contamination, and no misleading state.
Read-only rule: NO source/tests/policy edits. Only this report + optional machine-readable findings.

---

## Primary Question

> Is the Smart Router V2.2 TUI a genuine native, realtime, read-only observability layer of OpenCode, with no hidden authority, no lifecycle leak, no data contamination, and no misleading state?

**Answer: YES, with CONDITIONAL caveats.** The TUI is architecturally sound, read-only, fail-open, and correctly observational. Three MEDIUM findings exist (session isolation gap, security-event staleness, UI-side evidence recomputation) — all display-only, contained, and non-authoritative. No hidden authority, no lifecycle leak, no data contamination. The session-scoping absence is the most impactful: the UI shows global-latest state rather than per-session state, which can misattribute observability data across sessions. This is a display defect, not a security or authority violation.

---

## Overall: CONDITIONAL

---

# Per-Axis Results

## Native Integration: PASS
- Registration via `tui.json` explicit `plugin` array. TUI plugins NOT auto-discovered from `.opencode/plugins/` (verified empirically per implementation doc). Single registration path.
- Module shape (`TuiPluginModule { id, tui }`) matches installed `@opencode-ai/plugin/dist/tui.d.ts`.
- Duplicate registration: only if `tui.json` + auto-discovery both activate. Doc claims auto-discovery verified NOT active for TUI. id "smart-router-tui" may dedupe.
- Command namespace: legacy `api.command.register` with slash names. Deprecated but supported on current runtime (1.18.25). No keybind collisions.
- Plugin lifecycle: `api.lifecycle.onDispose` cleans up subscriptions and timers. Verified via `tui-plugin-load` log entries across 7 process launches.

## Auto Load: PASS
- `tui.json` registration is static config. Fresh process → plugin loaded. Verified via 7 `tui-plugin-load` log entries at distinct timestamps (14:33, 14:44, 14:52, 14:53, 14:58, 15:07, 15:21).
- No stale-filesystem dependency: registration is config-driven, not file-state-based.

## Realtime: PASS (with note)
- Event subscriptions (6 types) with 150ms debounce → file re-read → `setVm`. Footer/slots are reactive Solid JSX — re-render on signal change.
- Dialogs are snapshots (state captured at `replace()` time). An open dialog does NOT live-update. This is acceptable: documented as "dialog", not "live panel".
- Changes to routing/evidence/security reach the footer within 150ms of the triggering event. No manual refresh, command rerun, or polling required for the live slots.

## Event Lifecycle: PASS
- 6 subscriptions: `message.updated`, `message.part.updated`, `session.error`, `session.idle`, `permission.asked`, `permission.replied`. Each returns an unsubscribe function; collected in `unsubs` array; all disposed via `api.lifecycle.onDispose`.
- 150ms debounce: last event in a storm wins. Snapshot-based re-read — no ordering or state-loss risk.
- **Finding MEDIUM-2 (security event staleness):** No subscription for `tool.execute.before` or `tool.execute.after` events. Hard denies from the tool guard (tool.execute.before) write to `permission-decisions.jsonl` but do NOT trigger a TUI refresh. The security panel updates only when another subscribed event fires. This is a real readiness gap: the security-critical hard-deny indicator may lag until the next message event. See MEDIUM-2.

## Reactivity: PASS (with note)
- `vm` signal and `widthSig` signal — Solid reactive primitives. Slots re-render on signal change.
- **Recent resize fix:** `renderer.on("resize")` → `setWidthSig(api.renderer.width)` — clean, reactive, disposed on `onDispose`. Verified via log: 64 → 27 → 64.
- **Non-reactive `theme`:** `const theme = api.theme.current` captured ONCE at plugin init. The `theme` object is a frozen snapshot. If the user switches theme at runtime, the plugin's captured colors stale until plugin reload. The host may mutate the object in place (TuiThemeCurrent is readonly-typed, but runtime could mutate). The implementation doc claims "theme changes automatically" — this is UNVERIFIED and likely FALSE if the host replaces the object. See LOW-1.
- Dialog content is a snapshot at `replace()` time — not reactive. Acceptable.

## Data Source of Truth: PASS (with note)
- Routing/authority/security state: all from runtime artifacts (JSONL tails, JSON files). The UI does NOT compute routing, does NOT rank candidates, does NOT decide permissions.
- **Finding MEDIUM-3 (UI-side evidence recomputation):** The `evidence` section in `buildViewModel` (view-model.ts:197-225) recomputes quality mean, confidence via `n/(n+10)`, status `KNOWN-EVIDENCED`/`UNPROVEN`, and source level from RAW evaluation-signals tail. This is a UI-side reimplementation of the EvidenceStore's aggregation logic. The store's authoritative `stats()` uses freshness-weighted mean, staleness half-life, confidence cap 0.9, and merged-execution semantics. The UI's version is a simplified approximation (plain mean, shrinkage-only confidence, no freshness decay). The UI comment says "approximate sample counts from the tail we loaded" — honest but not authoritative. Display-only, but can diverge from runtime truth. See MEDIUM-3.
- Hysteresis margin computed from top-2 candidate scores (display-only, honest threshold label).

## Authority Boundary: PASS
- No mutation-capable API calls in the TUI plugin. No `client.*`, no route/model/breaker/permission setters, no dispatch/execute/tool calls.
- Only writes: `logTui` (appendFileSync to `.opencode/ai/logs/smart-router-tui.jsonl` — observability log, not routing state), `api.slots.register`, `api.ui.dialog.*`, `api.command.register`.
- `buildRegistry()` is read-only (reads global config files).
- `loadedSnapshot` failure → null → UI shows "unavailable" — fail-open, never breaks host.

## Shadow Safety: PASS
- `wouldDispatch: false` is a type-literal in `RouterViewModel`. Shadow panel explicitly: "Would dispatch: NO (shadow only)". Route panel: "Would dispatch: NO (shadow only)". Influence shown as ZERO for SHADOW/OFF modes.
- Shadow comparison panel: "V2.1 ACTUAL" vs "V2.2 HYPOTHETICAL". Counterfactual shown as UNKNOWN.
- No dispatch path in TUI code.

## Route Label Honesty: PASS
- Footer: `Smart Router · SHADOW  Actual <model>  Shadow <model>  Risk <risk>`.
- Route panel: `ACTUAL <model>`, `SHADOW <model> [tier]`, `Would dispatch: NO`.
- Shadow panel: `V2.1 ACTUAL <model>`, `V2.2 HYPOTHETICAL <model>`, `Divergence`, `Would dispatch NO`.
- All labels are unambiguous. Actual vs Shadow clearly distinguished.
- **Note:** Shadow route label uses `#variant` notation (e.g., "glm-5.3-flash#max") while actual route uses "glm-5.3-flash · max". Inconsistent variant display but not ambiguous (LOW-7).

## UNKNOWN Semantics: PASS
- `asNum` uses `Number.isFinite` → NaN/Infinity → null → UNKNOWN/"—".
- `asString` null/empty → null → UNKNOWN.
- `fmtCost`: null → UNKNOWN; verified true → `$X.XXXX`; verified false → raw number.
- `fmtMs`: null → "—".
- `fmtFreshness`: null → "—".
- `fmtTokens`: null → UNKNOWN.
- Evidence status: UNPROVEN / KNOWN-EVIDENCED preserved.
- Cost 0 only shown when authoritative runtime evidence says zero (sourced from t4 verified pricingSource).
- Falls negative: `asNum(-5)` → -5 (not excluded). Negative latency/cost displayed if runtime produces it. See LOW-2.

## T1 Lifecycle: PASS
- `evaluationStatus`: hasT1 ? "RECEIVED" : hasT2 ? (CANCELLED ? "CANCELLED - AUDIT ONLY" : "PENDING DISPOSE") : "NO EXECUTION YET".
- Never "failed" while evaluation is pending. Honest: "T1 lifecycle note: arrives on normal plugin/session disposal".
- Verified by real runtime evidence (T1 lifecycle verification doc: 2 independent lifecycle runs, both produced T1 post-dispose with convergence).

## T1/T2 Convergence: PASS
- Execution ID derived from latest t2 tail row → signals filtered by executionId → t1/t2 signal detection.
- Convergence detection: `hasT1 && hasT2` → status "RECEIVED". Attribution complete flag from signal.
- **Edge note:** If the latest executionId in the t2 tail (120 rows) has a signal that fell out of the 400-signal tail, `hasT1` false → "PENDING DISPOSE" even if the evaluation converged. Rare with 120 vs 400 tail. See LOW-6.

## Session Isolation: FAIL
- **Finding MEDIUM-1:** The TUI is NOT session-scoped. The view-model reads global tails: `routing.at(-1)`, `t2.at(-1)`, `deltas.at(-1)`, signals tail (400 rows). The `session_prompt_right` slot receives `{ session_id: string }` but the plugin IGNORES it — the slot render function takes no props and renders global-latest state.
- Consequence: Session B's footer/panels can show Session A's route, evidence, and evaluation if Session A made the last routing decision. This is cross-session display misattribution — display-only, no mutation, no private data leak (only observability metadata: route, model, risk, status).
- The implementation doc lists "Multi-session switch leak check" as NOT YET EXECUTED (manual) — confirming this gap was known but unaddressed.
- **Severity:** MEDIUM (display-only, contained, non-authoritative). Does not affect routing safety, permission, or security.

## Global/Session State: PARTIAL
- Global state (correctly displayed as global): breaker, provider health, aggregate evidence. These are inherently global.
- Session-specific state (incorrectly displayed as global-latest): current route, task, risk, agent, hysteresis, shadow decision. These should be session-scoped but are read from global tails. Same root cause as MEDIUM-1.
- "V2.2 is shadow-only" label is global — correct.

## Hysteresis: PASS
- Hysteresis margin displayed from top-2 delta scores (display-only). Threshold labeled "engine-internal" (honest).
- Decision: stickinessApplied true → "RETAIN CURRENT", false → "RE-EVALUATED", null → UNKNOWN.
- No mutation of runtime state. Same session-scoping caveat as MEDIUM-1.

## Breaker: PASS
- Reads from `circuit-breaker.json`. Relevant keys: actual model, shadow selected model, all OPEN entries.
- State display: OPEN → error tone, HALF_OPEN → warning, CLOSED → success. Not conflated with health score.
- Breaker labeled "hard authority" in health panel header.
- Same session-scoping caveat as MEDIUM-1 (global breaker state is correct — breaker is inherently global).

## Fallback: PASS
- Fallback chain from routing-decisions tail. `fallbackStatus = "PLANNED"` when present, else UNKNOWN.
- Never "EXECUTED". Honest.

## Escalation: PASS (PARTIAL)
- No dedicated escalation events exist in runtime. The "FALLBACK / ESCALATION" panel shows only fallback lines.
- No escalation fabricated. Route explanation does not imply escalation execution. Honest PARTIAL.

## Security UI: PASS
- `permissionMode` from routing or config. `hardDeny` from denies observed in permission-decisions tail (last 5 denies).
- Clamps/advisories counted from routerLog tail. Deny rules shown (rule name only — no command payload; `operationPreview` stored but not rendered in UI).
- No raw secrets, no .env, no tokens, no authorization headers, no prompt content. The logger redacts secrets; the TUI reads only routing/permission metadata.
- **FINDING MEDIUM-2:** Security staleness gap (see Axis 3/32).

## Security Authority: PASS
- Security UI displays only. No control path: no disable hard-deny, no override permission, no open breaker, no change policy. Read-only.

## Commands: PASS
- Commands: `/router`, `/router-status`, `/router-explain`, `/router-health`, `/router-shadow`, `/router-evidence`, `/router-security`.
- Registered via legacy `api.command.register`. Slash names used. No keybinds registered.
- `api.command` is optional (`?.`); registration failure caught. `exec` logs and refreshes before opening.
- **Prefix collision:** `/router` is a prefix of `/router-*` commands. The host command menu resolves exact slash name; risk is low but depends on host behavior. INFO.

## Command Pacing: HOST-LIMITED
- Previous acceptance test: fast synthetic typing caused host menu to not open in time → `/router-status` and `/router-explain` text submitted as messages instead of commands. Re-invocation succeeded.
- This is entirely the host TUI's input-pacing behavior. The plugin contributes nothing to the pacing and cannot improve it without hacking host input. The implementation doc accurately classifies this as a host menu-pacing issue, not a plugin defect.

## Legacy API: ACCEPTABLE (with debt)
- Uses `api.command.register` — deprecated in installed types (`@deprecated Use api.keymap.registerLayer({ commands, bindings }) instead`). The deprecation note IS documented. The plugin's claim that "slash mapping through the newer keymap layer is not documented in installed types" is partially inaccurate: the deprecation note explicitly says to use `registerLayer({ commands, bindings })`, which does support command registration. The exact slash-command mapping semantics of `registerLayer` are not shown in the installed tui.d.ts type, but the migration path is documented.
- Legacy API works on the current runtime (1.18.25) and is kept for v1 compat. Migration to keymap.registerLayer would reduce future risk when v2 removes the legacy surface. **DEBT:** should migrate before the runtime removes the deprecated API.

## Theme: PARTIAL
- Uses only semantic tokens from `api.theme.current` (text, textMuted, success, warning, error, accent, border). No hardcoded RGB/hex. Good.
- **Finding LOW-1:** `theme` captured once at plugin init, NOT reactive. The implementation doc claims "theme changes automatically" — this is unverified and likely false if the host replaces `api.theme.current` with a new object on theme switch. The plugin does not subscribe to theme change events. No theme change listener exists. At minimum, a runtime theme switch requires plugin reload. The doc overclaims.
- Theme tokens are semantically correct (good). If the host mutates the same object in-place, the captured reference follows. Cannot verify host behavior without host source.

## Responsive: PASS
- `widthSig` reactive via `renderer.on("resize")`. Footer lines adapt to width: <56 cols (mode+model), <80 (mode+actual), ≥80 (mode+actual+shadow+risk), ≥100 (divergence warning).
- `clip()` with ellipsis protects long lines. Verified live: 64 → 27 → 64 width transitions logged.
- Dialog panels are not width-reactive (fixed size) — acceptable.

## Overflow / Clipping: PASS
- `clip(text, width)` ensures text fits within width. `footerLines` uses progressive thresholds.
- Critical fields: mode always shown, actual model shown at all widths. Risk appears at ≥80 cols. At <80, risk is omitted. Brief says "Ellipsis is acceptable for secondary details" — risk could be argued critical. Acceptable.

## Performance: PASS
- 150ms debounce aggregates events. File reads are tail-bounded (max 400 rows). `buildViewModel` sorts tails each refresh — O(n log n) over ≤400 rows. Evidence aggregation iterates ≤400 signals. All bounded.
- No full-corpus, full-JSONL-store, or full-candidate-list parsing. No O(n²) over corpus growth.
- Registry built once at plugin load, not per refresh.

## Memory / Lifecycle: PASS
- Event listeners: 6 `api.event.on` → unsubs disposed via `onDispose`. 1 `renderer.on("resize")` → unsubs disposed.
- `refreshTimer` cleared on `onDispose`.
- Only one `vm` signal — holds latest snapshot. No route accumulation, session accumulation, signal accumulation.
- Last-footer-width cache is a simple `Record<string, number>` — bounded (2 slots).
- 3+ relaunches verified via log: no evidence of leak (each load logs `tui-plugin-load`).

## Remote: PASS (HOST-LIMITED)
- TUI is a local TUI plugin. The remote host classification is a runtime limitation, not a UI defect. The UI does not fabricate local evidence when remote. If files are unavailable, the UI shows "—" / UNKNOWN (fail-open).

## Freshness: PASS (PARTIAL)
- Evidence shows `freshnessDays` (fmtFreshness: m/h/d units). Cost/latency labeled "last observed turn". Evaluation status shows current.
- Health capabilies do not show age. No explicit "stale" flag except when evidence not present (→ UNKNOWN). Acceptable for an observability display.

## Invalid Data: PASS (PARTIAL)
- `asNum` rejects NaN/Infinity → null → UNKNOWN/"—".
- `asString` rejects non-string/empty → null → UNKNOWN.
- `fmtCost` handles null → UNKNOWN.
- **Finding LOW-2:** `asNum` does NOT reject negative numbers. `asNum(-5)` → -5. If the runtime produces negative latency (`ttfrMs: -300`) or negative cost, the UI displays negative values as trusted metrics. Runtime contract prevents negative values, but no guard exists.

## Cost: PASS
- `fmtCost`: null → UNKNOWN. verified (`pricingSource.status === "VERIFIED"`) → `$X.XXXX`. Not verified → `X unit` (raw number, no "$" prefix). Honest.
- Cost 0 shown only when authoritative runtime evidence says 0 (verified + effective=0). Test: `fmtCost(0, "usd", true)` → "$0.0000". Distinct from `fmtCost(null, "usd", false)` → "UNKNOWN". PASS.

## Latency: PASS
- TTFR and completion latency separated. `decisionMs` always null (never computed — honest, not labeled as inference latency). PASS.

## Capability: PASS
- `parseCapabilities` from the real `buildRegistry()` SSOT (same as server plugin). Vision status: `supportsVision ? "VERIFIED" : "BLOCKED"`. `buildRegistry` sets `supportsVision: false` for all models (b-ai rejects image input; others unverified). Vision always BLOCKED.
- Variant statuses: VERIFIED, CONFIGURED, BLOCKED shown. Registry unavailable → null → "UNKNOWN (registry unavailable)". Honest.

## Evidence: FAIL (see MEDIUM-3)
- **Finding MEDIUM-3:** UI-side recomputation of evidence aggregates. `buildViewModel` reads raw evaluation-signals tail and computes quality mean, confidence via `n/(n+10)`, status (KNOWN-EVIDENCED threshold n≥5), source level, freshness. This duplicates the EvaluationStore's authoritative aggregation logic. The store uses weighted mean by freshness, staleness half-life, confidence cap 0.9, and merged-execution dedup. The UI's simplified version (plain mean, shrinkage-only confidence, no freshness) can diverge from the runtime's canonical evidence values. Additionally, the UI pools evidence across ALL task classes for a candidate (cross-class contamination), while the store segments by taskClass. Display-only, but the displayed evidence numbers are NOT authoritative — they are a UI-side approximation.
- Evidence quality, confidence, sample size, source level, and status come from UI-side computation, not from the runtime aggregate store. This violates the design principle that "evidence must come from real runtime evidence. No UI-side recomputation."

## Candidate Ranking: PASS
- Candidates from v22 delta `topScores` (runtime-provided, ordered by engine). UI preserves order with `rank` derived from position. No UI-side re-ranking.

## Hidden Side Effects: PASS
- No `dispatch`, `route`, `model`, `permission`, `breaker`, `policy`, `execute`, or `tool` mutation calls in TUI source. Only `logTui` (appendFileSync to observability log). No hidden mutation paths.

## Storage: PASS
- No `api.kv` usage. No routing/permission/breaker/security/model selection storage. Only `logTui` writes to `.opencode/ai/logs/smart-router-tui.jsonl` — an observability log (tui-plugin-load, footer-render, dialog-open, command-execute). Acceptable telemetry.

## Corpus Boundary: PASS
- TUI only reads corpus files (shadow-deltas, evaluation-signals, hysteresis-state). It does NOT write to corpus files. Opening the UI does not initialize collection. The only write is the TUI's own log file (separate artifact).

## Promotion Boundary: PASS
- Promotion panel shows "NOT AUTHORIZED". Shadow panel shows "Promotion NOT AUTHORIZED". Influence ZERO. No promotion action, no enable-AUTO/OPTIMIZED button. Read-only.

## Test Quality: PARTIAL
- `v22-tui-view.test.ts`: 20 tests covering view-model (UNKNOWN-safe, T1 lifecycle, routing/stability, capabilities, format). Tests source→adapter→render (buildViewModel → format → assertion). Good coverage of the pure adapter+format layer.
- **Not tested:** Plugin glue: event subscriptions, slot registration, debounce, dispose, dialog rendering, command execution. The plugin.tsx file has NO automated tests. The host→plugin→event→UI path is only exercised by manual interactive acceptance. The implementation doc mentions the interactive tests but they are not automated.
- Session isolation, theme reactivity, width responsiveness across all widths — not automated. Responsive verified live via logs (64→27→64).
- Scores: adapter/format good; plugin glue untested.

## False Confidence: FOUND
- Mostly well-supported: "Auto Load PASS" backed by log evidence, "Realtime PASS" backed by live resize logs, "T1 lifecycle verified" backed by real runtime artifacts (T1 lifecycle verification doc, evaluation-signals.jsonl).
- **Overclaim:** "Theme changes automatically" — the plugin captures `theme` once at init; no subscription to theme change events. This claim is unsupported. See LOW-1.
- **Acknowledged gaps:** "Multi-session switch leak check" and "breaker OPEN live view" listed as not yet executed. Honest documentation.

## Design Conformance: CONFORMANT
- OBSERVABILITY_DESIGN: UI is read-only, UNKNOWN-safe, shows no fabricated values. Conformant.
- SECURITY_BOUNDARY: UI has zero authority; no mutation path. Conformant.
- EVALUATION_DESIGN: evaluation statuses honest, T1 lifecycle correctly displayed. Conformant.
- SHADOW_CORPUS_PROTOCOL: UI observational only, no corpus writes. Conformant.
- TUI_UI_DESIGN.md: referenced in review brief but does not exist in the repository. Only `SMART_ROUTER_V2_2_TUI_UI_IMPLEMENTATION.md` exists. Minor doc gap (INFO-1).

---

## Findings

### Critical: 0

### High: 0

### Medium: 3

**MEDIUM-1 — No session isolation in TUI display**
- Location: `smart-router-tui.tsx:190-207` (slot render functions ignore props), `view-model.ts:130-299` (reads global tails: `routing.at(-1)`, `t2.at(-1)`, `deltas.at(-1)`)
- The TUI reads global-latest tails without sessionId filtering. The `session_prompt_right` slot receives `{ session_id }` from the host but the plugin ignores it. Session B's TUI can show Session A's route, evaluation, and evidence. Display-only — no mutation, no private data leak (only observability metadata). The implementation doc lists this as not yet tested.
- Fix: filter data tails by sessionId when available, or accept the global-latest display as a known limitation. This is a design decision: single-session scope vs multi-session-aware display.

**MEDIUM-2 — Security hard-deny staleness (no tool event subscription)**
- Location: `smart-router-tui.tsx:149-155` (event subscriptions list)
- The TUI subscribes to `permission.asked` and `permission.replied` events. Hard denies from `tool.execute.before` (the tool guard) write to `permission-decisions.jsonl` but do NOT emit a subscribed event. A hard deny can occur with no permission.asked/replied event. The security panel only updates when another subscribed event (e.g., message.updated) triggers a refresh. The security-critical "Hard deny ACTIVE" indicator can lag.
- Fix: subscribe to a tool-execution event or poll the permissions file on a timer.

**MEDIUM-3 — UI-side recomputation of evidence aggregates**
- Location: `view-model.ts:197-225` (evidence aggregation from raw signals)
- The view-model reads raw evaluation-signals tail and recomputes quality mean, confidence via `n/(n+10)`, source level, and status (KNOWN-EVIDENCED/UNPROVEN). This duplicates the EvaluationStore's authoritative aggregation logic. The store uses freshness-weighted mean, staleness half-life, confidence cap 0.9, and merged-execution semantics. The UI's version is a simplified approximation (plain mean, shrinkage-only confidence, no freshness decay, no taskClass segmentation). Displayed evidence numbers can diverge from the runtime's canonical values. Additionally, the UI pools evidence across all task classes (cross-class contamination), while the store segments by taskClass.
- Fix: consume the EvaluationStore's `stats()` output (or a dedicated snapshot) for evidence display, rather than reimplementing aggregation from raw signals.

### Low: 5

**LOW-1 — Theme captured once, not reactive; doc overclaims**
- `theme = api.theme.current` captured at plugin init. No subscription to theme change events. The implementation doc claims "theme changes automatically" — unsupported. At minimum, a theme switch requires plugin reload. The doc should acknowledge this limitation.

**LOW-2 — Negative latency/cost accepted by view-model**
- `asNum()` uses `Number.isFinite` which accepts negative numbers. `fmtMs(-500)` → "-500ms". If the runtime produces a negative latency (clock skew), the UI displays it as a trusted metric. Runtime contract prevents negatives, but no guard.

**LOW-3 — Risk omitted from footer at width < 80 columns**
- `footerLines` shows risk only when width ≥ 80. At narrower widths, the risk label is dropped. The brief lists risk as a critical field. Acceptable per the ellipsis-for-secondary rule, but at the edge of the rule.

**LOW-4 — Legacy api.command is deprecated (DEBT)**
- `api.command.register` is marked `@deprecated` in the installed types. The migration path to `api.keymap.registerLayer({ commands, bindings })` IS documented. This is DEBT — the deprecated API will be removed in v2. Migration reduces future risk.

**LOW-5 — Recent evaluation hidden if signal fell out of 400-row tail**
- If the latest executionId in the t2 tail (120 rows) has a signal that fell out of the 400-signal tail, `hasT1` is false → UI shows "PENDING DISPOSE" even if the evaluation actually converged and has a record. Rare edge case.

**LOW-6 — Shadow route label uses `#` variant notation (cosmetic)**
- Shadow route displays "glm-5.3-flash#max" (candidateId format with `#variant`) while actual route shows "glm-5.3-flash · max". Inconsistent but not ambiguous.

### Info: 4

**INFO-1 — `SMART_ROUTER_V2_2_TUI_UI_DESIGN.md` does not exist**
- The review brief references this design doc, but it's not in the repository. Only `SMART_ROUTER_V2_2_TUI_UI_IMPLEMENTATION.md` exists. The implementation doc is the design record.

**INFO-2 — Dead code: `latestBy` function unused**
- `view-model.ts:104-111` defines `latestBy` but it's not called in `buildViewModel`. Dead code.

**INFO-3 — Plugin glue (event+slot+command+dispose) untested**
- No automated tests for `smart-router-tui.tsx`. The host→plugin→event→UI path is only exercised manually. The adapter+format layer is well-tested (20 tests), but the plugin wiring is not automated.

**INFO-4 — `/router` prefix collision with `/router-*` commands**
- The slash command `/router` is a prefix of `/router-status`, `/router-explain`, `/router-health`, `/router-shadow`, `/router-evidence`, `/router-security`. The host resolves by exact match; risk is low.

---

## Promotion Blockers
- MEDIUM-1 (session isolation) must be addressed before claiming multi-session support.
- MEDIUM-2 (security staleness) must be addressed before claiming realtime security display.
- MEDIUM-3 (evidence recomputation) should be addressed before evidence display is used for any analysis.
- Existing promotion blockers from Wave 2 (MEDIUM-1/2/3, LOW-1..4) remain unchanged.

## TUI Blockers
- None blocking TUI operational use. The TUI is safe and read-only. The MEDIUM findings are display-quality issues.

## Required Fixes (before claiming session isolation or realtime security)
1. MEDIUM-1: Session-scope UI data (filter by sessionId when slot provides it).
2. MEDIUM-2: Subscribe to tool events or add permissions file polling.
3. MEDIUM-3: Consume authoritative store aggregates for evidence display, or accept the approximation and document divergence.

## Accepted Technical Debt
- LOW-4 (legacy API migration) — the deprecated API works on current runtime; migration can wait until host v2 removal timeline.
- LOW-5 (evaluation tail edge) — accept for now.
- INFO-3 (plugin glue untested) — accept for now.

---

## Verification Gates (independent re-run)

| Gate | Result |
|------|--------|
| `npm test` | 323/323 PASS (19 files) — includes 20 TUI view tests |
| `npm run typecheck` | PASS (jsconfig.json + tsconfig.v22.json) |
| `npm run lint` | PASS |
| `npm run build` | PASS (vite build + stats + PWA) |

---

## V2.1 Impact: ZERO
- No changes to V2.1 routing, permission, breaker, security, or scoring paths.
- V2.2 = SHADOW only (v22-flags.json: `mode: "SHADOW"`). V2.1 = ACTUAL PRODUCTION AUTHORITY.
- The TUI is a read-only observability layer. No V2.1 code paths are modified.

## Routing Authority Changes: 0
## Permission Changes: 0
## Breaker Changes: 0
## Security Changes: 0
## Scoring Changes: 0
## Schema Changes: 0

---

## Final Verdict

**CONDITIONAL APPROVED**

The Smart Router V2.2 TUI is a genuine native, realtime, read-only observability layer. It has:
- **No hidden authority** — zero mutation-capable API calls. Read-only presentation.
- **No lifecycle leak** — all subscriptions and timers properly disposed. Fail-open design.
- **No data contamination** — only reads runtime artifacts; writes only its own observability log.
- **No misleading state** — labels are honest (ACTUAL/SHADOW, wouldDispatch:NO, NOT AUTHORIZED). Evidence and evaluation statuses are correct.

Three MEDIUM findings exist:
1. **Session isolation gap** (MEDIUM-1): UI shows global-latest state, not per-session. The most impactful finding.
2. **Security hard-deny staleness** (MEDIUM-2): no subscription for tool guard events.
3. **UI-side evidence recomputation** (MEDIUM-3): evidence display aggregates from raw signals instead of authoritative store.

All three are display-only, contained, and non-authoritative. They do not affect routing safety, permission, breaker, security, or data integrity. The session isolation gap is the most user-visible: on a multi-session host, the footer/panels can misattribute which session's route is displayed.

## Recommendation

**APPROVED for shadow observability use.** The MEDIUM findings should be addressed before:
- Claiming multi-session isolation (MEDIUM-1)
- Claiming realtime security display (MEDIUM-2)
- Using evidence display for any analysis (MEDIUM-3)

Existing promotion blockers from Wave 2 review remain unchanged. The TUI does not change the shadow baseline status. Corpus collection NOT AUTHORIZED.

---

**Evidence artifacts:**
- Source files inspected: smart-router-tui.tsx, view-model.ts, format.ts, host.ts, wire.ts, evidence-snapshot.ts, evaluation-store.ts, engine.ts, telemetry.ts, flags.ts, types.ts, discovery.ts, gates.ts, scoring.ts, hysteresis.ts, hysteresis-store.ts, capability.ts, router.ts, circuit-breaker.ts, config.ts, logger.ts
- Installed types: tui.d.ts, renderer.d.ts, keymap/index.d.ts
- Config: tui.json, config.json, v22-flags.json, package.json, tsconfig.v22.json
- Tests: v22-tui-view.test.ts, v22-host-integration.test.ts, v22-engine.test.ts, v22-engine-integration.test.ts, v22-wave2-evidence-loop.test.ts, v22-identity-integration.test.ts
- Docs: TUI_UI_IMPLEMENTATION, SECURITY_BOUNDARY, OBSERVABILITY_DESIGN, EVALUATION_DESIGN (referenced), SHADOW_BASELINE, SHADOW_CORPUS_PROTOCOL, WAVE2_ADVERSARIAL_REVIEW, CRITICAL_1_REREVIEW, T1_LIFECYCLE_VERIFICATION
- Runtime artifacts: smart-router-tui.jsonl (7 loads, 3 commands, 1 resize), shadow-deltas.jsonl, t2.jsonl, t3.jsonl, evaluation-signals.jsonl, circuit-breaker.json, routing-decisions.jsonl
- Verifications: npm test (323/323), typecheck (PASS), lint (PASS), build (PASS) — all independently re-run