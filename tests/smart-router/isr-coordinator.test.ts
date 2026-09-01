// ISR coordinator unit tests — F-01 REMEDIATION safety matrix.
// CASE B deferred trigger: chat.message registers an intent with ZERO host mutation;
// the run begins ONLY after the turn's own step is observed ACTIVE + first stream byte
// (pre-step aborts strand the step — proven live). Every wait is event-driven with
// bounded timeouts; ABORT_CONFIRMED and REPLAY_COMPLETED are only claimed with real
// evidence (abort termination/quiet window / replay step.started + finish:"stop").
import { describe, expect, it, vi } from "vitest"
import { IsrCoordinator, type IsrLogKind, type IsrModelRef, type IsrOps } from "../../.opencode/smart-router/v22/isr-coordinator.ts"

type FakeOps = IsrOps & { calls: string[]; models: Map<string, IsrModelRef> }

function fakeOps(overrides: Partial<IsrOps> = {}, liveInitial: IsrModelRef | null = null): FakeOps {
  const calls: string[] = []
  // simulated host session model state: switchModel mutates it, getSessionModel reads it
  const models = new Map<string, IsrModelRef>()
  const base: IsrOps = {
    abort: vi.fn(async (s: string) => {
      calls.push(`abort:${s}`)
    }),
    switchModel: vi.fn(async (s: string, m: IsrModelRef) => {
      calls.push(`switch:${s}:${m.providerID}/${m.modelID}:${m.variant ?? "-"}`)
      models.set(s, m)
    }),
    prompt: vi.fn(async (s: string, t: string) => {
      calls.push(`prompt:${s}:${t}`)
    }),
    getSessionModel: vi.fn(async (s: string) => models.get(s) ?? liveInitial),
  }
  return { ...base, ...overrides, calls, models }
}

const FROM = { providerID: "b-ai", modelID: "glm-5.3-flash" }
const FROM_STEP = { providerID: "b-ai", id: "glm-5.3-flash" }
const REC = "open-router/minimax/minimax-m3:free"
const TARGET_CALL = "switch:s1:open-router/minimax/minimax-m3:free:deep"

function makeCoord(ops: FakeOps, mode: "off" | "advisory" | "auto" = "auto", opts: { validateTarget?: (m: IsrModelRef) => boolean; timings?: { waitingMs?: number; abortMs?: number; replayMs?: number; replayDoneMs?: number } } = {}) {
  const logs: { kind: IsrLogKind; status: unknown; state: unknown; from: unknown; to: unknown }[] = []
  const coord = new IsrCoordinator({
    ops,
    mode: () => mode,
    validateTarget: "validateTarget" in opts ? opts.validateTarget : (m) => m.providerID === "open-router",
    log: (r) => logs.push(r as never),
    now: () => 1_700_000_000_000,
    uuid: (() => { let i = 0; return () => `uuid-${++i}` })(),
    timings: { waitingMs: 60, abortMs: 60, replayMs: 60, replayDoneMs: 60, ...opts.timings },
  })
  return { coord, logs }
}

const baseInput = {
  sessionId: "s1",
  messageId: "m1",
  currentModel: FROM,
  currentVariant: null,
  recommendedModel: REC,
  recommendedVariant: "deep",
  reason: "test",
  originalPrompt: "  original prompt text  ",
}

/** The turn's own step going active (model confirm only — the abort still waits for stream bytes). */
const stepStarted = (coord: IsrCoordinator, sessionId = "s1", model: object = FROM_STEP) =>
  coord.noteEvent("session.next.step.started", { sessionID: sessionId, model })
/** Streamed bytes = the measured-safe abort window. This is what actually triggers the run. */
const streamDelta = (coord: IsrCoordinator, sessionId = "s1") => coord.noteEvent("message.part.delta", { sessionID: sessionId })
const stepEnded = (coord: IsrCoordinator, sessionId = "s1") => coord.noteEvent("session.next.step.ended", { sessionID: sessionId })
/** The replay assistant finishing successfully — required before REPLAY_COMPLETED. */
const replayStop = (coord: IsrCoordinator, sessionId = "s1") =>
  coord.noteEvent("message.updated", { sessionID: sessionId, info: { role: "assistant", providerID: "open-router", modelID: "minimax/minimax-m3:free", finish: "stop", time: { completed: 1 } } })
