// Smart Router V2.2 — HOST INTEGRATION tests.
// Verifies the runtime wiring contract (plugins/smart-router.ts ⇄ v22/host.ts):
//   OFF = zero V2.2 activity · SHADOW = compute + record, zero production influence
//   T1 evaluation attribution (I-016) · T2 execution outcomes + env separation (I-013)
//   T3 t0–t3 latency windows (t2 host-observable via event bus) · T4 host usage/cost (no fabrication)
//   T5 probe runner (INTEGRATION level; vision stays BLOCKED, I-005)
//   correlation chain · determinism ×N · failure injection (I-021 fail-open) · replay safety
//   telemetry privacy (no prompt/file/secret content)
import { describe, it, expect } from "vitest"
import { mkdtempSync, readFileSync, existsSync, writeFileSync, readdirSync, mkdirSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ModelRegistry, RouteDecision } from "../../.opencode/smart-router/types.ts"
import type { RouterMode } from "../../.opencode/smart-router/v22/types.ts"
import { createHostV22, runCapabilityProbe, type HostV22 } from "../../.opencode/smart-router/v22/host.ts"
import { noopProviders } from "../../.opencode/smart-router/v22/engine.ts"
import { loadReplayRecords, runReplay } from "../../.opencode/smart-router/v22/replay.ts"
import { telemetryDir } from "../../.opencode/smart-router/v22/telemetry.ts"

const SID = "S-test"

const REG: ModelRegistry = {
  effortRankOrder: ["min", "low", "medium", "balanced", "high", "deep", "max"],
  models: [
    { id: "b-ai/glm-5.3-flash", provider: "b-ai", available: true, supportsVision: false, maxVerifiedEffort: "max", rejectedEfforts: [], variants: [{ name: "max", effort: "max", status: "VERIFIED" }, { name: "high", effort: "high", status: "VERIFIED" }] },
    { id: "b-ai/deepseek-v4-flash", provider: "b-ai", available: true, supportsVision: false, maxVerifiedEffort: "high", rejectedEfforts: [], variants: [{ name: "high", effort: "high", status: "VERIFIED" }] },
    { id: "b-ai/qwen3.8-flash", provider: "b-ai", available: true, supportsVision: false, maxVerifiedEffort: null, rejectedEfforts: [], variants: [{ name: "high", effort: "high", status: "CONFIGURED" }] },
  ],
  generatedFrom: ["host-integration-test"],
}

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "v22-host-"))
}

function routeFixture(over: Partial<RouteDecision> = {}): { decision: RouteDecision } {
  const decision: RouteDecision = {
    routeId: "R-test0001",
    timestamp: new Date().toISOString(),
    sessionId: SID,
    input: {
      promptExcerpt: "PROMPT-CONTENT-MUST-NOT-BE-PERSISTED",
      taskType: ["research"],
      matched_task_class: "deep-research",
      complexity: "high",
      contextDemand: "medium",
      reasoningDemand: "high",
      modality: "text",
      confidence: "high",
      latency_preference: "normal",
      quality_preference: "normal",
      cost_profile: "balanced",
    },
    status: "RESOLVED",
    agent: "research",
    provider: "b-ai",
    model: "b-ai/glm-5.3-flash",
    variant: "max",
    variantStatus: "VERIFIED",
    permission: { profile: "standard", risk: "medium", hardDenies: [], requiresConfirmation: [] },
    fallback: [],
    reason: "fixture",
    warnings: [],
    ...over,
  }
  return { decision }
}

function partEvent(sessionId = SID): unknown {
  return { type: "message.part.updated", properties: { part: { sessionID: sessionId, type: "text", text: "PART-CONTENT-MUST-NOT-BE-PERSISTED" } } }
}

function completedEvent(over: Record<string, unknown> = {}, sessionId = SID): unknown {
  return {
    type: "message.updated",
    properties: {
      info: {
        role: "assistant",
        sessionID: sessionId,
        time: { created: Date.now(), completed: Date.now() },
        tokens: { input: 1200, output: 340, reasoning: 0, cache: { read: 0, write: 0 } },
        cost: 0.0021,
        modelID: "glm-5.3-flash",
        providerID: "b-ai",
        ...over,
      },
    },
  }
}

function makeHost(root: string, mode: RouterMode = "SHADOW", registry: ModelRegistry | null = REG): HostV22 {
  return createHostV22(root, { registry, mode })
}

