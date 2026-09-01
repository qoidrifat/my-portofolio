// Smart Router V2.2 — ISR (Abort → Switch → Replay) coordinator. F-01 REMEDIATION.
//
// RUNTIME FACTS (measured against OpenCode 1.18.25, 2026-09-01, live disposable E2E):
//   - v2 /api/session/:id/interrupt terminates ONLY the current provider call: a multi-step
//     agent loop CONTINUES (measured: 5 further tool-call steps after the interrupt) — the
//     original turn completes on the admission model. Interrupt-based restart is unsafe.
//   - legacy POST /session/:id/abort (SessionHttpApi.abort → SessionPrompt.cancel) stops the
//     ENTIRE agent loop (measured: zero new steps after abort, 25s+) and the session accepts
//     a new prompt immediately afterwards (measured: follow-up generated normally). Side
//     effect: a step aborted before its first stream byte is left stranded (no finish field).
//   - switchModel NEVER reroutes the already-admitted turn (model bound at admission); it
//     only affects subsequent turns (measured).
//
// CONSEQUENT DESIGN (abort-then-switch-then-replay, no blind replay):
//   chat.message → register intent (ZERO host mutation) → wait for the authoritative
//   step ACTIVE of THIS turn + first streamed byte → ABORT (whole loop) →
//   require POSITIVE abort-confirmation evidence: step termination (finish error)
//   or session idle — timeout without evidence = ABORT_UNCONFIRMED (fail-closed) →
//   re-check live model → switch → confirm via session state → replay original text →
//   require the replay's own step.started AND the replay assistant finishing with
//   finish:"stop" → only then REPLAY_COMPLETED. A replay that finishes with
//   finish:"error" FAILS the operation (measured live: a replay can be admitted and
//   start yet still error — admission/start prove nothing by themselves).
//   An original turn that completes normally after the abort (abort was a no-op) is a
//   duplicate-execution guard: the operation is dropped, the user's successful response
//   is preserved. All waits are event-driven with bounded timeouts.
//
// Safety contract:
//   - modes: off | advisory | auto (auto requires the separate ISR flag file). No FORCE.
//   - decision boundary: the coordinator EXECUTES a V2.1 recommendation; it never picks models.
//   - target must pass the registry validator (fail-closed when absent) — the host
//     accepts invalid models at POST /model (measured), so HTTP success proves nothing.
//   - turn with non-text parts (files etc.) is never eligible: replay is text-only (F-02).
//   - session-busy turns (steered into an active run) are never eligible.
//   - one logical user turn → at most one ISR operation (messageId identity).
//   - manual model change between evaluation and switch aborts ISR (user choice preserved).
//   - restore is verified against session state: RESTORED only after confirmation,
//     RESTORE_FAILED otherwise, single attempt, no retry.
//   - structured JSONL events only: no prompts, no secrets, no command payloads.

import { appendJsonl, LOG } from "../logger.ts"
import { parseQualifiedModel } from "./evaluation-store.ts"

export type IsrState =
  | "IDLE"
  | "WAITING_STEP"
  | "ABORTING"
  | "SWITCHING"
  | "REPLAYING"
  | "REPLAY_COMPLETED"
  | "FAILED"
  | "RESTORED"
  | "RESTORE_FAILED"

export type IsrLogKind =
  | "model-switch-requested"
  | "model-switch-aborted"
  | "model-switched"
  | "model-switch-replayed"
  | "model-switch-failed"
  | "model-switch-restored"
  | "model-switch-skipped"

export interface IsrModelRef {
  providerID: string
  modelID: string
  variant?: string | null
}

/** Host operations the coordinator drives. All failures reject. */
export interface IsrOps {
  /**
   * Abort the session's ENTIRE agent loop (legacy POST /session/:id/abort — measured
   * 1.18.25 semantics: stops all processing for the session; interrupt only kills the
   * current provider call and lets the loop continue). Only called with an active step.
   */
  abort(sessionId: string): Promise<void>
  /** Switch the model used by SUBSEQUENT provider turns (restart-on-switch). */
  switchModel(sessionId: string, model: IsrModelRef): Promise<void>
  /** Durably submit the original logical prompt text. */
  prompt(sessionId: string, text: string): Promise<void>
  /** Current session model (authoritative host state), or null when unknown. */
  getSessionModel(sessionId: string): Promise<IsrModelRef | null>
}