const idle = (coord: IsrCoordinator, sessionId = "s1") => coord.noteEvent("session.idle", { sessionID: sessionId })

async function settle(cond: () => boolean): Promise<void> {
  await vi.waitFor(() => expect(cond()).toBe(true), { timeout: 1000, interval: 5 })
}

describe("ISR coordinator — mode gates", () => {
  it("mode off: never touches host ops", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops, "off")
    const res = coord.registerIntent(baseInput)
    expect(res.action).toBe("off")
    expect(ops.calls).toEqual([])
  })

  it("mode advisory: noop even with eligible target", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops, "advisory")
    const res = coord.registerIntent(baseInput)
    expect(res.action).toBe("advisory-noop")
    expect(ops.calls).toEqual([])
  })

  it("no FORCE mode exists: unsupported mode degrades to off semantics (fail-closed)", () => {
    const ops = fakeOps()
    const coord = new IsrCoordinator({ ops, mode: () => "force" as never, log: () => {} })
    const res = coord.registerIntent(baseInput)
    expect(res.action).toBe("off")
    expect(ops.calls).toEqual([])
  })
})

describe("ISR coordinator — eligibility gates (synchronous, zero mutation)", () => {
  it("D-COLD null recommendation: skipped", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    const res = coord.registerIntent({ ...baseInput, recommendedModel: null })
    expect(res.action).toBe("skipped")
    expect(ops.calls).toEqual([])
  })

  it("unknown current model: skipped", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    expect(coord.registerIntent({ ...baseInput, currentModel: null }).action).toBe("skipped")
    expect(ops.calls).toEqual([])
  })

  it("non-text parts: skipped — replay is text-only (F-02)", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    const res = coord.registerIntent({ ...baseInput, hasNonTextParts: true })
    expect(res.action).toBe("skipped")
    expect(res.reason).toContain("non-text")
    expect(ops.calls).toEqual([])
  })

  it("empty original prompt: skipped", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    expect(coord.registerIntent({ ...baseInput, originalPrompt: "   " }).action).toBe("skipped")
    expect(ops.calls).toEqual([])
  })

  it("recommended model equals current: skipped", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    const res = coord.registerIntent({ ...baseInput, recommendedModel: "b-ai/glm-5.3-flash", recommendedVariant: null })
    expect(res.reason).toContain("equals current")
    expect(ops.calls).toEqual([])
  })

  it("no validator available: fail-closed skip (F-03)", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops, "auto", { validateTarget: undefined })
    const res = coord.registerIntent(baseInput)
    expect(res.reason).toContain("validation unavailable")
    expect(ops.calls).toEqual([])
  })

  it("target not in registry: fail-closed skip (F-03)", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops, "auto", { validateTarget: () => false })
    const res = coord.registerIntent(baseInput)
    expect(res.reason).toContain("not in model registry")
    expect(ops.calls).toEqual([])
  })

  it("session busy (active step): never eligible — next step.started would belong to the previous run", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    // a step is active for this session WITHOUT any ISR intent (steered into an active run)
    stepStarted(coord)
    const res = coord.registerIntent({ ...baseInput, messageId: "m-busy" })
    expect(res.reason).toContain("session busy")
    expect(ops.calls).toEqual([])
  })
})

