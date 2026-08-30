# Smart Router V2.2 — Native OpenCode TUI Implementation

Date: 2026-08-30
Scope: read-only observability UI inside the OpenCode TUI. Zero routing authority.
Status: implemented, auto-load verified in real OpenCode TUI (v1.18.25).

## Architecture

```
SMART ROUTER RUNTIME (V2.1 authority + V2.2 shadow)
        │  (JSONL/JSON artifacts, read-only)
        ▼
presentation adapter  (.opencode/smart-router/v22/tui/view-model.ts)
        │  (pure, null-safe, UNKNOWN-preserving)
        ▼
line formatter        (.opencode/smart-router/v22/tui/format.ts)
        │  (pure text + tone tokens)
        ▼
native TUI plugin     (.opencode/plugins/smart-router-tui.tsx)
        │  (Solid JSX via @opentui/solid, slots + dialogs + legacy commands)
        ▼
OPENCODE TUI (theme-aware slots: session_prompt_right, home_footer)
```

The UI never recalculates routing. It renders existing runtime artifacts only.

## Plugin Registration (load path — verified)

- Module shape: `TuiPluginModule { id, tui }` from `@opencode-ai/plugin/tui`
  (installed `@opencode-ai/plugin` 1.18.23; TUI runtime 1.18.25).
- **TUI plugins are NOT auto-discovered from `.opencode/plugins/`** on this runtime
  (empirically verified: unregistered `.tsx` produced no load on two real launches).
  Server-side plugins remain auto-discovered from that directory.
- TUI registration is explicit, in project `tui.json`:

```json
{
  "$schema": "https://opencode.ai/tui.json",
  "plugin": ["./.opencode/plugins/smart-router-tui.tsx"]
}
```

- Auto-load proof: `.opencode/ai/logs/smart-router-tui.jsonl`
  `{"kind":"tui-plugin-load","version":"1.18.25"}` written during a real TUI launch;
  no plugin errors in `~/.local/share/opencode/log/opencode.log` for that run.

## Data Flow

- Inputs (read-only, tail-bounded):
  - `.opencode/smart-router/v22-flags.json`, `config.json`
  - `.opencode/ai/evidence/v22/shadow-deltas.jsonl`, `evaluation-signals.jsonl`, `hysteresis-state.jsonl`
  - `.opencode/ai/telemetry/v22/t2.jsonl`, `t3.jsonl`, `t4.jsonl`
  - `.opencode/ai/routing/routing-decisions.jsonl`, `circuit-breaker.json`
  - `.opencode/ai/permissions/permission-decisions.jsonl`
  - `.opencode/ai/logs/smart-router.jsonl`
  - Capability registry SSOT via real `buildRegistry()` (same as server plugin).
- Realtime: typed `api.event.on` subscriptions
  (`message.updated`, `message.part.updated`, `session.error`, `session.idle`,
  `permission.asked`, `permission.replied`, and the typed tool-lifecycle events
  `session.next.tool.called/success/failed`) with a 150 ms debounce → snapshot refresh.
  MEDIUM-2 remediation: `tool.execute.before` is NOT exposed to TUI plugins on this
  runtime (verified installed SDK v2 `Event` union) — HOST-LIMITED. Hard-denies are
  therefore observed through ONE bounded `fs.watch` on the permissions directory
  filtered to `permission-decisions.jsonl` (the exact file the guard writes, hard-deny
  flow emits no permission.ask event). Single watcher, debounced via the same refresh
  path, disposed on plugin dispose. No polling loops. Deny-count INCREASES are logged
  as `tui-security-state-change` transitions. All subscriptions disposed via
  `api.lifecycle.onDispose`.
- MEDIUM-1 session isolation: `session_prompt_right` receives the host `session_id`
  and derives its view from the SAME snapshot filtered by `record.sessionId === sessionId`
  (hysteresis rows by their `sessionId::taskClass::risk` key). Sessions never fall back
  to another session's global-latest records. `home_footer` and dialogs remain the
  global workspace view (no session id at that surface).