export interface IsrTimings {
  /** Intent expiry while waiting for the turn's step to become active. */
  waitingMs: number
  /**
   * Max wait for POSITIVE abort-confirmation evidence after the abort op (step
   * termination / session idle). Timeout without evidence = ABORT_UNCONFIRMED
   * (fail-closed; HTTP 200 alone proves nothing).
   */
  abortMs: number
  /** Max wait for the replay's own step.started after admission. */
  replayMs: number
  /** Max wait for the replay assistant to finish after its step started. */
  replayDoneMs: number
}

export const DEFAULT_ISR_TIMINGS: IsrTimings = {
  waitingMs: 30_000,
  abortMs: 10_000,
  replayMs: 10_000,
  replayDoneMs: 30_000,
}

export interface IsrDeps {
  ops: IsrOps
  mode: () => "off" | "advisory" | "auto"
  /** Registry membership check for the switch target (F-03). Fail-closed when absent. */
  validateTarget?: (model: IsrModelRef) => boolean
  log?: (record: Record<string, unknown>) => void
  now?: () => number
  uuid?: () => string
  timings?: Partial<IsrTimings>
}

export interface IsrTriggerInput {
  sessionId: string
  /** Host message id of the user turn (event identity for idempotency). */
  messageId?: string | null
  /** Live model the host is about to dispatch (input.model from chat.message). */
  currentModel: { providerID: string; modelID: string } | null
  currentVariant?: string | null
  /** Router recommendation (V2.1 decision path) — qualified "provider/model" id or null. */
  recommendedModel: string | null
  recommendedVariant?: string | null
  reason?: string
  /** True when the turn carries non-text parts (files etc.) — replay is text-only (F-02). */
  hasNonTextParts?: boolean
  /** Original logical user prompt text (from chat.message output.parts). Never logged. */
  originalPrompt: string
}

export interface IsrTriggerResult {
  action: "intent-registered" | "coalesced" | "advisory-noop" | "off" | "skipped"
  reason: string
  operationId?: string
}

type IntentPhase = "WAITING_STEP" | "ABORTING" | "SWITCHING" | "REPLAYING"

interface IsrIntent {
  sessionId: string
  operationId: string
  from: IsrModelRef
  to: IsrModelRef
  reason: string
  originalPrompt: string
  phase: IntentPhase
  timers: ReturnType<typeof setTimeout>[]
  /** Resolvers for the event-driven waits (abort evidence / replay step / replay finish). */
  resolveAbort?: () => void
  resolveReplay?: () => void
  resolveReplayDone?: () => void
  /**
   * Evidence latches: events that arrive while the corresponding waiter is not yet
   * armed (between op call and waitFor) must not be lost.
   */
  aborted?: boolean
  replayStarted?: boolean
  /**
   * The turn's assistant message appeared on the expected (pre-switch) model, but the
   * provider stream has not produced bytes yet. Measured (live E2E 2026-08-31): abort /
   * interrupt issued at assistant-creation — before the first stream byte — leaves the
   * step stranded/blocked. Aborting mid-stream is the proven-safe window, so the run
   * waits for the first streamed delta before issuing the abort.
   */
  stepModelConfirmed?: boolean
  /** Set when the ORIGINAL turn completes normally after the abort (abort was a no-op). */
  originalCompleted?: boolean
  /** The replay assistant's finish reason, latched when it completes. */
  replayFinished?: string
}

const sameModel = (a: IsrModelRef, b: IsrModelRef): boolean =>
  a.providerID === b.providerID && a.modelID === b.modelID && (a.variant ?? null) === (b.variant ?? null)

/** Variant-insensitive identity: step events may normalize variants. */
const sameProviderModel = (a: IsrModelRef, b: IsrModelRef): boolean =>
  a.providerID === b.providerID && a.modelID === b.modelID

export class IsrCoordinator {
  private readonly ops: IsrOps
  private readonly mode: () => "off" | "advisory" | "auto"
  private readonly validateTarget?: (model: IsrModelRef) => boolean
  private readonly logFn: (record: Record<string, unknown>) => void
  private readonly now: () => number
  private readonly uuid: () => string
  private readonly timings: IsrTimings
  /** sessionId -> pending intent (also the in-flight/coalescing tracker). */
  private readonly intents = new Map<string, IsrIntent>()
  /** sessionId -> messageId already handled this turn (one operation per turn). */
  private readonly handledTurns = new Map<string, string>()
  /** sessionId -> count of currently active steps (event-driven, reset on session.idle). */
  private readonly activeSteps = new Map<string, number>()
  /** sessionId -> observable state for UI projection. */
  private readonly states = new Map<string, IsrState>()
  private disposed = false

