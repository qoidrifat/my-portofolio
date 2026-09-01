# ISR — Interrupt → Switch → Replay (V2.2, F-01 remediation)

Status: **implemented, NOT committed** — pending independent re-review.
Supersedes the v1 chat.message-timed design (BLOCKED: critical session deadlock).

## What ISR is

Opt-in host cooperation layer on top of the V2.1 router recommendation. When the live
model differs from the router's recommendation, ISR **executes the recommendation on the
current turn**: terminate the just-started generation, switch the session model, replay
the original prompt on the new model. The coordinator only *executes* router decisions —
it never selects models (decision boundary preserved).

## Critical safety property (F-01 fix)

v1 interrupted **before the first provider step started** (chat.message fires ~0.7–1.0 s
after prompt admission; step.started ~1.1 s). Measured result: the host never recovered —
message stored, zero steps, zero assistant output, session stranded. Reproduced 4×.

v2 **never mutates anything at chat.message**. The turn is registered as a dormant intent;
the run begins only when the turn's own `session.next.step.started` is observed, i.e.
only while a generation is actually ACTIVE. A pre-step interrupt is structurally
impossible. All waits are event-driven with bounded timeouts (30 s step / 10 s
termination / 10 s replay, injectable) — no polling loops.

Additionally (measured, `isr-phase8-probe`): `POST /model` never reroutes an
already-admitted turn — the provider request keeps the model bound at admission. Hence
interrupt + replay is the only way to move the CURRENT turn (RESTART-ON-SWITCH).

## Execution pipeline (CASE B)

```
chat.message ──gates──▶ register intent (ZERO host mutation)
                             │
session.next.step.started ───▼  (model must match the pre-switch model)
  INTERRUPT_REQUESTED ─▶ POST /interrupt
  ── require step.ended / step.failed within 10 s ──▶ INTERRUPT_CONFIRMED   (204 alone proves nothing)
  ── re-read session model: user manual switch? abort, preserve choice (F-05)
  ─▶ POST /model (target) ── require GET session == target ──▶ SWITCH_CONFIRMED
  ─▶ POST /prompt (original text) ──▶ REPLAY_ADMITTED
  ── require the replay's own step.started within 10 s ──▶ REPLAY_STARTED ─▶ COMPLETED
```

Any failed gate → `model-switch-failed` (+ verified single-attempt restore when the model
was already switched; `RESTORED` only after GET-confirmation, else `RESTORE_FAILED`).
Replay admitted but never stepping → `FAILED`, no restore (documented: the turn is lost
on the new model, the session stays usable).

## Eligibility gates (all synchronous at chat.message, fail-closed)

| Gate | Rationale |
|---|---|
| mode `auto` only | `off`/`advisory` never touch the host; unsupported modes (incl. any future "force") degrade to off. No FORCE mode exists. |
| non-null target (D-COLD skip) | router said "stay" |
| non-text parts → skip | replay is text-only; attachments would be dropped (F-02, explicit exclusion) |
| original prompt non-empty | nothing to replay |
| registry validation of target | host accepts ANY model at `POST /model` (measured: 204 for invalid ids) — fail-closed when no validator (F-03) |
| one operation per turn (host messageId) | idempotency across duplicate triggers |
| coalesce per session | one pending intent max |
| session busy (active step) | the next step.started would belong to the previous run — interrupting it would destroy unrelated work |
| step model must match pre-switch model | never touch a step dispatched on an unexpected model |

## Honest telemetry (`telemetry/v22/model-switch-events.jsonl`)

`INTERRUPT_CONFIRMED` only with termination evidence; `COMPLETED` only with the replay's
own step.started; `204` responses are never reported as "interrupted". Event kinds:
`model-switch-requested` (INTENT_REGISTERED / INTERRUPT_REQUESTED), `-interrupted`
(INTERRUPT_CONFIRMED), `-switched` (SWITCH_CONFIRMED), `-replayed` (REPLAY_ADMITTED /
REPLAY_STARTED), `-failed`, `-restored`, `-skipped`. No prompt content, no secrets.

## Race & lifecycle hygiene

- Manual model switch between evaluation and commit → abort, user selection preserved (F-05).
- Every HTTP op bounded by `AbortSignal.timeout(10 s)` (F-06).
- Per-session bookkeeping (intents, handled turns, active-step counter) pruned on `session.idle`; `dispose()` clears timers (F-07).
- Restore verified against session state, single attempt, no retry loops (F-08).

## Enabling (testing only)

```jsonc
// .opencode/v22-isr-flags.json — separate from v22-flags.json
{ "mode": "auto" }
```

Default: **off**. Advisory mode logs the would-be switch and does nothing. The TUI shows
toasts on the authoritative `session.next.model.switched` host event (deduped).

## Verification (2026-08-31)

- Unit: 29/29 (`tests/smart-router/isr-coordinator.test.ts`) — mode gates, eligibility,
  deferred-trigger invariant, evidence ladder, F-05 race, restore paths, lifecycle.
- Full regression: 377/377 · typecheck · lint · build: PASS.
- Live E2E (isolated temp `.opencode` copy, ISR auto, 9router variant switch): PASS —
  full pipeline observed, process exits, no stranded session. See final report.
- Known limitation (documented, not fixed): replay drops non-text parts; turns with
  attachments are skipped entirely.