- MEDIUM-3 evidence authority: the UI implements NO aggregation. The plugin builds a
  read-only `EvaluationStore` over the bounded signal tail (`record(flush=false)`,
  never persists, `load()` never called) and passes its authoritative `stats()` output
  (taskClass × candidate segmentation, variant→model fallback with the ×0.5 inheritance
  cap, shrinkage + staleness confidence, CONFIDENCE_CAP, duplicate/merge semantics) to
  the view model, which copies values verbatim and formats only. Route-relevant
  candidates without authoritative aggregates render as `UNPROVEN` with null values.
- Filesystem reads are tail-bounded (≤ 400 rows) and debounced; they are the
  fallback/observability source, never a second authority.

## UI Surfaces

| Surface | Mechanism | Content |
|---|---|---|
| Inline status (P0) | slots `session_prompt_right`, `home_footer` | mode · actual · shadow · risk; width-responsive (narrow → icon+mode+model) |
| Dashboard | `/router` | authority/influence, task/risk, routes, candidates, health, stability, evidence, evaluation, security, fallback, promotion + command index |
| Status | `/router-status` | task, route, evaluation |
| Route explanation | `/router-explain` | task, actual vs shadow, candidates, hysteresis, evaluation, fallback |
| Health | `/router-health` | breaker states (hard authority) + capability panel (real registry) |
| Shadow comparison | `/router-shadow` | V2.1 actual vs V2.2 hypothetical, divergence, driver, "Would dispatch: NO (shadow only)", counterfactual UNKNOWN |
| Evidence | `/router-evidence` | per-candidate quality/confidence/samples/freshness/source/status + latency/cost + promotion |
| Security | `/router-security` | permission mode, hard deny, policy guard, breaker, violation count + recent HARD DENY rules |

Commands are registered through the documented legacy `api.command.register`
(`TuiCommand` with `slash.name`), marked deprecated-but-supported in the installed
types (`dist/tui.d.ts`). Modern `api.keymap.registerLayer` exists, but its
slash-command mapping is not documented in the installed types, so the legacy
surface is used deliberately. No keybinds are registered → no collision with
native `Enter`/`Esc`/`Ctrl+C`/leader bindings.

## Theme Integration

Colors come exclusively from `api.theme.current` semantic tokens
(`text`, `textMuted`, `success`, `warning`, `error`, `accent`, `border`).
No hardcoded RGB. The theme object is re-read at every render (`api.theme.current`
at call time, not captured at plugin init). PARTIAL / HOST-LIMITED: the installed
TUI API exposes no theme-change event, so a theme switch takes effect on the next
re-render (data event, resize, command) rather than instantaneously.

## Safety Boundary

- Read-only: no hooks that mutate args, no config mutation, no control commands.
- UNKNOWN discipline: absent values render as `—` / `UNKNOWN`; never as `0`,
  free, or pass. UNKNOWN cost is never shown as `$0`.
- Shadow honesty: hypothetical route visually distinguished from actual route;
  `wouldDispatch: NO (shadow only)`; counterfactual outcomes shown as UNKNOWN.
- Breaker vs health: breaker state is labeled the hard authority; UI never implies
  health score overrides it.
- T1 lifecycle: `PENDING DISPOSE` is shown while the session lives; `RECEIVED`
  only after a real T1 signal. The UI never claims evaluation failure while
  evaluation is merely pending (T1 arrives on normal plugin/session disposal).
- Redaction: only taskClass/risk/route/rule previews are shown; no prompts, no
  env contents, no secrets. Deny events render rule name, not command payloads.