  constructor(deps: IsrDeps) {
    this.ops = deps.ops
    this.mode = deps.mode
    this.validateTarget = deps.validateTarget
    this.logFn = deps.log ?? (() => {})
    this.now = deps.now ?? (() => Date.now())
    this.uuid = deps.uuid ?? (() => crypto.randomUUID())
    this.timings = { ...DEFAULT_ISR_TIMINGS, ...deps.timings }
  }

  stateOf(sessionId: string): IsrState {
    return this.states.get(sessionId) ?? "IDLE"
  }

  private emit(kind: IsrLogKind, sessionId: string, fields: Record<string, unknown>): void {
    this.logFn({
      timestamp: new Date(this.now()).toISOString(),
      kind,
      operationId: fields.operationId ?? null,
      sessionId,
      from: fields.from ?? null,
      to: fields.to ?? null,
      variant: fields.variant ?? null,
      reason: fields.reason ?? null,
      status: fields.status ?? null,
      state: fields.state ?? null,
    })
  }

  /**
   * Evaluate a chat.message turn and register an ISR intent. ZERO host mutation here:
   * the run only begins once the turn's own step is observed ACTIVE. Synchronous
   * eligibility gate; never blocks the hook.
   */
  registerIntent(input: IsrTriggerInput): IsrTriggerResult {
    const mode = this.mode()
    if (mode === "off") return { action: "off", reason: "isr mode off" }
    if (mode === "advisory") return { action: "advisory-noop", reason: "advisory mode never switches" }
    // fail-closed: only the three known modes act; anything else (incl. a future
    // "force") degrades to off semantics. There is no FORCE mode.
    if (mode !== "auto") return { action: "off", reason: `unsupported isr mode "${mode}" (fail-closed)` }
    if (this.disposed) return { action: "skipped", reason: "coordinator disposed" }

    const target = this.resolveTarget(input.recommendedModel, input.recommendedVariant)
    if (!target) return { action: "skipped", reason: "no eligible target (null recommendation / D-COLD)" }
    if (!input.currentModel) return { action: "skipped", reason: "unknown current model" }
    if (input.hasNonTextParts) return { action: "skipped", reason: "non-text parts unsupported (F-02): replay is text-only" }
    if (!input.originalPrompt.trim()) return { action: "skipped", reason: "empty original prompt" }

    const from: IsrModelRef = {
      providerID: input.currentModel.providerID,
      modelID: input.currentModel.modelID,
      variant: input.currentVariant ?? null,
    }
    if (sameModel(from, target)) return { action: "skipped", reason: "recommended model equals current" }

    // F-03: the host accepts ANY model at POST /model (measured 204 on invalid ids),
    // so the target must be validated against the registry here. Fail-closed.
    if (!this.validateTarget) return { action: "skipped", reason: "target validation unavailable (fail-closed)" }
    if (!this.validateTarget(target)) {
      return { action: "skipped", reason: "target not in model registry (fail-closed)" }
    }

    // One operation per logical user turn (event identity: host messageId when present).
    if (input.messageId && this.handledTurns.get(input.sessionId) === input.messageId) {
      return { action: "skipped", reason: "turn already handled" }
    }
    // One pending intent per session (coalesce duplicate/concurrent triggers) — checked
    // BEFORE the busy gate: a pending intent already covers this session.
    if (this.intents.has(input.sessionId)) {
      if (input.messageId) this.handledTurns.set(input.sessionId, input.messageId)
      return { action: "coalesced", reason: "intent already pending for session" }
    }
    // Session busy (steered into an active run): the next step.started would belong to
    // the PREVIOUS run — interrupting it would destroy unrelated work. Never eligible.
    if ((this.activeSteps.get(input.sessionId) ?? 0) > 0) {
      if (input.messageId) this.handledTurns.set(input.sessionId, input.messageId)
      return { action: "skipped", reason: "session busy (active step)" }
    }

    if (input.messageId) this.handledTurns.set(input.sessionId, input.messageId)
    const operationId = `isr-${this.uuid()}`
    const intent: IsrIntent = {
      sessionId: input.sessionId,
      operationId,
      from,
      to: target,
      reason: input.reason ?? "router recommendation",
      originalPrompt: input.originalPrompt,
      phase: "WAITING_STEP",
      timers: [],
    }
    this.intents.set(input.sessionId, intent)
    this.states.set(input.sessionId, "WAITING_STEP")
    this.emit("model-switch-requested", input.sessionId, {
      operationId,
      from: `${from.providerID}/${from.modelID}`,
      to: `${target.providerID}/${target.modelID}`,
      variant: target.variant ?? null,
      reason: intent.reason,
      status: "INTENT_REGISTERED:waiting-active-step",
      state: "WAITING_STEP",
    })
    this.arm(intent, this.timings.waitingMs, () => {
      this.dropIntent(intent, "no-interrupt-window (intent expired)")
    })
    return { action: "intent-registered", reason: "waiting for active step", operationId }
  }

