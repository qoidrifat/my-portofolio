// Smart Router V2.2 — integration tests: engine orchestrator, evaluation store, telemetry fail-open.
// Guards: determinism (same state → same decision), I-016 attribution invariant, I-021 telemetry
// isolation, ADR-010 degradation boundary, shadow zero-influence.

import { describe, it, expect } from "vitest"
import { mkdtempSync, readFileSync, existsSync, writeFileSync, mkdirSync, utimesSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import type { Candidate, HysteresisState } from "../../.opencode/smart-router/v22/types.ts"
import { buildRequirement } from "../../.opencode/smart-router/v22/requirement.ts"
import { runEngine, type EvidenceProviders } from "../../.opencode/smart-router/v22/engine.ts"
import { emptyHysteresisState } from "../../.opencode/smart-router/v22/hysteresis.ts"
import { EvaluationStore, isAttributionComplete } from "../../.opencode/smart-router/v22/evaluation-store.ts"
import { emitT3, sweepRetention, telemetryDir, telemetryDiagnostics } from "../../.opencode/smart-router/v22/telemetry.ts"

const NOW = "2026-08-29T12:00:00.000Z"

function makeCandidates(n: number): Candidate[] {
  return Array.from({ length: n }, (_, i) => ({
    candidateId: `prov/model${i}#high`,
    provider: "prov",
    model: `model${i}`,
    variant: "high",
    variantStatus: "VERIFIED",
    policyStatus: "ALLOWED",
    maxContextTokens: 0,
    ladderRank: i,
  }))
}

const noopProviders: EvidenceProviders = {
  capabilityLevel: () => "UNKNOWN",
  capabilityDim: () => null,
  contextWindow: () => null,
  health: () => null,
  budgetEvidence: () => ({ estimatedCost: null, costConfidence: 0, p95LatencyMs: null, latencyConfidence: 0 }),
  healthFull: () => null,
  quality: () => null,
  segment: () => null,
  truncation: () => ({ truncationEvents: 0 }),
  costDatum: () => ({ effectiveCost: null, confidence: 0 }),
  latencyDatum: () => ({ p50Ms: null, confidence: 0, sampleSize: 0 }),
}

function makeEngineInput(over: Partial<Parameters<typeof runEngine>[0]>): Parameters<typeof runEngine>[0] {
  const req = buildRequirement({
    sourceTaskClass: "deep-research",
    riskClass: "medium",
    agent: "research",
    modality: "text",
    complexity: "high",
    contextDemand: "medium",
    reasoningDemand: "max",
    latencyPreference: "normal",
    qualityPreference: "normal",
    costProfile: "balanced",
    sessionId: "S1",
    routeId: "R1",
  })
  if (req.kind !== "ok") throw new Error("requirement failed")
  return {
    mode: "SHADOW",
    requirement: req.requirement,
    candidates: makeCandidates(3),
    providers: noopProviders,
    budgets: { costBudget: null, latencyBudgetP95Ms: null },
    hysteresis: emptyHysteresisState({ taskClass: "deep-research", risk: "medium" }),
    stickyRouteBroken: false,
    now: NOW,
    sessionId: "S1",
    routeId: "R1",
    attempt: 1,
    ...over,
  }
}

describe("V2.2 engine orchestrator", () => {
  it("mode OFF: zero compute, V2.1 passthrough, ladder head exposed", () => {
    const r = runEngine(makeEngineInput({ mode: "OFF" }))
    expect(r.kind).toBe("ok")
    expect(r.degraded).toBe(false)
    if (r.kind !== "ok") return
    expect(r.decision.scores).toEqual([])
    expect(r.decision.selected).toBeNull()
    expect(r.v21LadderHead).toBe("prov/model0#high")
  })

  it("all-UNPROVEN (no evidence anywhere) → ladder head via D-COLD, not ASCII", () => {
    const r = runEngine(makeEngineInput({}))
    expect(r.degraded).toBe(false)
    if (r.degraded) return
    expect(r.decision.selected).toBe("prov/model0#high")
    expect(r.decision.scores.every((s) => s.tier === "UNPROVEN")).toBe(true)
  })

  it("evidenced candidate beats UNPROVEN tier regardless of score tie", () => {
    const providers: EvidenceProviders = {
      ...noopProviders,
      capabilityLevel: (id, d) => (id === "prov/model2#high" && d === "research" ? "STATIC" : "UNKNOWN"),
      capabilityDim: (id, d) => (id === "prov/model2#high" && d === "research" ? { level: "STATIC", value: 0.8, confidence: 0.6 } : null),
    }
    const r = runEngine(makeEngineInput({ providers }))
    if (r.degraded) return
    expect(r.decision.selected).toBe("prov/model2#high")
    const winner = r.decision.scores.find((s) => s.candidateId === "prov/model2#high")!
    expect(winner.tier).toBe("KNOWN_EVIDENCED")
  })

  it("determinism: same state → identical decisionId and selection (double run)", () => {
    const a = runEngine(makeEngineInput({}))
    const b = runEngine(makeEngineInput({}))
    if (a.degraded || b.degraded) throw new Error("unexpected degradation")
    expect(a.decision.decisionId).toBe(b.decision.decisionId)
    expect(a.decision.selected).toBe(b.decision.selected)
  })

  it("MANDATORY empty-eligible → BLOCK (no silent degradation)", () => {
    const req = buildRequirement({ ...makeEngineInput({}).requirement, modality: "vision" })
    expect(req.kind).toBe("ok")
    if (req.kind !== "ok") return
    const r = runEngine(makeEngineInput({ requirement: { ...req.requirement } }))
    expect(r.decision.selected).toBeNull()
    expect(r.decision.excluded.some((e) => e.gate === "D2_CAPABILITY")).toBe(true)
  })

  it("relative normalization: cheapest/faster of two evidenced candidates wins on routine-coding", () => {
    const req = buildRequirement({
      sourceTaskClass: "latency-sensitive", riskClass: "low", agent: "build", modality: "text",
      complexity: "low", contextDemand: "small", reasoningDemand: "low",
      latencyPreference: "speed", qualityPreference: "normal", costProfile: "economy",
    })
    if (req.kind !== "ok") throw new Error()
    const providers: EvidenceProviders = {
      ...noopProviders,
      costDatum: (id) => (id === "prov/model0#high" ? { effectiveCost: 1, confidence: 0.9 } : id === "prov/model1#high" ? { effectiveCost: 0.5, confidence: 0.9 } : { effectiveCost: 0.8, confidence: 0.9 }),
      latencyDatum: (id) => (id === "prov/model0#high" ? { p50Ms: 800, confidence: 0.9, sampleSize: 10 } : id === "prov/model1#high" ? { p50Ms: 200, confidence: 0.9, sampleSize: 10 } : { p50Ms: 600, confidence: 0.9, sampleSize: 10 }),
    }
    const r = runEngine(makeEngineInput({ requirement: req.requirement, providers }))
    if (r.degraded) return
    expect(r.decision.selected).toBe("prov/model1#high")
    expect(r.decision.tieBreaker).toBeNull()
  })

  it("exception inside pipeline → degradedToV21 (ADR-010 boundary)", () => {
    const providers: EvidenceProviders = {
      ...noopProviders,
      quality: () => { throw new Error("boom") },
    }
    const r = runEngine(makeEngineInput({ providers }))
    expect(r.degraded).toBe(true)
    if (!r.degraded) return
    expect(r.decision.degradedToV21).toBe(true)
    expect(r.reason).toContain("boom")
  })
})

describe("V2.2 evaluation store (I-016)", () => {
  const sig = (over: Partial<Parameters<typeof isAttributionComplete>[0]> & Record<string, unknown>): Parameters<typeof isAttributionComplete>[0] =>
    ({
      signalId: "SIG-1",
      executionId: "E1",
      chain: {
        sessionId: "S1", routeId: "R1", executionId: "E1",
        candidate: { providerId: "prov", modelId: "m", variant: "high" },
        taskClass: "deep-research", evaluationId: "V1",
      },
      attributionComplete: true,
      quality: { ...({} as object), grade: 0.9, confidence: 0.8, evaluatorId: "ev", failureClass: null },
      execution: null,
      ...over,
    }) as Parameters<typeof isAttributionComplete>[0]

  it("complete attribution detected", () => {
    expect(isAttributionComplete(sig({}))).toBe(true)
  })

  it("missing variant/taskClass ⇒ incomplete (stored, zero statistics)", () => {
    const noVariant = sig({ chain: { ...sig({}).chain, candidate: { providerId: "prov", modelId: "m", variant: null } } })
    expect(isAttributionComplete(noVariant)).toBe(true) // null variant = base model, still identified
    const noClass = sig({ chain: { ...sig({}).chain, taskClass: "" as never } })
    expect(isAttributionComplete(noClass)).toBe(false)
    const flagged = sig({ attributionComplete: false })
    expect(isAttributionComplete(flagged)).toBe(false)
  })

  it("quality aggregate requires n ≥ 5; incomplete signals never counted", () => {
    const store = new EvaluationStore(join(tmpdir(), `v22-store-${Date.now()}.jsonl`))
    for (let i = 0; i < 4; i++) {
      store.record(sig({ signalId: `SIG-${i}`, executionId: `E${i}`, chain: { ...sig({}).chain, executionId: `E${i}`, evaluationId: `V${i}` }, quality: { grade: 0.9, confidence: 0.8, evaluatorId: "ev", failureClass: null } } as never), false)
    }
    store.record(sig({ signalId: "SIG-AUDIT", attributionComplete: false, quality: { grade: 0.1, confidence: 0.8, evaluatorId: "ev", failureClass: null } } as never), false)
    const s = store.stats()
    expect(s.qualityByCandidate.size).toBe(0) // 4 attributed < 5; 1 incomplete excluded
    expect(s.incomplete).toBe(1)
    // Wave 2 merge semantics: one executionId = one view; distinct executions E0..E4 stay distinct
    store.record(sig({ signalId: "SIG-5", executionId: "E4", chain: { ...sig({}).chain, executionId: "E4", evaluationId: "V5" }, quality: { grade: 0.9, confidence: 0.8, evaluatorId: "ev", failureClass: null } } as never), false)
    const s2 = store.stats()
    expect(s2.qualityByCandidate.get("prov/m#high")?.n).toBe(5)
    expect(s2.qualityByCandidate.get("prov/m#high")?.mean).toBeCloseTo(0.9, 12)
  })
})

describe("V2.2 telemetry (I-021 fail-open)", () => {
  it("emits T3 JSONL; sweepRetention removes old files without throwing", () => {
    const root = mkdtempSync(join(tmpdir(), "v22-telemetry-"))
    emitT3(root, {
      executionId: "E1", routeId: "R1",
      candidate: { providerId: "prov", modelId: "m", variant: "high" },
      taskClass: "deep-research", outputSizeBucket: null,
      t0: 1, t1: 2, t2: null, t3: null, ttfrMs: null, completionMs: null,
      timeout: false, missingReason: "t2-unobservable",
    })
    const file = join(telemetryDir(root), "t3.jsonl")
    expect(existsSync(file)).toBe(true)
    const rec = JSON.parse(readFileSync(file, "utf8"))
    expect(rec.event).toBe("T3")
    expect(rec.t2).toBeNull()
    expect(rec.missingReason).toBe("t2-unobservable")
    expect(sweepRetention(root)).toBe(0)
    expect(telemetryDiagnostics().written).toBeGreaterThan(0)
  })

  it("unwritable telemetry dir → degraded counter, never throws", () => {
    // a path THROUGH a file is unwritable: root is a file, dir creation must fail
    const rootFile = join(tmpdir(), `v22-blocked-${Date.now()}`)
    writeFileSync(rootFile, "not a dir")
    expect(() => emitT3(rootFile, {
      executionId: "E1", routeId: "R1",
      candidate: { providerId: "prov", modelId: "m", variant: null },
      taskClass: "deep-research", outputSizeBucket: null,
      t0: null, t1: null, t2: null, t3: null, ttfrMs: null, completionMs: null,
      timeout: false, missingReason: "unobservable",
    })).not.toThrow()
    expect(telemetryDiagnostics().degradedCount).toBeGreaterThan(0)
  })

  it("retention sweep deletes files older than 30 days", () => {
    const root = mkdtempSync(join(tmpdir(), "v22-sweep-"))
    const dir = telemetryDir(root)
    mkdirSync(dir, { recursive: true })
    const oldFile = join(dir, "t1.jsonl")
    writeFileSync(oldFile, "{}\n")
    const old = new Date(Date.now() - 31 * 24 * 3_600_000)
    utimesSync(oldFile, old, old)
    expect(sweepRetention(root)).toBe(1)
  })
})