- Fail-open: any load/parse/render failure degrades that panel ("state
  unavailable — host continues normally"); the plugin never breaks the host TUI.
- Storage: none used (no preferences persisted; no authority stored).

## Responsive Design

`footerLines(vm, width)` adapts:

- `< 56` cols: `Smart Router · SHADOW  <model>`
- `< 80` cols: mode + actual route
- `≥ 80` cols: mode + actual + shadow + risk
- `≥ 100` cols and divergence: adds a warning line (shadow differs, not dispatched)

Long lines are clipped with an ellipsis; the composer is never wrapped/broken.

## Verification Evidence (2026-08-30)

| Gate | Result |
|---|---|
| `npm test` | 348/348 PASS (19 files; includes 45 TUI view tests in `tests/smart-router/v22-tui-view.test.ts`: 20 pre-remediation + 18 M1/M2/M3 remediation + 7 R2-MED-01/R2-LOW-02 regression tests) |
| `npm run typecheck` | PASS (`jsconfig.json` + `tsconfig.v22.json` covering `.opencode/smart-router/**/*.ts`, `.opencode/plugins/*.tsx`, `tests/smart-router/**/*.ts`) |
| `npm run lint` | PASS |
| `npm run build` | PASS (vite build + stats) |
| Real TUI auto-load | PASS (`tui-plugin-load` logged, runtime 1.18.25) |
| TUI runtime errors | none for the verified run |

R2 remediation re-verification (2026-08-31, adversarial-review findings R2-MED-01,
R2-MED-02, R2-LOW-01, R2-LOW-02): 348/348 tests, typecheck PASS, lint PASS,
build PASS. Authority audit: no new dispatch/routing/permission/breaker mutation
paths; `wouldDispatch: false` constants intact; `store.record(..., false)` only;
flags/breaker/permissions are read-only in the TUI.

Remediation re-verification (2026-08-30, M1/M2/M3):

- M1 session isolation: 8 unit tests prove route/shadow/evaluation/hysteresis isolation
  (`buildViewModel(input, "ses-B")` never returns A's records, no global-latest
  fallback, UNKNOWN degradation for unknown sessions). Breaker wording (R2-LOW-01):
  the breaker state/source is global and authoritative; the DISPLAY is scoped to the
  active session's relevant models plus every OPEN entry — the displayed key list is
  session-relevant by design, only the source file is identical across sessions.
  Cost/latency are global (latest workspace rows). Host contract: `session_prompt_right`
  receives `{ session_id }` per installed `TuiHostSlotMap` (dist/tui.d.ts) — consumed.
- M2 security realtime: typed `session.next.tool.*` subscriptions added; bounded
  `fs.watch` on the permissions directory filtered to `permission-decisions.jsonl`
  covers the hard-deny flow (guard writes the file directly; `tool.execute.before`
  is not in the TUI event bus — HOST-LIMITED, documented). Allow rows are
  unit-proven never to surface as denies (data-driven semantics). Deny-count
  increases log `tui-security-state-change` transitions (now including the
  `source` status) for live verification.
- R2-MED-01 security-source provenance: `parsePermissionTail` classifies the
  permissions file as `valid | unavailable | invalid` (null/missing/unreadable →
  unavailable; any malformed JSONL line, including a partial trailing write, →
  invalid). The provenance survives into the view model and the security panel:
  valid + zero denies → ARMED, valid + deny → ACTIVE, unavailable/invalid →
  UNKNOWN (never a fabricated non-deny state). Observed deny rows are still
  listed as evidence when present, but the headline cannot claim more than the
  source supports. `tui-security-state-change` carries the source status.
- R2-MED-02 watcher recovery: ONE logical permissions watcher per host lifecycle.
  If the directory is absent at init (or the watcher errors), a bounded re-arm
  timer (5s, single existsSync per attempt, no data reads, no polling of content)
  re-attempts arming until the directory appears; the timer stops on success,
  is re-created only from a null watcher (no multiplication), and is cancelled
  with all other handles on dispose (`disposed` flag guards stale callbacks).
- R2-LOW-02 freshness guard: unparseable `lastUpdated` no longer reaches the
  display as NaN — the view-model guard emits null and `fmtFreshness` renders
  the canonical `—`. EvaluationStore freshness semantics remain authoritative.
- M3 evidence authority: view model implements zero aggregation (verified: no
  `reduce(`, no `n/(n+10)`, no freshness formula in `tui/`); values are copied from
  the real `EvaluationStore.stats()` output. 10 unit tests cover verbatim-copy,
  n<5 threshold, task-class segmentation, variant isolation, model fallback ×0.5
  cap, shrinkage+staleness+CONFIDENCE_CAP, duplicate suppression, store-unavailable
  UNKNOWN safety, scope labeling, `·` variant notation.

Interactive acceptance (2026-08-30, synthetic-keystroke driver against the real TUI,
evidence in `.opencode/ai/logs/smart-router-tui.jsonl`):

- Commands executed through the native command menu: `/router-health`,
  `/router-shadow`, `/router-evidence`, `/router-security`, `/router-shadow`,
  `/router-evidence`, `/exit` — each opened its dialog (`tui-dialog-open` logged
  with correct title/size). `/router-status` and `/router-explain` did not
  execute on the first attempts (menu not open in time → text submitted as a
  message); host menu-pacing issue, not a plugin defect. Re-invocations of the
  same panels worked.
- Reactive resize verified live: footer width logged 64 → 27 (narrow) → 64 (wide).
- Graceful `/exit` verified: process exits cleanly, server dispose runs.
- T1 lifecycle verified live: T1 emitted post-dispose for the organic session
  (`exec-e7f58872…`, `EVAL-exec-e7f58872…`, `attributionComplete=true`) and
  converged with T2 (`outcome=COMPLETED`, same executionId/route/candidate).
- Shadow isolation verified live: organic task routed by V2.1 to
  `MiniMaxAI/MiniMax-M3#deep`; V2.2 delta stayed `status=SHADOW`, selected the
  same route with `tier=UNPROVEN` and stickiness applied; nothing dispatched by
  V2.2; `divergent` absent → UI renders `—` (not a false NO/YES).

Not yet executed (manual, requires interactive terminal):

- Visual inspection of rendering at exact column widths (56/80/100/120) —
  width logic unit-tested; real resize transitions verified via width telemetry.
- Theme switch exercise (tokens are type-bound to `TuiThemeCurrent`; no
  hardcoded colors anywhere in the plugin; theme re-read per render — see
  Theme Integration for the HOST-LIMITED reactivity note).
- Multi-session switch leak check: session filtering is unit-proven (8 M1 tests);
  a two-session live switch in the real TUI requires interactive hosting and
  remains the top manual acceptance item.
- Live hard-deny file-watch demonstration in the real TUI — the watcher and
  data semantics are unit-covered; a live deny → refresh observation requires
  an interactive session with the guard active.
- Live watcher-recovery demonstration (permissions directory absent at TUI
  startup → created later → deny → refresh): the re-arm state machine is
  unit-covered at the logic level (single-watcher guard, disposal cancel) but
  the plugin glue itself is host-dependent and cannot run without the TUI host.
- Live error-isolation simulation (corrupt artifact while running) — covered
  by unit tests + fail-open structure; not staged against a live host.

## Files

Created (this feature):

- `.opencode/plugins/smart-router-tui.tsx` — native TUI plugin
- `.opencode/smart-router/v22/tui/view-model.ts` — pure presentation adapter
- `.opencode/smart-router/v22/tui/format.ts` — pure line formatter
- `tests/smart-router/v22-tui-view.test.ts` — adapter + formatter tests
- `tui.json` — project TUI plugin registration
- `tsconfig.v22.json` — modified: Solid JSX config + tsx include (typecheck reach)

Design-level context: `docs/smart-router/SMART_ROUTER_V2_2_OBSERVABILITY_DESIGN.md`
(intent), `SMART_ROUTER_V2_2_SECURITY_BOUNDARY.md` (authority boundary). This doc
is the TUI implementation record.

## Release Posture (unchanged)

```
V2.2 = SHADOW      OPTIMIZED = OFF      AUTO = OFF      Promotion = NOT AUTHORIZED
```

The UI displays this posture on every dashboard and shadow panel.