  /**
   * Event-driven lifecycle input. Must be cheap and synchronous.
   *
   * Two vocabularies are accepted (verified against OpenCode 1.18.25):
   *  - SSE bus (/event): session.next.step.started (props.model {providerID, id}),
   *    session.next.step.ended, session.next.step.failed, session.idle.
   *  - PLUGIN event hook (the one the plugin actually receives — measured: the SSE-only
   *    session.next.step.* events NEVER reach it): message.updated (assistant info carries
   *    providerID/modelID; finish:"stop"/"error" = termination evidence), session.status
   *    (status.type "busy"/"idle" = generation active/idle), session.idle.
   */
  noteEvent(type: string, props: Record<string, unknown> | undefined): void {
    try {
      const sid = String(props?.sessionID ?? "")
      if (!sid) return
      if (type === "message.updated") {
        this.onMessageUpdated(sid, props)
        const info = props?.info as { finish?: string } | undefined
        if (info?.finish) this.onReplayFinished(sid, info.finish)
      } else if (type === "message.part.delta" || type === "message.part.updated") this.onPartDelta(sid)
      else if (type === "session.status") this.onSessionStatus(sid, props)
      else if (type === "session.next.step.started") this.onStepStarted(sid, props)
      else if (type === "session.next.step.ended" || type === "session.next.step.failed") this.onStepTerminated(sid)
      else if (type === "session.idle") this.onSessionIdle(sid)
    } catch {
      // lifecycle observation must never break the host event pipeline
    }
  }

  /**
   * Streamed bytes for the session. In WAITING_STEP this is the final trigger condition:
   * the step is confirmed on the expected model AND provably streaming (the measured-safe
   * abort window). In REPLAYING it is accepted as replay execution evidence.
   */
  private onPartDelta(sid: string): void {
    const intent = this.intents.get(sid)
    if (!intent) return
    if (intent.phase === "WAITING_STEP" && intent.stepModelConfirmed) this.beginRun(intent)
    else if (intent.phase === "REPLAYING") {
      intent.replayStarted = true
      intent.resolveReplay?.()
    }
  }

  /** Plugin-context step signals: assistant message.created/completed. */
  private onMessageUpdated(sid: string, props: Record<string, unknown> | undefined): void {
    const info = props?.info as
      | { role?: string; finish?: string; providerID?: string; modelID?: string }
      | undefined
    if (!info || info.role !== "assistant") return
    if (info.finish) {
      // termination evidence with finish reason (stop = completed, error = aborted/failed)
      this.onStepTerminated(sid, info.finish)
      return
    }
    // step ACTIVE with the authoritative dispatch model
    const stepKey = info.providerID && info.modelID ? `${info.providerID}/${info.modelID}` : null
    this.onStepActive(sid, stepKey)
  }

  /** Plugin-context busy/idle: idempotent active-generation tracking (busy can repeat per step). */
  private onSessionStatus(sid: string, props: Record<string, unknown> | undefined): void {
    const st = (props?.status as { type?: string } | undefined)?.type
    if (st === "busy") this.activeSteps.set(sid, Math.max(1, this.activeSteps.get(sid) ?? 0))
    else if (st === "idle") {
      this.activeSteps.set(sid, 0)
      // positive abort evidence: the host itself reports the session idle again
      const intent = this.intents.get(sid)
      if (intent?.phase === "ABORTING") {
        intent.aborted = true
        intent.resolveAbort?.()
      }
    }
  }

  dispose(): void {
    this.disposed = true
    for (const intent of this.intents.values()) this.clearTimers(intent)
    this.intents.clear()
    this.handledTurns.clear()
    this.activeSteps.clear()
    this.states.clear()
  }