describe("ISR coordinator — F-01: deferred trigger, zero pre-step mutation", () => {
  it("intent registration performs ZERO host ops — abort only after step-active AND first stream byte", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    const res = coord.registerIntent(baseInput)
    expect(res.action).toBe("intent-registered")
    expect(res.operationId).toMatch(/^isr-/)
    // THE F-01 INVARIANT: no abort before the step is observed active
    expect(ops.calls).toEqual([])
    expect(coord.stateOf("s1")).toBe("WAITING_STEP")
    stepStarted(coord)
    // model confirmed but stream has not produced bytes: aborting there strands the step (measured) — still no op
    expect(ops.calls).toEqual([])
    streamDelta(coord)
    await settle(() => ops.calls.includes("abort:s1"))
    expect(ops.calls[0]).toBe("abort:s1")
  })

  it("no active step within waitingMs: intent expires, zero ops, session untouched", async () => {
    const ops = fakeOps()
    const logs: { kind: IsrLogKind; status: unknown }[] = []
    const coord = new IsrCoordinator({
      ops,
      mode: () => "auto",
      validateTarget: () => true,
      log: (r) => logs.push(r as never),
      timings: { waitingMs: 40 },
    })
    coord.registerIntent(baseInput)
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.calls).toEqual([])
    const skip = logs.find((l) => l.kind === "model-switch-skipped")
    expect(String(skip?.status)).toContain("no-interrupt-window")
  })

  it("step started on an unexpected model: intent dropped without touching the run", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord, "s1", { providerID: "other", id: "model-x" })
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.calls).toEqual([])
    const skip = logs.find((l) => l.kind === "model-switch-skipped")
    expect(String(skip?.status)).toContain("step-model-unexpected")
  })

  it("step already on target: dropped without ops", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord, "s1", { providerID: "open-router", id: "minimax/minimax-m3:free" })
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.calls).toEqual([])
  })
})

describe("ISR coordinator — happy path (abort -> abort-evidence -> switch -> confirm -> replay -> replay-stop)", () => {
  it("full lifecycle with evidence at every step, original prompt replayed verbatim", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord) // abort evidence: the interrupted step terminated
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    expect(ops.calls).toEqual(["abort:s1", TARGET_CALL, "prompt:s1:  original prompt text  "])
    stepStarted(coord) // the replay's own step.started (only valid AFTER admission — the contract)
    replayStop(coord) // the replay assistant finishing with finish:"stop" — the COMPLETED contract
    await settle(() => coord.stateOf("s1") === "REPLAY_COMPLETED")
    const kinds = logs.map((l) => l.kind)
    expect(kinds).toContain("model-switch-requested")
    expect(kinds).toContain("model-switch-aborted")
    expect(kinds).toContain("model-switched")
    expect(kinds).toContain("model-switch-replayed")
    // honest telemetry: ABORT_CONFIRMED only with termination evidence, REPLAY_COMPLETED only with replay finish:"stop"
    const aborted = logs.find((l) => l.kind === "model-switch-aborted")
    expect(aborted?.status).toBe("ABORT_CONFIRMED")
    const switched = logs.find((l) => l.kind === "model-switched")
    expect(switched?.status).toBe("SWITCH_CONFIRMED")
    expect(logs.filter((l) => l.kind === "model-switch-replayed").map((l) => l.status)).toEqual(["REPLAY_ADMITTED", "REPLAY_STARTED", "REPLAY_COMPLETED"])
  })

  it("replay step started but assistant finishes with finish:error: REPLAY_FAILED — no false COMPLETED (measured live 2026-09-01)", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    stepStarted(coord)
    // the replay assistant errors after starting (measured: provider auth 401 case)
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "assistant", providerID: "open-router", modelID: "minimax/minimax-m3:free", finish: "error", error: {}, time: { completed: 1 } } })
    await settle(() => coord.stateOf("s1") === "RESTORED")
    expect(ops.switchModel).toHaveBeenCalledTimes(2) // switch + verified restore-back
    const failed = logs.find((l) => l.kind === "model-switch-failed")
    expect(String(failed?.status)).toContain("REPLAY_FAILED:finish=error")
    expect(logs.some((l) => l.state === "REPLAY_COMPLETED")).toBe(false)
  })

  it("original turn completes normally after the abort: operation dropped, no replay (duplicate-execution guard)", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    await settle(() => ops.calls.includes("abort:s1"))
    // the original assistant finishes with finish:"stop" — the abort was a no-op
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "assistant", providerID: "b-ai", modelID: "glm-5.3-flash", finish: "stop", time: { completed: 1 } } })
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.switchModel).not.toHaveBeenCalled()
    expect(ops.prompt).not.toHaveBeenCalled()
    const skip = logs.find((l) => l.kind === "model-switch-skipped")
    expect(String(skip?.status)).toContain("original-completed-before-abort")
  })

  it("interrupt without termination evidence within abortMs: ABORT_UNCONFIRMED — no switch, no replay (F-04)", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops, "auto", { timings: { abortMs: 40 } })
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    await settle(() => ops.calls.includes("abort:s1"))
    // NO step.ended / step.failed arrives
    await settle(() => coord.stateOf("s1") === "FAILED")
    expect(ops.calls).toEqual(["abort:s1"])
    const failed = logs.find((l) => l.kind === "model-switch-failed")
    expect(String(failed?.status)).toContain("ABORT_UNCONFIRMED")
    expect(logs.some((l) => l.kind === "model-switch-aborted")).toBe(false)
    expect(logs.some((l) => l.kind === "model-switched")).toBe(false)
  })
})