function flow(host: HostV22, opts: { variant?: string; parts?: boolean } = {}): void {
  const route = routeFixture({ variant: opts.variant ?? "max" })
  host.onChatMessage({ sessionId: SID, agent: "research", liveModel: "b-ai/glm-5.3-flash", liveVariant: route.decision.variant, route })
  host.onChatParams(SID)
  if (opts.parts !== false) host.onEvent(partEvent())
  host.onEvent(completedEvent())
  host.onDispose({ quality: "good", action: "continue", reasons: [] })
}

function readJsonl(path: string): Record<string, unknown>[] {
  if (!existsSync(path)) return []
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
}

const evidenceFile = (root: string, name: string) => join(root, ".opencode", "ai", "evidence", "v22", name)
const telemetryFile = (root: string, name: string) => join(telemetryDir(root), name)

describe("V2.2 host wiring — OFF mode is inert (RULE 2)", () => {
  it("OFF: no shadow, no evidence, no telemetry, hooks never throw", () => {
    const root = tmpRoot()
    const host = makeHost(root, "OFF")
    expect(host.mode).toBe("OFF")
    expect(() => flow(host)).not.toThrow()
    expect(existsSync(evidenceFile(root, "shadow-decisions.jsonl"))).toBe(false)
    expect(existsSync(evidenceFile(root, "shadow-deltas.jsonl"))).toBe(false)
    expect(existsSync(telemetryFile(root, "t1.jsonl"))).toBe(false)
    expect(existsSync(telemetryFile(root, "t2.jsonl"))).toBe(false)
  })
})

describe("V2.2 host wiring — SHADOW computation (Phases 6–7)", () => {
  it("SHADOW: writes a schema-conformant shadow record + delta row; v21 = ladder head → no divergence", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    flow(host)
    const recs = readJsonl(evidenceFile(root, "shadow-decisions.jsonl"))
    expect(recs.length).toBe(1)
    const raw = recs[0]
    expect(raw.schemaVersion).toBe(1)
    expect((raw.v21Route as Record<string, unknown>).modelId).toBe("b-ai/glm-5.3-flash")
    expect((raw.v21CandidateSet as unknown[]).length).toBeGreaterThanOrEqual(4)
    expect((raw.outcomeRefs as string[]).length).toBe(1)
    expect(Array.isArray(raw.missing)).toBe(true)
    const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
    expect(delta.status).toBe("SHADOW")
    expect(delta.taskClass).toBe("deep-research")
    expect(delta.optimizationClass).toBe("deep-research")
    const v22 = delta.v22 as Record<string, unknown>
    expect(v22.selected).toBe("b-ai/glm-5.3-flash#max")
    expect(v22.selectedTier).toBe("UNPROVEN") // cold-start: all evidence null
    expect(delta.divergent).toBe(false)
    expect(v22.blocked).toBe(false)
  })

  it("SHADOW divergence: v21 = non-head candidate → stickiness retains the V2.1 route (H3 fix)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    flow(host, { variant: "high" }) // v21 = glm#high (rank 1), head = glm#max (rank 0)
    const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
    const v22 = delta.v22 as Record<string, unknown>
    // ADR-015: the sticky route is now correctly identified (H3) and retained at cold start —
    // the old expectation (head adoption + divergence) encoded the dead-stickiness defect.
    expect(v22.selected).toBe("b-ai/glm-5.3-flash#high")
    expect(delta.divergent).toBe(false)
  })

  it("shadow isolation: route object not mutated; breaker file unchanged (read-only evidence)", () => {
    const root = tmpRoot()
    const breakerPath = join(root, ".opencode", "ai", "routing", "circuit-breaker.json")
    mkdirSync(join(root, ".opencode", "ai", "routing"), { recursive: true })
    const breaker = { updatedAt: new Date().toISOString(), cooldownMs: 300000, failureThreshold: 3, entries: {} }
    writeFileSync(breakerPath, JSON.stringify(breaker))
    const host = makeHost(root)
    const route = routeFixture()
    const before = JSON.stringify(route)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route })
    host.onDispose({ quality: "good", action: "continue", reasons: [] })
    expect(JSON.stringify(route)).toBe(before)
    expect(readFileSync(breakerPath, "utf8")).toBe(JSON.stringify(breaker))
  })

  it("breaker OPEN excludes the OPEN candidate (D4) but never mutates breaker state (Phase 16)", () => {
    const root = tmpRoot()
    const dir = join(root, ".opencode", "ai", "routing")
    mkdirSync(dir, { recursive: true })
    const breaker = { updatedAt: new Date().toISOString(), cooldownMs: 300000, failureThreshold: 3, entries: { "b-ai/glm-5.3-flash": { state: "open", failures: 3, lastFailureAt: new Date().toISOString(), openedAt: new Date().toISOString(), lastError: null } } }
    const raw = JSON.stringify(breaker)
    writeFileSync(join(dir, "circuit-breaker.json"), raw)
    const host = makeHost(root)
    flow(host)
    const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
    const v22 = delta.v22 as Record<string, unknown>
    expect(v22.selected).toBe("b-ai/deepseek-v4-flash#high") // OPEN glm excluded; next ladder head
    expect(readFileSync(join(dir, "circuit-breaker.json"), "utf8")).toBe(raw)
  })

  it("determinism ×5: identical inputs → identical decisionId + selection (Phase 25)", () => {
    const ids: string[] = []
    for (let i = 0; i < 5; i++) {
      const root = tmpRoot()
      flow(makeHost(root))
      const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
      ids.push(String(delta.decisionId))
      expect((delta.v22 as Record<string, unknown>).selected).toBe("b-ai/glm-5.3-flash#max")
    }
    expect(new Set(ids).size).toBe(1)
  })

  it("unknown task class → SHADOW_BLOCKED with explicit reason (no fabricated requirement)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    const route = routeFixture({ input: { ...routeFixture().decision.input, matched_task_class: "not-a-class" } as RouteDecision["input"] })
    host.onChatMessage({ sessionId: SID, agent: "build", liveModel: null, liveVariant: null, route })
    const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
    expect(delta.status).toBe("SHADOW_BLOCKED")
    expect(String(delta.reason)).toContain("no policy entry")
  })
})