  // ---------- event handlers ----------

  private onStepStarted(sid: string, props: Record<string, unknown> | undefined): void {
    this.activeSteps.set(sid, (this.activeSteps.get(sid) ?? 0) + 1)
    const m = props?.model as { providerID?: string; id?: string } | undefined
    const stepKey = m?.providerID && m?.id ? `${m.providerID}/${m.id}` : null
    this.onStepActive(sid, stepKey)
  }

  /** A step went ACTIVE on stepKey. Confirms the model; the abort waits for stream bytes. */
  private onStepActive(sid: string, stepKey: string | null): void {
    const intent = this.intents.get(sid)
    if (!intent) return
    if (intent.phase === "REPLAYING") {
      // the replay's own step.started: latch it, then wake the waiter
      intent.replayStarted = true
      intent.resolveReplay?.()
      return
    }
    if (intent.phase !== "WAITING_STEP") return
    const toKey = `${intent.to.providerID}/${intent.to.modelID}`
    const fromKey = `${intent.from.providerID}/${intent.from.modelID}`
    if (stepKey === toKey) {
      // the turn is already executing on the target (someone switched earlier) — done.
      this.dropIntent(intent, "already-on-target-step")
      return
    }
    if (stepKey !== fromKey) {
      // the step belongs to an unexpected model — do not touch it.
      this.dropIntent(intent, `step-model-unexpected:${stepKey ?? "unknown"}`)
      return
    }
    // The turn's own step is ACTIVE on the expected model. Do NOT abort yet: the
    // provider stream has not produced bytes (measured: aborting there strands the step).
    // The first streamed delta triggers beginRun (the proven-safe mid-stream window).
    intent.stepModelConfirmed = true
  }

  /**
   * Step termination. In ABORTING this is abort-confirmation evidence. A termination
   * with finish:"stop" during WAITING_STEP/ABORTING means the ORIGINAL turn completed
   * normally — the abort was a no-op (e.g. the generation finished before the abort
   * landed). Resuming the turn would be duplicate execution, so the operation is
   * dropped (the user's successful response is preserved).
   */
  private onStepTerminated(sid: string, finish?: string): void {
    this.activeSteps.set(sid, Math.max(0, (this.activeSteps.get(sid) ?? 0) - 1))
    const intent = this.intents.get(sid)
    if (!intent) return
    // ABORTING only (the confirmed step belongs to THIS turn): finish:"stop" means the
    // original turn completed normally — the abort was a no-op — and replaying now would
    // double-execute it. Drop the operation; the user keeps their successful response.
    // A finish:"stop" during WAITING_STEP belongs to the PREVIOUS turn (chat.message
    // fires before this turn's step starts) and must NOT drop the intent.
    if (finish === "stop" && intent.phase === "ABORTING") {
      intent.originalCompleted = true
      intent.resolveAbort?.()
      return
    }
    if (intent.phase === "ABORTING") {
      intent.aborted = true
      intent.resolveAbort?.()
    }
  }

  /**
   * Replay-finish evidence: the replay assistant must finish with finish:"stop".
   * A replay finishing with finish:"error" FAILS the operation (measured live: a
   * replay can be admitted and stream yet still error).
   */
  private onReplayFinished(sid: string, finish: string): void {
    const intent = this.intents.get(sid)
    if (!intent || intent.phase !== "REPLAYING") return
    intent.replayFinished = finish
    intent.resolveReplayDone?.()
  }

  private onSessionIdle(sid: string): void {
    const intent = this.intents.get(sid)
    if (intent?.phase === "WAITING_STEP") this.dropIntent(intent, "session-idle-before-step")
    // SSE-bus session.idle is also positive abort evidence.
    if (intent?.phase === "ABORTING" && !intent.originalCompleted) {
      intent.aborted = true
      intent.resolveAbort?.()
    }
    // F-07: bounded per-session bookkeeping.
    this.handledTurns.delete(sid)
    this.activeSteps.set(sid, 0)
    if (!intent) this.states.delete(sid)
  }

  // ---------- the run (only reachable with an ACTIVE step) ----------

  private beginRun(intent: IsrIntent): void {
    intent.phase = "ABORTING"
    this.states.set(intent.sessionId, "ABORTING")
    this.emit("model-switch-requested", intent.sessionId, this.base(intent, "ABORT_REQUESTED", "ABORTING"))
    void this.run(intent).catch((e) => {
      this.failIntent(intent, `run-error:${String(e).slice(0, 120)}`, false)
    })
  }