describe("ISR coordinator — idempotency, coalescing, isolation", () => {
  it("one operation per logical turn: same messageId skipped", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    expect(coord.registerIntent(baseInput).action).toBe("intent-registered")
    const second = coord.registerIntent(baseInput)
    expect(second.action).toBe("skipped")
    expect(second.reason).toContain("already handled")
  })

  it("handled turn stays consumed until session.idle prunes it (F-07)", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    stepStarted(coord) // the replay's own step.started (post-admission — the contract)
    replayStop(coord)
    await settle(() => coord.stateOf("s1") === "REPLAY_COMPLETED")
    // same messageId after completion: still blocked (one operation per turn)
    expect(coord.registerIntent({ ...baseInput, messageId: "m1" }).reason).toContain("already handled")
    idle(coord) // host reports idle: prunes bookkeeping (F-07), replay turn no longer counts
    // a NEW turn while ANOTHER run is active: session busy (never eligible)
    stepStarted(coord)
    const busy = coord.registerIntent({ ...baseInput, messageId: "m2" })
    expect(busy.reason).toContain("session busy")
    idle(coord)
    // idle prunes bookkeeping (F-07): turns are handleable again
    idle(coord)
    expect(coord.registerIntent({ ...baseInput, messageId: "m1" }).action).toBe("intent-registered")
  })

  it("concurrent trigger while a run is in flight: coalesced, ops called once", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    await settle(() => ops.calls.includes("abort:s1"))
    const second = coord.registerIntent({ ...baseInput, messageId: "m2" })
    expect(second.action).toBe("coalesced")
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    stepStarted(coord)
    replayStop(coord)
    await settle(() => coord.stateOf("s1") === "REPLAY_COMPLETED")
    expect(ops.calls.filter((c) => c.startsWith("abort:")).length).toBe(1)
    expect(ops.calls.filter((c) => c.startsWith("prompt:")).length).toBe(1)
  })

  it("session isolation: two sessions run independently", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    coord.registerIntent({ ...baseInput, sessionId: "s2", messageId: "m2" })
    for (const s of ["s1", "s2"] as const) {
      coord.noteEvent("session.next.step.started", { sessionID: s, model: FROM_STEP })
      streamDelta(coord, s)
      coord.noteEvent("session.next.step.ended", { sessionID: s })
      await settle(() => coord.stateOf(s) === "REPLAYING")
      coord.noteEvent("session.next.step.started", { sessionID: s, model: FROM_STEP })
      replayStop(coord, s)
    }
    await settle(() => coord.stateOf("s1") === "REPLAY_COMPLETED" && coord.stateOf("s2") === "REPLAY_COMPLETED")
    expect(ops.calls.filter((c) => c.startsWith("abort:")).length).toBe(2)
    expect(ops.calls.filter((c) => c.startsWith("prompt:")).length).toBe(2)
  })
})

describe("ISR coordinator — F-05 race guard (verified against authoritative session state)", () => {
  it("live model changed before the switch: abort, user selection preserved", async () => {
    const ops = fakeOps(undefined, { providerID: "minimaxm3new", modelID: "MiniMaxAI/MiniMax-M3", variant: null })
    const logs: { kind: IsrLogKind; status: unknown }[] = []
    const coord = new IsrCoordinator({
      ops,
      mode: () => "auto",
      validateTarget: () => true,
      log: (r) => logs.push(r as never),
      timings: { waitingMs: 60, abortMs: 60, replayMs: 60 },
    })
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    // termination evidence observed; getSessionModel now reports a MANUAL user switch
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.calls).toEqual(["abort:s1"]) // interrupt already applied; nothing else touched
    expect(ops.switchModel).not.toHaveBeenCalled()
    expect(ops.prompt).not.toHaveBeenCalled()
    const skip = logs.find((l) => l.kind === "model-switch-skipped")
    expect(String(skip?.status)).toContain("live-model-changed")
  })
})