describe("V2.2 host wiring — T2 execution outcomes (Phase 10)", () => {
  it("completed message → T2 COMPLETED once (duplicate events are idempotent)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(partEvent())
    host.onEvent(completedEvent())
    host.onEvent(completedEvent())
    const rows = readJsonl(telemetryFile(root, "t2.jsonl"))
    expect(rows.length).toBe(1)
    expect(rows[0].outcome).toBe("COMPLETED")
    expect(rows[0].modelId).toBe("b-ai/glm-5.3-flash") // Attributed schema: flat identity
    expect(rows[0].attributionComplete).toBe(true)
  })

  it("host ApiError → T2 ERROR + network env; MessageAbortedError → CANCELLED + userCancel", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent({ error: { name: "ApiError", data: { statusCode: 500, message: "INTERNAL DETAILS NOT STORED" } }, time: {} }))
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent({ error: { name: "MessageAbortedError", data: { message: "aborted" } }, time: {} }))
    const rows = readJsonl(telemetryFile(root, "t2.jsonl"))
    expect(rows.length).toBe(2)
    expect(rows[0].outcome).toBe("ERROR")
    expect(rows[0].errorClass).toBe("api-500")
    expect((rows[0].environment as Record<string, unknown>).network).toBe(true)
    expect(rows[1].outcome).toBe("CANCELLED")
    expect((rows[1].environment as Record<string, unknown>).userCancel).toBe(true)
  })

  it("session.error with unknown session → audit-only T2 (I-016, no fabricated attribution)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onEvent({ type: "session.error", properties: { sessionID: "S-unknown", error: { name: "ApiError", data: { statusCode: 429, message: "rate" } } } })
    const rows = readJsonl(telemetryFile(root, "t2.jsonl"))
    expect(rows.length).toBe(1)
    expect(rows[0].outcome).toBe("ERROR")
    expect(rows[0].attributionComplete).toBe(false)
    expect((rows[0].environment as Record<string, unknown>).quota).toBe(true)
  })
})