  private async run(intent: IsrIntent): Promise<void> {
    const sid = intent.sessionId

    // 1) abort the WHOLE agent loop — valid only because the step was observed ACTIVE.
    try {
      await this.ops.abort(sid)
    } catch (e) {
      this.failIntent(intent, `abort-failed:${String(e).slice(0, 120)}`, false)
      return
    }
    // 2) abort-confirmation evidence — 200 "true" alone proves nothing (idle no-op also
    //    returns 200). Accepted evidence is POSITIVE only: step termination (finish
    //    error/aborted) or session idle. Timeout without evidence = ABORT_UNCONFIRMED
    //    (fail-closed; no absence-based heuristics — a quiet window proves nothing).
    const aborted = await this.waitFor(intent, "abort", this.timings.abortMs)
    if (intent.originalCompleted) {
      // the original turn finished normally — aborting it was too late. Never replay:
      // that would double-execute the turn. User keeps their successful response.
      this.dropIntent(intent, "original-completed-before-abort (duplicate-execution guard)")
      return
    }
    if (!aborted) {
      this.failIntent(intent, "ABORT_UNCONFIRMED:no-termination-evidence", false)
      return
    }
    this.emit("model-switch-aborted", sid, this.base(intent, "ABORT_CONFIRMED", "ABORTING"))

    // 3) F-05: manual user switch between evaluation and switch — abort, preserve choice.
    let live: IsrModelRef | null = null
    try {
      live = await this.ops.getSessionModel(sid)
    } catch {
      live = null
    }
    if (live && !sameProviderModel(live, intent.from)) {
      this.dropIntent(intent, `live-model-changed:${live.providerID}/${live.modelID} (user selection preserved)`)
      return
    }

    // 4) switch + authoritative confirmation.
    intent.phase = "SWITCHING"
    this.states.set(sid, "SWITCHING")
    try {
      await this.ops.switchModel(sid, intent.to)
    } catch (e) {
      this.failIntent(intent, `switch-failed:${String(e).slice(0, 120)}`, true)
      return
    }
    let nowModel: IsrModelRef | null = null
    try {
      nowModel = await this.ops.getSessionModel(sid)
    } catch {
      nowModel = null
    }
    if (!nowModel || !sameModel(nowModel, intent.to)) {
      this.failIntent(intent, "switch-not-confirmed", true)
      return
    }
    this.emit("model-switched", sid, this.base(intent, "SWITCH_CONFIRMED", "REPLAYING"))

    // 5) replay the original logical prompt text.
    intent.phase = "REPLAYING"
    this.states.set(sid, "REPLAYING")
    try {
      await this.ops.prompt(sid, intent.originalPrompt)
    } catch (e) {
      this.failIntent(intent, `replay-admission-failed:${String(e).slice(0, 120)}`, true)
      return
    }
    this.emit("model-switch-replayed", sid, this.base(intent, "REPLAY_ADMITTED", "REPLAYING"))

    // 6) REPLAY_STARTED requires the replay's own step.started — admission proves nothing.
    const started = await this.waitFor(intent, "replay", this.timings.replayMs)
    if (!started) {
      this.failIntent(intent, "REPLAY_UNCONFIRMED:no-step-started", false)
      return
    }
    this.emit("model-switch-replayed", sid, this.base(intent, "REPLAY_STARTED", "REPLAYING"))

    // 7) REPLAY_COMPLETED requires the replay assistant to finish with finish:"stop"
    //    (measured live: a replay can start and still error — HTTP 401 case).
    const done = await this.waitFor(intent, "replayDone", this.timings.replayDoneMs)
    if (!done) {
      this.failIntent(intent, "REPLAY_UNCONFIRMED:no-stop-finish", false)
      return
    }
    if (intent.replayFinished !== "stop") {
      this.failIntent(intent, `REPLAY_FAILED:finish=${intent.replayFinished ?? "unknown"}`, true)
      return
    }
    this.emit("model-switch-replayed", sid, this.base(intent, "REPLAY_COMPLETED", "REPLAY_COMPLETED"))
    this.states.set(sid, "REPLAY_COMPLETED")
    this.finishIntent(intent)
  }

  // ---------- failure / cleanup ----------

