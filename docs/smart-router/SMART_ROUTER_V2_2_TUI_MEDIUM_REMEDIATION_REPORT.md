# SMART ROUTER V2.2 TUI — MEDIUM FINDINGS REMEDIATION REPORT

Date: 2026-08-31
Baseline: `v2.2.0-shadow.1` (implementation commit `2c2bace`, tag sha `a1c09f3`, HEAD `061fe13`)
Scope: M1 session isolation · M2 realtime security freshness · M3 authoritative evidence
Machine evidence: `.opencode/ai/verification/v22-tui-remediation/`

## 1. Remediations

### MEDIUM-1 — Session Isolation: FIXED
- `buildViewModel(input, sessionId?)` filters session-specific records by exact
  `record.sessionId === sessionId`; hysteresis rows by `sessionId::taskClass::risk` key prefix.
- `session_prompt_right` now consumes the host `{ session_id }` (verified against installed
  `TuiHostSlotMap`); session views are derived per render from the same cached snapshot.
- No global-latest fallback for sessions: unknown session → UNKNOWN degradation.
- Global surfaces unchanged: `home_footer`, dialogs, breaker, capabilities, cost/latency.
- 7 unit tests prove route/shadow/evaluation/hysteresis isolation + global separation.

### MEDIUM-2 — Security Realtime: FIXED (mechanism) / HOST-LIMITED (literal event)
- Verified against installed SDK v2 `Event` union: `tool.execute.before/after` are server-plugin
  hooks, NOT TUI event-bus events. Not invented; not hacked around.
- Option A implemented: typed `session.next.tool.called/success/failed` subscriptions.
- Option C implemented: ONE bounded `fs.watch` on the permissions directory filtered to
  `permission-decisions.jsonl` — the exact file the guard's hard-deny path appends to
  (hard-deny emits no `permission.ask` event). Debounced via the existing 150 ms refresh
  path; single watcher; disposed on `onDispose`; error handler closes it (fail-open). No polling.
- Deny-count increases log `tui-security-state-change` transitions (live acceptance evidence).
- Negative control unit-proven: allow/permission.updated rows never surface as hard denies.
- Security policy itself: zero changes.

### MEDIUM-3 — Evidence Authority: FIXED
- All UI-side aggregation removed (plain mean, `n/(n+10)`, threshold, freshness, source
  derivation, tail aggregation loop, dead `latestBy` helper). Verified: 0 `reduce(`/mean
  formulas remain in the `tui/` layer.
- Plugin builds a read-only `EvaluationStore` over the SAME bounded 400-row signal tail
  (`record(signal, flush=false)` — `load()` never called, nothing persisted) and passes the
  authoritative `stats()` output to the view model. One aggregation implementation: the store's.
- View model consumes `resolveObservedQuality` (variant segment → model fallback with the
  ×0.5 inheritance cap) and copies values verbatim; formats only.
- Segmentation honored: taskClass × candidate; task-class scope labeled on the panel;
  route-relevant candidates without aggregates render honest `UNPROVEN` (nulls).
- 9 unit tests: verbatim copy, n<5 threshold, segmentation, variant isolation, model fallback
  cap, shrinkage+staleness+`CONFIDENCE_CAP` (0.046 vs naive 0.333), duplicate/merge suppression,
  store-unavailable UNKNOWN safety, scope + `·` notation.

## 2. LOW Findings
- LOW-1 theme: FIXED (partial) — re-read per render; no theme-change event in installed API
  → documented PARTIAL/HOST-LIMITED (was an overclaim before).
- LOW-2 negatives: FIXED — `asNum` rejects `v < 0`.
- LOW-3 risk at narrow width: FIXED — risk included in the <80 footer before clip.
- LOW-4 legacy `api.command`: ACCEPTED DEBT (unchanged, per brief).
- LOW-5 evaluation tail edge: ACCEPTED DEBT (bounded-tail is a deliberate performance ceiling).
- LOW-6 variant notation: FIXED — `model · variant` rendering for shadow label + evidence keys.

## 3. Verification

| Gate | Result |
|---|---|
| `npm test` | 341/341 PASS (19 files; +18 remediation tests, 0 removed/weakened) |
| `npm run typecheck` | PASS |
| `npm run lint` | PASS |
| `npm run build` | PASS |

Failure isolation: view-model builders wrapped fail-open; store/watcher/corrupt-file paths
degrade to UNKNOWN-safe panels; zero exception escapes into the host (I-SAFE-11).
Performance: unchanged read bounds (TAIL 120 / 400 signals); store stats over the same tail;
single debounce timer + one file watcher; no polling; no full-corpus reads.

## 4. Change Audit
- Changed (remediation scope only): `.opencode/plugins/smart-router-tui.tsx`,
  `.opencode/smart-router/v22/tui/view-model.ts`, `.opencode/smart-router/v22/tui/format.ts`,
  `tests/smart-router/v22-tui-view.test.ts`, implementation doc claims corrected.
- Unchanged: V2.1 routing/permission/breaker/security authority, V2.2 scoring, gates,
  capability/evidence semantics, schema, flags, shadow protocol, corpus semantics.
- Authority-changing operations in TUI sources: 0 (grep-audited).
- V2.1 Impact: ZERO. V2.2 stays SHADOW; `shadowZeroInfluence` true.

## 5. Residual / Not Executed (honest gaps)
- Interactive two-session TUI switch and live deny→refresh observation require an interactive
  host; session filtering and watcher semantics are unit-proven, live demonstration not staged
  (manual acceptance item). Machine evidence: `session-isolation.json`, `security-realtime.json`.
- `tui-security-watch` / `tui-security-state-change` log rows will appear in
  `.opencode/ai/logs/smart-router-tui.jsonl` on the next live TUI run.

## Final Verdict: PASS WITH DEBT
(Debt: LOW-4 legacy command API, LOW-5 tail edge, plugin-glue unit testing, live two-session demonstration.)

Production: OFF · Optimized: OFF · AUTO: OFF · Promotion: NOT AUTHORIZED