describe("V2.2 host wiring — T3 latency windows (Phase 11)", () => {
  it("full lifecycle t0→t3 computes ttfr + completion; no fabrication when a window is missing", () => {
    const root = tmpRoot()
    flow(makeHost(root))
    const rows = readJsonl(telemetryFile(root, "t3.jsonl"))
    expect(rows.length).toBe(1)
    const r = rows[0]
    expect(typeof r.t0).toBe("number")
    expect(typeof r.t1).toBe("number")
    expect(typeof r.t2).toBe("number")
    expect(typeof r.t3).toBe("number")
    expect(r.ttfrMs as number).toBeGreaterThanOrEqual(0)
    expect(r.completionMs as number).toBeGreaterThanOrEqual((r.ttfrMs as number) || 0)
    expect(r.missingReason).toBeNull()
    expect(r.timeout).toBe(false)
  })

  it("missing first-part event → t2 null + missingReason t2-unobservable (never substituted)", () => {
    const root = tmpRoot()
    flow(makeHost(root), { parts: false })
    const r = readJsonl(telemetryFile(root, "t3.jsonl"))[0]
    expect(r.t2).toBeNull()
    expect(r.ttfrMs).toBeNull()
    expect(r.missingReason).toBe("t2-unobservable")
    expect(typeof r.completionMs).toBe("number")
  })

  it("T3 emitted once per execution even when session.idle follows completion", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent())
    host.onEvent({ type: "session.idle", properties: { sessionID: SID } })
    expect(readJsonl(telemetryFile(root, "t3.jsonl")).length).toBe(1)
  })
})

describe("V2.2 host wiring — T4 usage/cost from host (Phase 12)", () => {
  it("host tokens + host cost relayed with opencode-host pricing source; no invented numbers", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent())
    const rows = readJsonl(telemetryFile(root, "t4.jsonl"))
    expect(rows.length).toBe(1)
    expect(rows[0].inputUsage).toBe(1200)
    expect(rows[0].outputUsage).toBe(340)
    expect(rows[0].effectiveCost).toBe(0.0021)
    expect((rows[0].pricingSource as Record<string, unknown>).id).toBe("opencode-host")
  })

  it("tokens without host cost → usage recorded, effectiveCost + pricingSource null (UNKNOWN, never 0)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent({ cost: undefined }))
    const r = readJsonl(telemetryFile(root, "t4.jsonl"))[0]
    expect(r.inputUsage).toBe(1200)
    expect(r.effectiveCost).toBeNull()
    expect(r.pricingSource).toBeNull()
    expect(r.unit).toBeNull()
  })
})

describe("V2.2 host wiring — T1 evaluation attribution (Phases 8–9)", () => {
  it("dispose emits attributed T1: full correlation chain + candidate identity", () => {
    const root = tmpRoot()
    flow(makeHost(root))
    const r = readJsonl(telemetryFile(root, "t1.jsonl"))[0]
    expect(r.attributionComplete).toBe(true)
    const chain = r.chain as Record<string, unknown>
    expect(chain.taskClass).toBe("deep-research")
    expect((chain.candidate as Record<string, unknown>).modelId).toBe("b-ai/glm-5.3-flash")
    expect((chain.candidate as Record<string, unknown>).variant).toBe("max")
    expect(typeof chain.sessionId).toBe("string")
    expect(typeof chain.routeId).toBe("string")
    expect(typeof chain.evaluationId).toBe("string")
    expect((r.quality as Record<string, unknown>).grade).toBe(1.0)
  })

  it("no session observed → no T1 emitted (never fabricated)", () => {
    const root = tmpRoot()
    makeHost(root).onDispose({ quality: "good", action: "continue", reasons: [] })
    expect(readJsonl(telemetryFile(root, "t1.jsonl")).length).toBe(0)
  })
})

describe("V2.2 correlation chain (Phase 8)", () => {
  it("executionId correlates shadow delta, T2, T3, T4, T1 within one request lifecycle", () => {
    const root = tmpRoot()
    flow(makeHost(root))
    const delta = readJsonl(evidenceFile(root, "shadow-deltas.jsonl"))[0]
    const executionId = delta.executionId as string
    expect(String(executionId)).toMatch(/^exec-/)
    for (const f of ["t1.jsonl", "t2.jsonl", "t3.jsonl", "t4.jsonl"]) {
      const rows = readJsonl(telemetryFile(root, f))
      expect(rows.length, f).toBeGreaterThanOrEqual(1)
      for (const row of rows) expect(row.executionId ?? (row.chain as Record<string, unknown>).executionId, f).toBe(executionId)
    }
  })
})

describe("V2.2 failure injection — fail-open (Phase 23, I-021)", () => {
  it("unwritable project root: all host hooks swallow errors, host contract intact", () => {
    const rootFile = join(tmpdir(), `v22-host-blocked-${Date.now()}`)
    writeFileSync(rootFile, "not a dir")
    const host = makeHost(rootFile)
    expect(() => flow(host)).not.toThrow()
    expect(() => host.onEvent({ type: "session.error", properties: { sessionID: SID, error: { name: "UnknownError", data: { message: "x" } } } })).not.toThrow()
  })

  it("null registry: shadow still computes from policy chain with registry-remainder fallback", () => {
    const root = tmpRoot()
    const host = makeHost(root, "SHADOW", null)
    flow(host)
    const recs = readJsonl(evidenceFile(root, "shadow-decisions.jsonl"))
    expect(recs.length).toBe(1)
  })
})