  private failIntent(intent: IsrIntent, status: string, restore: boolean): void {
    this.states.set(intent.sessionId, "FAILED")
    this.emit("model-switch-failed", intent.sessionId, this.base(intent, status, "FAILED"))
    this.finishIntent(intent)
    if (!restore) return
    // Single restore attempt, verified — no retry loops (F-08/F-16).
    void this.restore(intent).catch(() => {})
  }

  private async restore(intent: IsrIntent): Promise<void> {
    try {
      this.states.set(intent.sessionId, "SWITCHING")
      await this.ops.switchModel(intent.sessionId, intent.from)
      const model = await this.ops.getSessionModel(intent.sessionId)
      if (model && sameModel(model, intent.from)) {
        this.states.set(intent.sessionId, "RESTORED")
        this.emit("model-switch-restored", intent.sessionId, this.base(intent, "restored-verified", "RESTORED"))
      } else {
        this.states.set(intent.sessionId, "RESTORE_FAILED")
        this.emit("model-switch-failed", intent.sessionId, this.base(intent, "restore-unconfirmed", "RESTORE_FAILED"))
      }
    } catch (e) {
      this.states.set(intent.sessionId, "RESTORE_FAILED")
      this.emit("model-switch-failed", intent.sessionId, this.base(intent, `restore-failed:${String(e).slice(0, 120)}`, "RESTORE_FAILED"))
    }
  }

  private dropIntent(intent: IsrIntent, reason: string): void {
    this.clearTimers(intent)
    this.intents.delete(intent.sessionId)
    this.states.set(intent.sessionId, "IDLE")
    this.emit("model-switch-skipped", intent.sessionId, { ...this.base(intent, reason, "IDLE"), status: reason })
  }

  private finishIntent(intent: IsrIntent): void {
    this.clearTimers(intent)
    this.intents.delete(intent.sessionId)
  }

  // ---------- helpers ----------

  private base(intent: IsrIntent, status: string, state: IsrState): Record<string, unknown> {
    return {
      operationId: intent.operationId,
      from: `${intent.from.providerID}/${intent.from.modelID}`,
      to: `${intent.to.providerID}/${intent.to.modelID}`,
      variant: intent.to.variant ?? null,
      reason: intent.reason,
      status,
      state,
    }
  }

  private arm(intent: IsrIntent, ms: number, fn: () => void): void {
    const t = setTimeout(() => {
      intent.timers = intent.timers.filter((x) => x !== t)
      fn()
    }, ms)
    intent.timers.push(t)
  }

  private clearTimers(intent: IsrIntent): void {
    for (const t of intent.timers) clearTimeout(t)
    intent.timers = []
  }

  /**
   * Event-driven bounded wait. Resolves true when the corresponding POSITIVE lifecycle
   * evidence arrives (or has already been latched), false on timeout. No polling, no
   * absence-based heuristics (a quiet window proves nothing about termination).
   */
  private waitFor(intent: IsrIntent, which: "abort" | "replay" | "replayDone", ms: number): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      const latched =
        (which === "abort" && (intent.aborted || intent.originalCompleted)) ||
        (which === "replay" && intent.replayStarted) ||
        (which === "replayDone" && intent.replayFinished !== undefined)
      if (latched) {
        resolve(true)
        return
      }
      let settled = false
      const done = (v: boolean) => {
        if (settled) return
        settled = true
        if (which === "abort") intent.resolveAbort = undefined
        else if (which === "replay") intent.resolveReplay = undefined
        else intent.resolveReplayDone = undefined
        resolve(v)
      }
      if (which === "abort") intent.resolveAbort = () => done(true)
      else if (which === "replay") intent.resolveReplay = () => done(true)
      else intent.resolveReplayDone = () => done(true)
      this.arm(intent, ms, () => done(false))
    })
  }

  private resolveTarget(qualified: string | null, variant: string | null | undefined): IsrModelRef | null {
    if (!qualified) return null
    const { providerId, modelId } = parseQualifiedModel(qualified)
    if (!providerId || !modelId) return null
    return { providerID: providerId, modelID: modelId, variant: variant ?? null }
  }
}

/** JSONL sink bound to the smart-router log directory. No prompt content, ever. */
export function makeIsrLogger(projectRoot: string): (record: Record<string, unknown>) => void {
  return (record) => {
    try {
      appendJsonl(projectRoot, LOG.modelSwitchEvents, record)
    } catch {
      // fail-open: logging must never break the coordinator or host
    }
  }
}