describe("ISR coordinator — failure & rollback paths", () => {
  it("abort op throws: FAILED, no restore (model never changed)", async () => {
    const ops = fakeOps({
      abort: vi.fn(async () => {
        throw new Error("abort 500")
      }),
    })
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    await settle(() => coord.stateOf("s1") === "FAILED")
    expect(ops.switchModel).not.toHaveBeenCalled()
    expect(ops.prompt).not.toHaveBeenCalled()
    expect(logs.some((l) => l.kind === "model-switch-failed")).toBe(true)
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(false)
  })

  it("switch op throws: FAILED + verified restore to the previous model (F-08)", async () => {
    const ops = fakeOps({
      switchModel: vi.fn(async (s: string, m: IsrModelRef) => {
        ops.calls.push(`switch:${s}:${m.providerID}/${m.modelID}:${m.variant ?? "-"}`)
        if (m.modelID.includes("minimax")) throw new Error("switch 503")
        ops.models.set(s, m)
      }),
    })
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "RESTORED")
    const switchCalls = ops.switchModel as ReturnType<typeof vi.fn>
    expect(switchCalls.mock.calls.map((c) => (c[1] as IsrModelRef).modelID)).toEqual(["minimax/minimax-m3:free", FROM.modelID])
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(true)
  })

  it("switch not confirmed by host state: restore attempted and verified", async () => {
    const ops = fakeOps({
      // host never actually applies the switch: getSessionModel keeps reporting FROM
      getSessionModel: vi.fn(async () => ({ providerID: FROM.providerID, modelID: FROM.modelID, variant: null })),
    })
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "RESTORED")
    expect(ops.abort).toHaveBeenCalledTimes(1)
    expect(ops.switchModel).toHaveBeenCalledTimes(2) // switch + verified restore-back
    const failed = logs.find((l) => l.kind === "model-switch-failed")
    expect(String(failed?.status)).toContain("switch-not-confirmed")
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(true)
  })

  it("replay admission throws: FAILED + restore (switch already applied)", async () => {
    const ops = fakeOps({
      prompt: vi.fn(async () => {
        throw new Error("prompt 500")
      }),
    })
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "RESTORED")
    expect(ops.switchModel).toHaveBeenCalledTimes(2)
    expect(logs.some((l) => l.kind === "model-switched")).toBe(true)
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(true)
  })

  it("replay admitted but no replay step.started within replayMs: REPLAY_UNCONFIRMED — FAILED, no restore (documented)", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops, "auto", { timings: { replayMs: 40 } })
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    expect(ops.calls).toEqual(["abort:s1", TARGET_CALL, "prompt:s1:  original prompt text  "])
    // no replay step.started arrives
    await settle(() => coord.stateOf("s1") === "FAILED")
    const failed = logs.filter((l) => l.kind === "model-switch-failed")
    expect(failed.some((l) => String(l.status).includes("REPLAY_UNCONFIRMED"))).toBe(true)
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(false)
  })

  it("replay step started but replay assistant never finishes within replayDoneMs: REPLAY_UNCONFIRMED:no-stop-finish — FAILED, no restore, no false COMPLETED (D-05)", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops, "auto", { timings: { replayDoneMs: 40 } })
    coord.registerIntent(baseInput)
    stepStarted(coord)
    streamDelta(coord)
    stepEnded(coord)
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    expect(ops.calls).toEqual(["abort:s1", TARGET_CALL, "prompt:s1:  original prompt text  "])
    stepStarted(coord) // the replay's own step.started arrives…
    // …but the replay assistant NEVER emits a finish (no message.updated with finish)
    await settle(() => coord.stateOf("s1") === "FAILED")
    const failed = logs.filter((l) => l.kind === "model-switch-failed")
    expect(failed.some((l) => String(l.status).includes("REPLAY_UNCONFIRMED:no-stop-finish"))).toBe(true)
    expect(logs.some((l) => l.state === "REPLAY_COMPLETED")).toBe(false)
    expect(logs.some((l) => l.kind === "model-switch-restored")).toBe(false)
    expect(ops.calls.filter((c) => c.startsWith("abort:")).length).toBe(1) // no retry
  })
})

