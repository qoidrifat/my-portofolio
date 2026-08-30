// Smart Router V2.2 — WAVE 2: closed evidence-loop tests.
//   H5  bridge: telemetry ⇄ evaluation-store sink (deterministic ids, attributable-only)
//   Phase 5  idempotency (signalId identity, first wins)
//   Phase 6  out-of-order convergence (T1/T2 merge per executionId)
//   Phase 7  incomplete attribution (7 cases, zero statistics effect)
//   M1  variant→model hierarchy (isolation + n≥20 fallback + confidence cap)
//   M3  taskClass segmentation (no cross-class leakage)
//   M6  failure taxonomy (MODEL_RELEVANT / ENVIRONMENT / USER / UNKNOWN separation)
//   Phase 15 observable denominators · M9 replay outcome resolution · M11 hysteresis persistence
//   Closed-loop positive/negative control · determinism ×5 · fail-open
import { describe, it, expect } from "vitest"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import type { EvaluationSignal, ExecutionOutcome } from "../../.opencode/smart-router/v22/types.ts"
import {
  EvaluationStore,
  isAttributionComplete,
  classifyFailure,
  joinStorePath,
  candidateKey,
  type StoreStats,
} from "../../.opencode/smart-router/v22/evaluation-store.ts"
import {
  resolveObservedQuality,
  providersFromEvidenceStore,
  parseCandidateId,
} from "../../.opencode/smart-router/v22/evidence-snapshot.ts"
import { emitEvaluation, emitExecutionOutcome } from "../../.opencode/smart-router/v22/wire.ts"
import { resolveOutcome } from "../../.opencode/smart-router/v22/replay.ts"
import { HysteresisStateStore, hysteresisKey } from "../../.opencode/smart-router/v22/hysteresis-store.ts"
import { runEngine, noopProviders } from "../../.opencode/smart-router/v22/engine.ts"
import { buildRequirement } from "../../.opencode/smart-router/v22/requirement.ts"
import type { TaskRequirement } from "../../.opencode/smart-router/v22/types.ts"
import { createHostV22 } from "../../.opencode/smart-router/v22/host.ts"
import type { RouterMode } from "../../.opencode/smart-router/v22/types.ts"

const NOW = Date.parse("2026-08-30T10:00:00.000Z")

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "v22-wave2-"))
}

function storeIn(root: string): EvaluationStore {
  return new EvaluationStore(joinStorePath(root))
}

function exec(over: Partial<ExecutionOutcome> & { executionId: string }): ExecutionOutcome {
  return {
    sessionId: "S1", routeId: "R1",
    providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high",
    taskClass: "deep-research", optimizationClass: "deep-research",
    outcome: "COMPLETED", errorClass: null,
    environment: { timeout: false, network: false, quota: false, tooling: false, userCancel: false },
    timestamp: new Date(NOW).toISOString(),
    provenance: ["test"],
    ...over,
  } as ExecutionOutcome
}