describe("V2.2 replay safety on live shadow corpus (Phases 20/26)", () => {
  it("shadow records are replay-2 consumable: parse, run, classify; outcomes stay UNKNOWN (honesty)", () => {
    const root = tmpRoot()
    flow(makeHost(root))
    const records = loadReplayRecords(evidenceFile(root, "shadow-decisions.jsonl"))
    expect(records.length).toBe(1)
    const summary = runReplay(records, { projectRoot: tmpRoot(), providers: noopProviders })
    expect(summary.total).toBe(1)
    // Replay cannot recover ladder ranks (records carry no rank data) → all candidates tie
    // at rank 0 and the D-COLD head resolves by the T6 ASCII final tie-break — a different
    // candidate than the V2.1 route, honestly attributed to the cold-start evidence gap (H4).
    expect(summary.rows[0].driver).toBe("cold-start-artifact")
    expect(summary.rows[0].outcome.kind).toBe("UNKNOWN")
    expect(summary.observedOutcomes).toBe(0)
  })

  it("duplicate record line: loadReplayRecords yields both (append-only; dedup by recordId is consumer-side)", () => {
    const root = tmpRoot()
    flow(makeHost(root))
    const p = evidenceFile(root, "shadow-decisions.jsonl")
    const lines = readFileSync(p, "utf8")
    writeFileSync(p, lines + lines.split("\n").filter(Boolean)[0] + "\n")
    expect(loadReplayRecords(p).length).toBe(2)
    const summary = runReplay(loadReplayRecords(p), { projectRoot: tmpRoot(), providers: noopProviders })
    expect(summary.total).toBe(2)
  })
})

describe("V2.2 T5 capability probe (Phase 13)", () => {
  it("emits T5 for runtime-verified variants only (INTEGRATION); vision never probed", () => {
    const root = tmpRoot()
    const n = runCapabilityProbe(root, REG)
    expect(n).toBe(3) // glm#max, glm#high, deepseek#high are VERIFIED; qwen CONFIGURED is not
    const rows = readJsonl(telemetryFile(root, "t5.jsonl"))
    expect(rows.length).toBe(3)
    for (const r of rows) {
      expect(r.dimension).toBe("reasoning")
      expect(r.method).toBe("INTEGRATION")
      expect(r.result).toBe("PASS")
    }
    expect(rows.some((r) => r.dimension === "vision")).toBe(false)
  })
})

describe("V2.2 telemetry privacy (Phase 27)", () => {
  it("no prompt/part content or secret-shaped keys in evidence + telemetry stores", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    host.onChatMessage({ sessionId: SID, agent: "research", liveModel: null, liveVariant: null, route: routeFixture() })
    host.onEvent(completedEvent({ error: { name: "ApiError", data: { statusCode: 500, message: "password=hunter2 secret-token" } } }))
    flow(host)
    const dirs = [join(root, ".opencode", "ai", "evidence"), telemetryDir(root)]
    const forbidden = [/PROMPT-CONTENT/, /PART-CONTENT/, /hunter2/, /"(password|secret|apikey|api_key|authorization|credential|private_key)"\s*:/i]
    for (const dir of dirs) {
      if (!existsSync(dir)) continue
      const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]))
      for (const f of walk(dir)) {
        const content = readFileSync(f, "utf8")
        for (const p of forbidden) expect(p.test(content), `${f} matches ${p}`).toBe(false)
      }
    }
  })
})

describe("V2.2 shadow performance (Phase 28)", () => {
  it("shadow compute + record overhead per decision is bounded (< 20 ms design budget)", () => {
    const root = tmpRoot()
    const host = makeHost(root)
    const N = 50
    const t = Date.now()
    for (let i = 0; i < N; i++) {
      host.onChatMessage({ sessionId: `${SID}-${i}`, agent: "research", liveModel: null, liveVariant: null, route: routeFixture({ sessionId: `${SID}-${i}` }) })
    }
    const perDecision = (Date.now() - t) / N
    expect(perDecision).toBeLessThan(20)
    expect(perDecision).toBeGreaterThanOrEqual(0)
  })
})