describe("ISR coordinator — plugin event vocabulary (measured OpenCode 1.18.25)", () => {
  // The plugin event hook NEVER receives the SSE-only session.next.step.* events (measured
  // live: 121 events captured, zero step.*). The real signals are message.updated (assistant
  // info carries providerID/modelID; finish:"stop"/"error" = termination evidence) and
  // session.status (busy/idle, repeated per step).
  const assistantActive = (over: object = {}) => ({
    sessionID: "s1",
    info: { role: "assistant", providerID: "b-ai", modelID: "glm-5.3-flash", ...over },
  })
  const assistantFinished = (finish: string) => ({
    sessionID: "s1",
    info: { role: "assistant", providerID: "b-ai", modelID: "glm-5.3-flash", finish, time: { completed: 1 } },
  })

  it("full lifecycle via plugin vocabulary: busy -> assistant active -> finish(error) -> switch -> replay assistant", async () => {
    const ops = fakeOps()
    const { coord, logs } = makeCoord(ops)
    coord.registerIntent(baseInput)
    coord.noteEvent("session.status", { sessionID: "s1", status: { type: "busy" } })
    coord.noteEvent("session.status", { sessionID: "s1", status: { type: "busy" } }) // repeats per step — must stay idempotent
    // the turn's own assistant message appears on the pre-switch model -> ACTIVE -> interrupt
    coord.noteEvent("message.updated", assistantActive())
    streamDelta(coord)
    await settle(() => ops.calls.includes("abort:s1"))
    // abort terminates the loop: assistant completion with finish:"error"
    coord.noteEvent("message.updated", assistantFinished("error"))
    await settle(() => coord.stateOf("s1") === "REPLAYING")
    expect(ops.calls).toEqual(["abort:s1", TARGET_CALL, "prompt:s1:  original prompt text  "])
    // the replay's own assistant message appears (no finish yet) -> REPLAY_STARTED
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "assistant", providerID: "open-router", modelID: "minimax/minimax-m3:free" } })
    // then it finishes successfully -> REPLAY_COMPLETED
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "assistant", providerID: "open-router", modelID: "minimax/minimax-m3:free", finish: "stop", time: { completed: 1 } } })
    await settle(() => coord.stateOf("s1") === "REPLAY_COMPLETED")
    expect(logs.find((l) => l.kind === "model-switch-aborted")?.status).toBe("ABORT_CONFIRMED")
    expect(logs.filter((l) => l.kind === "model-switch-replayed").map((l) => l.status)).toEqual(["REPLAY_ADMITTED", "REPLAY_STARTED", "REPLAY_COMPLETED"])
  })

  it("user message updates never trigger anything", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "user", providerID: "b-ai", modelID: "glm-5.3-flash" } })
    expect(coord.stateOf("s1")).toBe("WAITING_STEP")
    expect(ops.calls).toEqual([])
  })

  it("step active on unexpected model (plugin vocabulary): dropped without ops", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    coord.noteEvent("message.updated", { sessionID: "s1", info: { role: "assistant", providerID: "other", modelID: "model-x" } })
    await settle(() => coord.stateOf("s1") === "IDLE")
    expect(ops.calls).toEqual([])
  })
})

describe("ISR coordinator — lifecycle hygiene", () => {
  it("dispose(): pending intents dropped, registerIntent after dispose is a no-op", async () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    coord.registerIntent(baseInput)
    coord.dispose()
    expect(ops.calls).toEqual([])
    expect(coord.stateOf("s1")).toBe("IDLE")
    const res = coord.registerIntent(baseInput)
    expect(res.action).toBe("skipped")
    expect(res.reason).toContain("disposed")
  })

  it("noteEvent with malformed/missing sessionID never throws", () => {
    const ops = fakeOps()
    const { coord } = makeCoord(ops)
    expect(() => {
      coord.noteEvent("session.next.step.started", undefined)
      coord.noteEvent("session.next.step.started", {})
      coord.noteEvent("session.next.step.started", { sessionID: 42 as never })
      coord.noteEvent("weird.event", { sessionID: "s1" })
    }).not.toThrow()
    expect(ops.calls).toEqual([])
  })
})