function t1(over: { signalId: string; executionId: string; grade?: number; evaluationId?: string; complete?: boolean; routeId?: string; sessionId?: string; taskClass?: string; providerId?: string; modelId?: string; variant?: string | null }): EvaluationSignal {
  return {
    signalId: over.signalId,
    executionId: over.executionId,
    chain: {
      sessionId: over.sessionId ?? "S1",
      routeId: over.routeId ?? "R1",
      executionId: over.executionId,
      candidate: { providerId: over.providerId ?? "b-ai", modelId: over.modelId ?? "glm-5.3-flash", variant: over.variant ?? "high" },
      taskClass: (over.taskClass ?? "deep-research") as EvaluationSignal["chain"]["taskClass"],
      evaluationId: over.evaluationId ?? `EVAL-${over.executionId}`,
    },
    attributionComplete: over.complete ?? true,
    quality: { sessionId: "S1", routeId: "R1", executionId: over.executionId, providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high", taskClass: "deep-research", optimizationClass: "deep-research", grade: over.grade ?? 0.9, confidence: 0.8, evaluatorId: "v2.1-evaluator", failureClass: null, timestamp: new Date(NOW).toISOString(), provenance: ["test"] },
    execution: null,
  } as unknown as EvaluationSignal
}

const HOST_REG = {
  effortRankOrder: ["high", "max"],
  models: [
    { id: "b-ai/glm-5.3-flash", provider: "b-ai", available: true, supportsVision: false, maxVerifiedEffort: "max", rejectedEfforts: [], variants: [{ name: "max", effort: "max", status: "VERIFIED" }, { name: "high", effort: "high", status: "VERIFIED" }] },
    { id: "b-ai/deepseek-v4-flash", provider: "b-ai", available: true, supportsVision: false, maxVerifiedEffort: "high", rejectedEfforts: [], variants: [{ name: "high", effort: "high", status: "VERIFIED" }] },
  ],
  generatedFrom: ["wave2-test"],
} as never

function hostRoute(sessionId: string, routeId: string, taskClass: string): { decision: never } {
  return {
    decision: {
      routeId, timestamp: new Date().toISOString(), sessionId,
      input: { promptExcerpt: "X", taskType: ["research"], matched_task_class: taskClass, complexity: "high", contextDemand: "medium", reasoningDemand: "high", modality: "text", confidence: "high", latency_preference: "normal", quality_preference: "normal", cost_profile: "balanced" },
      status: "RESOLVED", agent: "research", provider: "b-ai", model: "b-ai/glm-5.3-flash", variant: "high", variantStatus: "VERIFIED",
      permission: { profile: "standard", risk: "medium", hardDenies: [], requiresConfirmation: [] },
      fallback: [], reason: "fixture", warnings: [],
    } as never,
  }
}

describe("H5: wire → evaluation-store bridge", () => {
  it("emitExecutionOutcome records to sink when attribution is real", () => {
    const store = storeIn(tmpRoot())
    emitExecutionOutcome(tmpRoot(), { sessionId: "S1", routeId: "R1", executionId: "E1", providerId: "b-ai", model: "b-ai/glm-5.3-flash", variant: "high", taskClass: "deep-research", optimizationClass: "research" }, "COMPLETED", null, undefined, store)
    expect(store.all().length).toBe(1)
    expect(store.all()[0]?.signalId).toBe("SIG-E1")
    expect(store.all()[0]?.execution).not.toBeNull()
  })

  it("emitEvaluation records deterministic-id signal to sink", () => {
    const store = storeIn(tmpRoot())
    emitEvaluation(tmpRoot(), { sessionId: "S1", routeId: "R1", executionId: "E1", providerId: "b-ai", model: "b-ai/glm-5.3-flash", variant: "high", taskClass: "deep-research", optimizationClass: "research" }, { quality: "good", action: "continue", reasons: [] }, { t0: null, t3: null }, store)
    expect(store.all().length).toBe(1)
    expect(store.all()[0]?.signalId).toBe("SIG-EVAL-E1")
    expect(store.all()[0]?.chain.evaluationId).toBe("EVAL-E1")
  })

  it("unknown placeholders stay telemetry-only (no sink record, I-016)", () => {
    const store = storeIn(tmpRoot())
    emitExecutionOutcome(tmpRoot(), { sessionId: "S1" }, "ERROR", "timeout", { timeout: true }, store)
    emitEvaluation(tmpRoot(), { sessionId: "S1" }, { quality: "failed", action: "continue", reasons: [] }, {}, store)
    expect(store.all().length).toBe(0)
  })

  it("host flow closes the loop: T2 (completed event) + T1 (dispose) land in the store", () => {
    const root = tmpRoot()
    const host = createHostV22(root, { registry: HOST_REG, mode: "SHADOW" as RouterMode })
    host.onChatMessage({ sessionId: "S-loop", agent: "research", liveModel: "b-ai/glm-5.3-flash", liveVariant: "high", route: hostRoute("S-loop", "R-loop0001", "deep-research") })
    host.onEvent({ type: "message.updated", properties: { info: { role: "assistant", sessionID: "S-loop", time: { completed: Date.now() }, tokens: { input: 10, output: 5 }, cost: 0.001 } } })
    host.onDispose({ quality: "good", action: "continue", reasons: [] })
    const store = storeIn(root)
    store.load()
    expect(store.all().length).toBe(2)
    const t2 = store.all().find((s) => s.execution !== null)
    const t1Sig = store.all().find((s) => s.quality !== null)
    expect(t2?.chain.executionId).toBe(t1Sig?.chain.executionId)
  })

  it("hysteresis state persists across host instances (M11)", () => {
    const root = tmpRoot()
    const host1 = createHostV22(root, { registry: HOST_REG, mode: "SHADOW" as RouterMode })
    host1.onChatMessage({ sessionId: "S-hyst", agent: "research", liveModel: "b-ai/glm-5.3-flash", liveVariant: "high", route: hostRoute("S-hyst", "R-hyst0001", "deep-research") })
    const hystore = new HysteresisStateStore(join(root, ".opencode/ai/evidence/v22/hysteresis-state.jsonl"))
    hystore.load()
    expect(hystore.all().length).toBeGreaterThan(0)
    const [, state1] = hystore.all()[0]!
    const host2 = createHostV22(root, { registry: HOST_REG, mode: "SHADOW" as RouterMode })
    host2.onChatMessage({ sessionId: "S-hyst", agent: "research", liveModel: "b-ai/glm-5.3-flash", liveVariant: "high", route: hostRoute("S-hyst", "R-hyst0001", "deep-research") })
    const hystore2 = new HysteresisStateStore(join(root, ".opencode/ai/evidence/v22/hysteresis-state.jsonl"))
    hystore2.load()
    const [, state2] = hystore2.all()[hystore2.all().length - 1]!
    expect(state2.stickSince).toBe(state1.stickSince)
  })
})

// ------------------------------------------------------- idempotency/merge ---
describe("Phase 5-6: idempotency + out-of-order convergence", () => {
  it("duplicate T2 (same executionId) is one signal (first wins)", () => {
    const store = storeIn(tmpRoot())
    store.recordExecution(exec({ executionId: "E1" }))
    store.recordExecution(exec({ executionId: "E1", outcome: "ERROR", errorClass: "timeout" }))
    expect(store.all().length).toBe(1)
    const s = store.stats(NOW)
    expect(s.total).toBe(1)
  })

  it("duplicate T1 (same signalId) is ignored", () => {
    const store = storeIn(tmpRoot())
    const signal = t1({ signalId: "SIG-EVAL-E1", executionId: "E1", grade: 0.9 })
    store.record(signal)
    expect(store.record({ ...signal, quality: { ...signal.quality!, grade: 0.1 } }).stored).toBe(false)
    expect(store.all().length).toBe(1)
    expect(store.all()[0]?.quality?.grade).toBe(0.9)
  })

  it("T2 then late T1 merge into one complete attributed view", () => {
    const store = storeIn(tmpRoot())
    store.recordExecution(exec({ executionId: "E1" }), false) // T2 arrives first, no evaluationId yet
    let s = store.stats(NOW)
    expect(s.attributed).toBe(0)
    expect(s.incomplete).toBe(1)
    store.record(t1({ signalId: "SIG-EVAL-E1", executionId: "E1" }), false) // late T1 completes it
    s = store.stats(NOW)
    expect(s.attributed).toBe(1)
    expect(s.incomplete).toBe(0)
    // n=1 quality entry is below VARIANT_MIN_N — aggregation itself is covered by M1 tests
    expect(s.qualityBySegment.size).toBe(0)
  })

  it("T1 then late T2 merge the same way (order independent)", () => {
    const store = storeIn(tmpRoot())
    store.record(t1({ signalId: "SIG-EVAL-E1", executionId: "E1" }), false)
    store.recordExecution(exec({ executionId: "E1", outcome: "ERROR", errorClass: "timeout", environment: { timeout: true, network: false, quota: false, tooling: false, userCancel: false } }), false)
    const s = store.stats(NOW)
    expect(s.attributed).toBe(1)
    expect(s.failureBreakdown.environment).toBe(1)
    expect(s.reliabilityByCandidate.size).toBe(0) // env failure excluded from reliability denominator
  })

  it("conflicting chains (different candidate for same executionId) stay audit-only", () => {
    const store = storeIn(tmpRoot())
    store.record(t1({ signalId: "SIG-EVAL-E1", executionId: "E1" }), false)
    store.record(t1({ signalId: "SIG-EVAL-E2", executionId: "E1", modelId: "deepseek-v4-flash" }), false)
    const s = store.stats(NOW)
    expect(s.conflicts).toBe(1)
    expect(s.attributed).toBe(0)
  })
})

// ------------------------------------------------ incomplete attribution ---
describe("Phase 7: incomplete attribution (zero statistics effect)", () => {
  const cases: Array<[string, Record<string, unknown>]> = [
    ["missing sessionId", { sessionId: "" }],
    ["missing routeId", { routeId: "" }],
    ["missing evaluationId", { evaluationId: "" }],
    ["missing providerId", { providerId: "" }],
    ["missing modelId", { modelId: "" }],
    ["missing taskClass", { taskClass: "" }],
    ["explicit audit flag", { complete: false }],
  ]
  for (const [name, over] of cases) {
    it(`${name} → incomplete, never aggregated`, () => {
      const store = storeIn(tmpRoot())
      const signal = t1({ signalId: "SIG-X", executionId: "E1", ...over })
      const result = store.record(signal, false)
      expect(result.attributed).toBe(false)
      const s = store.stats(NOW)
      expect(s.attributed).toBe(0)
      expect(s.incomplete).toBe(1)
      expect(s.qualityBySegment.size).toBe(0)
    })
  }

  it("base model (variant null) is still fully identified", () => {
    const store = storeIn(tmpRoot())
    const signal = t1({ signalId: "SIG-X", executionId: "E1", variant: null })
    expect(isAttributionComplete(signal)).toBe(true)
    expect(store.record(signal, false).attributed).toBe(true)
  })
})

// ------------------------------------------------------ M1 hierarchy ---
describe("M1: variant→model hierarchy", () => {
  function seedVariant(store: EvaluationStore, executionPrefix: string, variant: string, grade: number, n: number): void {
    for (let i = 0; i < n; i++) {
      store.record(t1({ signalId: `SIG-${executionPrefix}-${i}`, executionId: `${executionPrefix}-${i}`, variant, grade }), false)
    }
  }

  it("variant aggregates are isolated (GLM#high vs GLM#max never mix)", () => {
    const store = storeIn(tmpRoot())
    seedVariant(store, "H", "high", 0.9, 5)
    seedVariant(store, "M", "max", 0.2, 5)
    const s = store.stats(NOW)
    expect(s.qualityBySegment.get("deep-research|b-ai/glm-5.3-flash#high")?.mean).toBeCloseTo(0.9, 12)
    expect(s.qualityBySegment.get("deep-research|b-ai/glm-5.3-flash#max")?.mean).toBeCloseTo(0.2, 12)
  })

  it("model-level fallback requires n ≥ 20 (pooled across variants) with taskClass scoping", () => {
    const store = storeIn(tmpRoot())
    seedVariant(store, "A", "high", 0.9, 10)
    seedVariant(store, "B", "max", 0.7, 10)
    const s = store.stats(NOW)
    // 20 pooled model-level samples → aggregate exists; variants stay isolated
    expect(s.qualityByModel.get("deep-research|b-ai/glm-5.3-flash")?.n).toBe(20)
    expect(resolveObservedQuality(s, "deep-research", "b-ai", "glm-5.3-flash", "high")?.sourceLevel).toBe("VARIANT")
    // own variant evidence always wins over the pooled model aggregate
    expect(resolveObservedQuality(s, "deep-research", "b-ai", "glm-5.3-flash", "high")?.inheritedFrom).toBeNull()
    // other taskClass has zero evidence — no cross-class or family/global fabrication
    expect(resolveObservedQuality(s, "deep-review", "b-ai", "glm-5.3-flash", "high")).toBeNull()
    seedVariant(store, "C", "high", 0.9, 10)
    seedVariant(store, "D", "max", 0.7, 10)
    const s2 = store.stats(NOW)
    expect(s2.qualityByModel.get("deep-research|b-ai/glm-5.3-flash")?.n).toBe(40)
    expect(s2.qualityByModel.get("deep-research|b-ai/glm-5.3-flash")?.sourceLevel).toBe("MODEL")
  })

  it("confidence = shrinkage × freshness (n=5 fresh ⇒ 5/15, stale decays)", () => {
    const store = storeIn(tmpRoot())
    seedVariant(store, "H", "high", 0.9, 5)
    const fresh = store.stats(NOW).qualityBySegment.get("deep-research|b-ai/glm-5.3-flash#high")
    expect(fresh?.confidence).toBeCloseTo(5 / 15, 12)
    const stale = store.stats(NOW + 14 * 86_400_000).qualityBySegment.get("deep-research|b-ai/glm-5.3-flash#high")
    expect(stale?.confidence).toBeCloseTo((5 / 15) * 0.5, 12) // 14-day half-life
  })
})

// ------------------------------------------------------ M3 segmentation ---
describe("M3: taskClass segmentation (no cross-class leakage)", () => {
  it("same candidate succeeds in one class, fails in another — segments stay separate", () => {
    const store = storeIn(tmpRoot())
    for (let i = 0; i < 5; i++) {
      store.record(t1({ signalId: `SA-${i}`, executionId: `A-${i}`, taskClass: "testing" }), false)
      store.recordExecution(exec({ executionId: `A-${i}`, taskClass: "testing" }), false)
      store.record(t1({ signalId: `SB-${i}`, executionId: `B-${i}`, taskClass: "deep-research" }), false)
      store.recordExecution(exec({ executionId: `B-${i}`, taskClass: "deep-research", outcome: "FAILED", errorClass: "reasoning-insufficiency" }), false)
    }
    const s = store.stats(NOW)
    const good = s.recentSuccessBySegment.get("testing|b-ai/glm-5.3-flash#high")
    const bad = s.recentSuccessBySegment.get("deep-research|b-ai/glm-5.3-flash#high")
    expect(good?.rate).toBe(1)
    expect(bad?.rate).toBe(0)
    // legacy pooled view still present for compatibility but never used for floors
    expect(s.recentSuccessByCandidate.get("b-ai/glm-5.3-flash#high")?.rate).toBeCloseTo(0.5, 12)
  })
})

// ------------------------------------------------------ M6 taxonomy ---
describe("M6: failure taxonomy + Phase 15 denominators", () => {
  it("classifyFailure maps outcomes correctly", () => {
    expect(classifyFailure(exec({ executionId: "x", outcome: "COMPLETED" }))).toBe("MODEL_RELEVANT")
    expect(classifyFailure(exec({ executionId: "x", outcome: "FAILED", errorClass: "reasoning-insufficiency" }))).toBe("MODEL_RELEVANT")
    expect(classifyFailure(exec({ executionId: "x", outcome: "ERROR", errorClass: "timeout", environment: { timeout: true, network: false, quota: false, tooling: false, userCancel: false } }))).toBe("ENVIRONMENT")
    expect(classifyFailure(exec({ executionId: "x", outcome: "ERROR", errorClass: "quota", environment: { quota: true, timeout: false, network: false, tooling: false, userCancel: false } }))).toBe("ENVIRONMENT")
    expect(classifyFailure(exec({ executionId: "x", outcome: "CANCELLED", errorClass: "user-cancellation", environment: { userCancel: true, timeout: false, network: false, quota: false, tooling: false } }))).toBe("USER")
    expect(classifyFailure(exec({ executionId: "x", outcome: "ERROR", errorClass: "weird-thing" }))).toBe("UNKNOWN")
  })

  it("environment failures are recorded but never penalize (excluded denominators visible)", () => {
    const store = storeIn(tmpRoot())
    for (let i = 0; i < 5; i++) {
      store.record(t1({ signalId: `OK-${i}`, executionId: `OK-${i}` }), false)
      store.recordExecution(exec({ executionId: `OK-${i}` }), false)
    }
    for (let i = 0; i < 3; i++) {
      store.record(t1({ signalId: `T-${i}`, executionId: `T-${i}` }), false)
      store.recordExecution(exec({ executionId: `T-${i}`, outcome: "ERROR", errorClass: "timeout", environment: { timeout: true, network: false, quota: false, tooling: false, userCancel: false } }), false)
    }
    const s = store.stats(NOW)
    expect(s.failureBreakdown).toEqual({ modelRelevant: 0, environment: 3, user: 0, unknown: 0, completed: 5 })
    const rel = s.reliabilityByCandidate.get("b-ai/glm-5.3-flash#high")
    expect(rel?.successRate).toBe(1) // 5/5 eligible — timeouts excluded
    expect(rel?.eligible).toBe(5)
    expect(rel?.excludedEnvironment).toBe(3)
    expect(rel?.excludedUser).toBe(0)
  })

  it("user cancellations and unknown failures also stay out of the denominator", () => {
    const store = storeIn(tmpRoot())
    for (let i = 0; i < 5; i++) {
      store.record(t1({ signalId: `OK-${i}`, executionId: `OK-${i}` }), false)
      store.recordExecution(exec({ executionId: `OK-${i}` }), false)
    }
    store.record(t1({ signalId: "U-1", executionId: "U-1" }), false)
    store.recordExecution(exec({ executionId: "U-1", outcome: "CANCELLED", errorClass: "user-cancellation", environment: { userCancel: true, timeout: false, network: false, quota: false, tooling: false } }), false)
    store.record(t1({ signalId: "X-1", executionId: "X-1" }), false)
    store.recordExecution(exec({ executionId: "X-1", outcome: "ERROR", errorClass: "mystery" }), false)
    const s = store.stats(NOW)
    const rel = s.reliabilityByCandidate.get("b-ai/glm-5.3-flash#high")
    expect(rel?.successRate).toBe(1)
    expect(rel?.excludedUser).toBe(1)
    expect(s.failureBreakdown.user).toBe(1)
    expect(s.failureBreakdown.unknown).toBe(1)
  })

  it("model-relevant failures DO penalize", () => {
    const store = storeIn(tmpRoot())
    for (let i = 0; i < 4; i++) {
      store.record(t1({ signalId: `OK-${i}`, executionId: `OK-${i}` }), false)
      store.recordExecution(exec({ executionId: `OK-${i}` }), false)
    }
    store.record(t1({ signalId: "F-1", executionId: "F-1" }), false)
    store.recordExecution(exec({ executionId: "F-1", outcome: "FAILED", errorClass: "reasoning-insufficiency" }), false)
    const s = store.stats(NOW)
    const rel = s.reliabilityByCandidate.get("b-ai/glm-5.3-flash#high")
    expect(rel?.successRate).toBeCloseTo(4 / 5, 12)
    expect(rel?.eligible).toBe(5)
    expect(s.failureBreakdown.modelRelevant).toBe(1)
  })
})

// ------------------------------------------------------------------ M9 ---
describe("M9: replay outcome resolution", () => {
  it("outcomeRefs (execution ids) resolve when an execution outcome exists", () => {
    const store = storeIn(tmpRoot())
    store.recordExecution(exec({ executionId: "exec-1", routeId: "R1" }), false)
    const label = resolveOutcome(["exec-1"], store, "R1")
    expect(label.kind).toBe("OBSERVED")
    expect(label.source).toBe("SIG-exec-1")
  })

  it("quality-only signals never fabricate OBSERVED", () => {
    const store = storeIn(tmpRoot())
    store.record(t1({ signalId: "SIG-EVAL-E1", executionId: "E1" }), false)
    expect(resolveOutcome(["E1"], store, "R1").kind).toBe("UNKNOWN")
  })

  it("missing refs / route mismatch / no store → UNKNOWN", () => {
    const store = storeIn(tmpRoot())
    store.recordExecution(exec({ executionId: "exec-1", routeId: "R1" }), false)
    expect(resolveOutcome(["nope"], store, "R1").kind).toBe("UNKNOWN")
    expect(resolveOutcome(["exec-1"], store, "R-other").kind).toBe("UNKNOWN")
    expect(resolveOutcome(["exec-1"], null, "R1").kind).toBe("UNKNOWN")
  })
})

// ----------------------------------------------------------------- M11 ---
describe("M11: hysteresis state store", () => {
  it("set/get/load last-wins; key format is session::taskClass::risk", () => {
    const root = tmpRoot()
    const path = join(root, ".opencode/ai/evidence/v22/hysteresis-state.jsonl")
    const store = new HysteresisStateStore(path)
    const key = hysteresisKey("S1", { taskClass: "deep-research", risk: "high" })
    expect(key).toBe("S1::deep-research::high")
    store.set(key, { segment: { taskClass: "deep-research", risk: "high" }, currentRoute: null, stickSince: "2026-08-30T10:00:00.000Z", exceedCount: 2, exceedStrongCount: 0, exceedStrongSince: null, environmentOutcomeStreak: 0 })
    store.set(key, { segment: { taskClass: "deep-research", risk: "high" }, currentRoute: null, stickSince: "2026-08-30T10:00:00.000Z", exceedCount: 3, exceedStrongCount: 1, exceedStrongSince: "2026-08-30T10:00:00.000Z", environmentOutcomeStreak: 0 })
    const reloaded = new HysteresisStateStore(path)
    reloaded.load()
    expect(reloaded.get(key)?.exceedCount).toBe(3)
    expect(reloaded.get(key)?.exceedStrongCount).toBe(1)
  })

  it("corrupted lines are skipped, not fatal (fail-open)", () => {
    const root = tmpRoot()
    const path = join(root, ".opencode/ai/evidence/v22/hysteresis-state.jsonl")
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, "{corrupted\n", "utf8")
    const store = new HysteresisStateStore(path)
    expect(() => store.load()).not.toThrow()
    expect(store.all().length).toBe(0)
  })

  it("unwritable path never throws (fail-open persistence)", () => {
    const root = tmpRoot()
    writeFileSync(join(root, "blocker"), "not a dir", "utf8")
    const store = new HysteresisStateStore(join(root, "blocker", "child", "state.jsonl"))
    expect(() => store.set("k", { segment: { taskClass: "deep-research", risk: "high" }, currentRoute: null, stickSince: "t", exceedCount: 1, exceedStrongCount: 0, exceedStrongSince: null, environmentOutcomeStreak: 0 })).not.toThrow()
    expect(store.get("k")).not.toBeNull() // in-memory still works
  })
})

// ------------------------------------------------------ closed loop ---
describe("Closed evidence loop: store → snapshot → engine", () => {
  // routine-review: no quality floor → observed evidence participates via SCORING only.
  // (Floors require conf ≥ 0.6; observed-only evidence is capped ×0.5 ≤ 0.45, so it can never
  // gate — deliberate: low-trust evidence never blocks candidates, it only re-ranks.)
  function makeRequirement(): TaskRequirement {
    const r = buildRequirement({
      sourceTaskClass: "routine-review", riskClass: "medium", agent: "reviewer", modality: "text",
      complexity: "low", contextDemand: "medium", reasoningDemand: "low",
      latencyPreference: "normal", qualityPreference: "normal", costProfile: "balanced",
      sessionId: "S-ctl", routeId: "R-ctl",
    })
    if (r.kind !== "ok") throw new Error("requirement blocked")
    return r.requirement
  }
  const requirement: TaskRequirement = makeRequirement()

  const X = { candidateId: "b-ai/glm-5.3-flash#high", provider: "b-ai", model: "glm-5.3-flash", variant: "high", variantStatus: "VERIFIED" as const, policyStatus: "ALLOWED" as const, maxContextTokens: 0, ladderRank: 0 }
  const Y = { candidateId: "b-ai/deepseek-v4-flash#high", provider: "b-ai", model: "deepseek-v4-flash", variant: "high", variantStatus: "VERIFIED" as const, policyStatus: "ALLOWED" as const, maxContextTokens: 0, ladderRank: 1 }

  function engineWith(store: EvaluationStore) {
    return runEngine({
      mode: "SHADOW",
      requirement,
      candidates: [X, Y],
      // capability floors verified at INTEGRATED so floor credit is possible (H2 C1 rule:
      // with evidence present but zero floor-verified candidates the engine correctly falls
      // back to V2.1 — the loop control needs floors satisfied to isolate the scoring path)
      providers: {
        ...noopProviders,
        capabilityLevel: () => "INTEGRATED",
        ...providersFromEvidenceStore(store, "routine-review", NOW),
      },
      budgets: { costBudget: null, latencyBudgetP95Ms: null },
      hysteresis: { segment: { taskClass: "routine-review", risk: "medium" }, currentRoute: null, stickSince: null, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null, environmentOutcomeStreak: 0 },
      stickyRouteBroken: false,
      now: new Date(NOW).toISOString(),
      sessionId: "S-ctl",
      routeId: "R-ctl",
      attempt: 1,
    })
  }

  it("positive control: bad evidence for X, good for Y → Y outranks X (score-driven)", () => {
    const store = storeIn(tmpRoot())
    let r = engineWith(store)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.decision.selected).toBe(X.candidateId) // cold start: ladder order wins
    expect(r.decision.excluded.length).toBe(0)

    for (let i = 0; i < 20; i++) {
      store.record(t1({ signalId: `X-${i}`, executionId: `X-${i}`, grade: 0.2, taskClass: "routine-review" }), false)
      store.record(t1({ signalId: `Y-${i}`, executionId: `Y-${i}`, grade: 0.9, modelId: "deepseek-v4-flash", taskClass: "routine-review" }), false)
    }
    r = engineWith(store)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.decision.selected).toBe(Y.candidateId)
    expect(r.decision.excluded.length).toBe(0) // evidence re-ranked, never gated (conf < 0.6)
    const qx = resolveObservedQuality(store.stats(NOW), "routine-review", "b-ai", "glm-5.3-flash", "high")
    expect(qx?.value).toBeCloseTo(0.2, 12)
  })

  it("negative control: sparse evidence (n=5, conf < 0.6) is ignored entirely", () => {
    const store = storeIn(tmpRoot())
    for (let i = 0; i < 5; i++) store.record(t1({ signalId: `X-${i}`, executionId: `X-${i}`, grade: 0.2, taskClass: "routine-review" }), false)
    const r = engineWith(store)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    // 5 samples → conf 0.333 < 0.6 usability gate → quality() stays neutral → ladder wins
    expect(r.decision.selected).toBe(X.candidateId)
    expect(r.decision.excluded.length).toBe(0)
  })

  it("determinism ×5: identical store → identical aggregates and selection", () => {
    const seed = (): EvaluationStore => {
      const store = storeIn(tmpRoot())
      for (let i = 0; i < 20; i++) store.record(t1({ signalId: `X-${i}`, executionId: `X-${i}`, grade: 0.3, taskClass: "routine-review" }), false)
      return store
    }
    const first = seed().stats(NOW)
    for (let i = 0; i < 5; i++) {
      const s = seed().stats(NOW)
      expect(s.attributed).toBe(first.attributed)
      expect(s.qualityBySegment.get("routine-review|b-ai/glm-5.3-flash#high")?.mean).toBe(first.qualityBySegment.get("routine-review|b-ai/glm-5.3-flash#high")?.mean)
      expect(s.qualityBySegment.get("routine-review|b-ai/glm-5.3-flash#high")?.confidence).toBe(first.qualityBySegment.get("routine-review|b-ai/glm-5.3-flash#high")?.confidence)
    }
  })
})

// ------------------------------------------------------------- misc ---
describe("snapshot helpers", () => {
  it("parseCandidateId handles provider/model and provider/model#variant", () => {
    expect(parseCandidateId("b-ai/glm-5.3-flash#high")).toEqual({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high" })
    expect(parseCandidateId("b-ai/glm-5.3-flash")).toEqual({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: null })
    expect(parseCandidateId("no-slash")).toBeNull()
    expect(parseCandidateId("b-ai/")).toBeNull()
  })

  it("candidateKey matches candidateId format", () => {
    expect(candidateKey({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high" })).toBe("b-ai/glm-5.3-flash#high")
    expect(candidateKey({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: null })).toBe("b-ai/glm-5.3-flash")
  })

  it("store with unwritable path still computes in-memory stats (fail-open)", () => {
    const root = tmpRoot()
    writeFileSync(join(root, "blocker"), "not a dir", "utf8")
    const store = new EvaluationStore(join(root, "blocker", "child", "signals.jsonl"))
    store.recordExecution(exec({ executionId: "E1" }))
    const s: StoreStats = store.stats(NOW)
    expect(s.total).toBe(1)
  })
})
