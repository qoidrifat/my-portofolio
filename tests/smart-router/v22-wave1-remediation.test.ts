// Smart Router V2.2 — Wave 1 remediation regression tests (H1, H2, H3, H4, H7).
// Each describe maps to one Wave 1 defect; assertions pin the REMEDIATED contract so a
// regression re-introduces the defect, not the old buggy behavior.
// H1: class quality floor at D4 under the C1 evidence contract (KNOWN→enforced, UNKNOWN→no credit).
// H2: C1 REQUIRED-FLOOR fallback to the V2.1 route when floors are declared but unverified.
// H3: stickiness route identity (provider-qualified modelId) + breaker authority override.
// H4: cold-start ranking seeded by the V2.1 ladder — ASCII only as the final evidenced tie-break.
// H7: evaluation attribution lifecycle (no fabricated evaluationId) + signal event identity.

import { describe, it, expect } from "vitest"
import { mkdtempSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { Candidate, ColdStartTier, DimensionValue, ExecutionOutcome, ScoreDimension, ScoredCandidate } from "../../.opencode/smart-router/v22/types.ts"
import { buildRequirement } from "../../.opencode/smart-router/v22/requirement.ts"
import { applyHardGates } from "../../.opencode/smart-router/v22/gates.ts"
import { runEngine, noopProviders, type EvidenceProviders } from "../../.opencode/smart-router/v22/engine.ts"
import { rankCandidates } from "../../.opencode/smart-router/v22/scoring.ts"
import { applyStickiness, emptyHysteresisState } from "../../.opencode/smart-router/v22/hysteresis.ts"
import { EvaluationStore, isAttributionComplete } from "../../.opencode/smart-router/v22/evaluation-store.ts"
import { CLASS_FLOORS } from "../../.opencode/smart-router/v22/policy-data.ts"

const NOW = "2026-08-29T12:00:00.000Z"
const DIMS = ["quality", "capabilityFit", "reliability", "latency", "cost", "context", "recent"] as ScoreDimension[]

const req = (sourceTaskClass: "security-review" | "deep-research") => {
  const r = buildRequirement({
    sourceTaskClass,
    riskClass: sourceTaskClass === "security-review" ? "high" : "medium",
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
  if (r.kind !== "ok") throw new Error("requirement failed")
  return r.requirement
}

const mk = (candidateId: string, ladderRank: number): Candidate => ({
  candidateId,
  provider: candidateId.split("/")[0] ?? candidateId,
  model: (candidateId.split("/")[1] ?? candidateId).split("#")[0] ?? candidateId,
  variant: candidateId.split("#")[1] ?? null,
  variantStatus: "VERIFIED",
  policyStatus: "ALLOWED",
  maxContextTokens: 0,
  ladderRank,
})

const noBudgets = { costBudget: null, latencyBudgetP95Ms: null }

const baseFns: Parameters<typeof applyHardGates>[3] = {
  capability: () => "UNKNOWN",
  contextWindow: () => null,
  health: () => null,
  budgetEvidence: () => ({ estimatedCost: null, costConfidence: 0, p95LatencyMs: null, latencyConfidence: 0 }),
  quality: () => null,
}

const q = (intrinsic: number | null, intrinsicConfidence: number, observed: number | null = null, observedConfidence = 0) => () => ({
  intrinsic,
  intrinsicConfidence,
  observed,
  observedConfidence,
  observedSampleSize: observed !== null ? 10 : 0,
})

// --- H1 ----------------------------------------------------------------------

describe("H1: class quality floor at D4 (C1 evidence contract)", () => {
  const sec = req("security-review")
  const floors = CLASS_FLOORS["security-review"]
  const deep = req("deep-research")

  it("KNOWN below floor on every leg → EXCLUDED (intrinsic 0.4 + observed 0.5, conf 0.9)", () => {
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, quality: q(0.4, 0.9, 0.5, 0.9) }, noBudgets)
    expect(r.eligible).toEqual([])
    expect(r.exclusions[0]?.gate).toBe("D4_HEALTH_BREAKER")
    expect(r.exclusions[0]?.reason).toContain("quality below floor")
  })

  it("KNOWN at/above floor → eligible with floorCredit (intrinsic 0.7, conf 0.9)", () => {
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, capability: () => "INTEGRATED", quality: q(0.7, 0.9) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(true)
  })

  it("observed leg alone verifies the floor when qualityObservedAlternative (0.8, conf 0.9, intrinsic null)", () => {
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, capability: () => "INTEGRATED", quality: q(null, 0, 0.8, 0.9) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(true)
  })

  it("observed leg IGNORED without qualityObservedAlternative (deep-research) → eligible WITHOUT credit", () => {
    const r = applyHardGates([mk("p/a#high", 0)], deep, CLASS_FLOORS["deep-research"], { ...baseFns, quality: q(null, 0, 0.9, 0.9) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(false)
  })

  it("one leg known-below + one UNKNOWN → eligible WITHOUT credit (UNKNOWN never converted to failure)", () => {
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, quality: q(0.4, 0.9, null, 0) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(false)
    expect(r.exclusions).toEqual([])
  })

  it("quality UNKNOWN (null) → eligible WITHOUT credit, never excluded", () => {
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, quality: () => null }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(false)
  })

  it("deep-research quality below floor (intrinsic-only floor) → EXCLUDED even with high observed", () => {
    const r = applyHardGates([mk("p/a#high", 0)], deep, CLASS_FLOORS["deep-research"], { ...baseFns, quality: q(0.4, 0.9, 0.9, 0.9) }, noBudgets)
    expect(r.eligible).toEqual([])
    expect(r.exclusions[0]?.reason).toContain("quality below floor")
  })

  it("deep-research quality above floor → eligible with floor credit", () => {
    const r = applyHardGates([mk("p/a#high", 0)], deep, CLASS_FLOORS["deep-research"], { ...baseFns, capability: () => "INTEGRATED", quality: q(0.7, 0.9) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(true)
  })

  it("I-019: observed leg with sampleSize < 5 can never enforce or pass the floor", () => {
    const tinyObserved = () => ({ intrinsic: 0.4, intrinsicConfidence: 0.9, observed: 0.9, observedConfidence: 0.9, observedSampleSize: 3 })
    const r = applyHardGates([mk("p/a#high", 0)], sec, floors, { ...baseFns, quality: tinyObserved }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/a#high"])
    expect(r.floorCredit.get("p/a#high")).toBe(false)
    expect(r.exclusions).toEqual([])
  })

  it("mixed set: verified candidate survives with credit; below-floor candidate excluded", () => {
    const cands = [mk("p/ok#high", 0), mk("p/bad#high", 1)]
    const r = applyHardGates(cands, sec, floors, { ...baseFns, capability: () => "INTEGRATED", quality: (id) => (id === "p/ok#high" ? { intrinsic: 0.8, intrinsicConfidence: 0.9, observed: null, observedConfidence: 0, observedSampleSize: 0 } : { intrinsic: 0.2, intrinsicConfidence: 0.9, observed: 0.3, observedConfidence: 0.9, observedSampleSize: 10 }) }, noBudgets)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["p/ok#high"])
    expect(r.floorCredit.get("p/ok#high")).toBe(true)
    expect(r.exclusions[0]?.candidateId).toBe("p/bad#high")
  })

  it("every candidate below floor → eligible empty → engine BLOCKs (never a silent pick)", () => {
    const r = runEngine(engineInput({ providers: { ...noopProviders, capabilityLevel: () => "INTEGRATED", capabilityDim: () => ({ level: "INTEGRATED", value: null, confidence: 0.9 }), quality: q(0.1, 0.9, 0.2, 0.9) } }))
    expect(r.kind).toBe("blocked")
    if (r.kind !== "blocked") return
    expect(r.reason).toContain("no eligible candidate")
    expect(r.exclusions.some((e) => e.reason.includes("quality below floor"))).toBe(true)
  })
})

// --- H2 ----------------------------------------------------------------------

const engineProviders = (over: Partial<EvidenceProviders> = {}): EvidenceProviders => ({
  ...noopProviders,
  capabilityLevel: () => "INTEGRATED",
  capabilityDim: () => ({ level: "INTEGRATED", value: null, confidence: 0.9 }),
  ...over,
})

function engineInput(over: Partial<Parameters<typeof runEngine>[0]>): Parameters<typeof runEngine>[0] {
  return {
    mode: "SHADOW",
    requirement: req("security-review"),
    candidates: [mk("p/a#high", 0), mk("p/b#high", 1)],
    providers: engineProviders(),
    budgets: noBudgets,
    hysteresis: emptyHysteresisState({ taskClass: "security-review", risk: "high" }),
    stickyRouteBroken: false,
    now: NOW,
    sessionId: "S1",
    routeId: "R1",
    attempt: 1,
    ...over,
  }
}

describe("H2: C1 REQUIRED-FLOOR fallback (V2.1 anchor when floors unverified)", () => {
  it("floors declared, no floor-verified candidate, some KNOWN_EVIDENCED → degraded to V2.1", () => {
    const r = runEngine(engineInput({}))
    expect(r.kind).toBe("degraded")
    if (r.kind !== "degraded") return
    expect(r.degraded).toBe(true)
    expect(r.selected).toBeNull()
    expect(r.decision.degradedToV21).toBe(true)
    expect(r.reason).toContain("REQUIRED_FLOOR")
    expect(r.decision.scores.length).toBe(2)
  })

  it("floor-verified candidate exists → ok; unverified peer stays eligible WITHOUT credit", () => {
    const providers = engineProviders({ quality: (id) => (id === "p/a#high" ? { intrinsic: 0.7, intrinsicConfidence: 0.9, observed: null, observedConfidence: 0, observedSampleSize: 0 } : null) })
    const r = runEngine(engineInput({ providers }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.floorCredit.get("p/a#high")).toBe(true)
    expect(r.floorCredit.get("p/b#high")).toBe(false)
    expect(r.decision.degradedToV21).toBe(false)
  })

  it("pure cold start (all UNPROVEN) → D-COLD ladder head, NOT the H2 fallback", () => {
    const r = runEngine(engineInput({ providers: noopProviders }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("p/a#high")
    expect(r.decision.degradedToV21).toBe(false)
    expect(r.decision.scores.every((s) => s.tier === "UNPROVEN")).toBe(true)
  })
})

// --- H3 ----------------------------------------------------------------------

describe("H3: sticky route identity (qualified modelId) + breaker authority", () => {
  const cands = [mk("prov/model0#high", 0), mk("prov/model1#high", 1)]
  const sticky = (modelId = "prov/model1"): Parameters<typeof runEngine>[0]["hysteresis"] => ({
    ...emptyHysteresisState({ taskClass: "deep-research", risk: "medium" }),
    currentRoute: { providerId: "prov", modelId, variant: "high" },
    stickSince: NOW,
  })
  const base = (over: Partial<Parameters<typeof runEngine>[0]>): Parameters<typeof runEngine>[0] => ({
    mode: "SHADOW",
    requirement: req("deep-research"),
    candidates: cands,
    providers: noopProviders,
    budgets: noBudgets,
    hysteresis: sticky(),
    stickyRouteBroken: false,
    now: NOW,
    sessionId: "S1",
    routeId: "R1",
    attempt: 1,
    ...over,
  })

  it("sticky route retained at cold start (H3 lookup regression: provider-qualified modelId)", () => {
    const r = runEngine(base({}))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("prov/model1#high")
    expect(r.selected?.modelId).toBe("prov/model1")
    expect(r.decision.stickinessApplied).toBe(true)
    expect(r.stickiness.retained).toBe(true)
  })

  it("engine exposes the evolved hysteresis state for caller persistence", () => {
    const r = runEngine(base({}))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.stickiness.state.currentRoute).toEqual({ providerId: "prov", modelId: "prov/model1", variant: "high" })
    expect(r.stickiness.state.exceedCount).toBe(0)
  })

  it("sticky route breaker OPEN → excluded at D4 → challenger adopted", () => {
    const providers = { ...noopProviders, health: (id: string) => (id === "prov/model1#high" ? { breakerState: "OPEN" as const, successRate: null, confidence: 0, sampleSize: 0 } : null) }
    const r = runEngine(base({ providers }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("prov/model0#high")
    expect(r.decision.stickinessApplied).toBe(false)
  })

  it("stickyRouteBroken flag (HALF_OPEN sticky + CLOSED peer) overrides stickiness", () => {
    const providers = {
      ...noopProviders,
      health: (id: string) => (id === "prov/model1#high" ? { breakerState: "HALF_OPEN" as const, successRate: null, confidence: 0, sampleSize: 0 } : { breakerState: "CLOSED" as const, successRate: null, confidence: 0, sampleSize: 0 }),
    }
    const r = runEngine(base({ providers }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("prov/model0#high")
    expect(r.stickiness.retained).toBe(false)
    expect(r.stickiness.reason).toContain("safety overrides stickiness")
  })

  it("input stickyRouteBroken flag alone overrides stickiness", () => {
    const r = runEngine(base({ stickyRouteBroken: true }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("prov/model0#high")
    expect(r.stickiness.retained).toBe(false)
  })

  it("sticky route absent from candidate set (unknown model) → challenger adopted", () => {
    const r = runEngine(base({ hysteresis: sticky("prov/model9") }))
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.selected?.candidateId).toBe("prov/model0#high")
  })

  it("hysteresis thresholds: ≤H retained; >H streak of 3 → replaced; >2H sustained ≥24h → replaced", () => {
    const H = 0.05
    const seeded = sticky()
    const winner = (score: number) => ({ candidateId: "prov/model0#high", route: { providerId: "prov", modelId: "prov/model0", variant: "high" as const }, score })
    const opts = { stickyRouteBroken: false, now: NOW, h: H } as const

    const ok = applyStickiness(seeded, winner(0.5), 0.48, opts)
    expect(ok.retained).toBe(true)

    const one = applyStickiness(seeded, winner(0.5), 0.4, opts)
    expect(one.retained).toBe(true)
    expect(one.state.exceedCount).toBe(1)

    const two = applyStickiness(one.state, winner(0.5), 0.4, opts)
    expect(two.retained).toBe(true)
    const three = applyStickiness(two.state, winner(0.5), 0.4, opts)
    expect(three.retained).toBe(false)
    expect(three.reason).toContain("reset")

    const strongSince = "2026-08-28T11:00:00.000Z"
    const strong = applyStickiness({ ...seeded, exceedStrongCount: 1, exceedStrongSince: strongSince }, winner(0.9), 0.1, opts)
    expect(strong.retained).toBe(false)
    expect(strong.reason).toContain("sustained")
  })
})

// --- H4 ----------------------------------------------------------------------

const neutralValues = (): Record<ScoreDimension, DimensionValue> =>
  Object.fromEntries(DIMS.map((d) => [d, neutralValue()])) as Record<ScoreDimension, DimensionValue>
const neutralValue = (): DimensionValue => ({ value: null, confidence: 0, sampleSize: 0, lastUpdated: null })

const scoredFor = (candidates: Candidate[], tier: ColdStartTier, score = 0): ScoredCandidate[] =>
  candidates.map((c) => ({
    candidateId: c.candidateId,
    score,
    confidence: tier === "KNOWN_EVIDENCED" ? 0.9 : 0,
    contributions: Object.fromEntries(DIMS.map((d) => [d, 0])) as Record<ScoreDimension, number>,
    values: neutralValues(),
    tier,
  }))

describe("H4: cold-start ranking is V2.1-ladder-seeded (ASCII only as final evidenced tie-break)", () => {
  it("all UNPROVEN: ladder head wins even when an ASCII-earlier id has a worse rank", () => {
    const cands = [mk("a/aaa#high", 1), mk("z/zzz#high", 0)]
    const r = rankCandidates({ candidates: cands, scored: scoredFor(cands, "UNPROVEN") })
    expect(r.coldStartFallback).toBe(true)
    expect(r.ranked[0]?.candidateId).toBe("z/zzz#high")
    expect(r.tieBreaker).toBeNull()
  })

  it("multiple UNPROVEN candidates → full V2.1 ladder order", () => {
    const cands = [mk("a/one#high", 2), mk("b/two#high", 0), mk("c/three#high", 1)]
    const r = rankCandidates({ candidates: cands, scored: scoredFor(cands, "UNPROVEN") })
    expect(r.ranked.map((s) => s.candidateId)).toEqual(["b/two#high", "c/three#high", "a/one#high"])
  })

  it("mixture: KNOWN_EVIDENCED precedes UNPROVEN; unproven peers follow in ladder order", () => {
    const cands = [mk("a/aaa#high", 0), mk("z/zzz#high", 1)]
    const scored = scoredFor(cands, "UNPROVEN")
    scored[1] = { ...scored[1]!, tier: "KNOWN_EVIDENCED", score: 0.42, confidence: 0.9 }
    const r = rankCandidates({ candidates: cands, scored })
    expect(r.coldStartFallback).toBe(false)
    expect(r.ranked[0]?.candidateId).toBe("z/zzz#high")
    expect(r.ranked[1]?.candidateId).toBe("a/aaa#high")
  })

  it("all candidates breaker OPEN → gates exclude all → engine BLOCKs (no ASCII survivor)", () => {
    const providers = { ...noopProviders, health: () => ({ breakerState: "OPEN" as const, successRate: null, confidence: 0, sampleSize: 0 }) }
    const r = runEngine(engineInput({ candidates: [mk("a/aaa#high", 0), mk("z/zzz#high", 1)], providers }))
    expect(r.kind).toBe("blocked")
    if (r.kind !== "blocked") return
    expect(r.exclusions.every((e) => e.gate === "D4_HEALTH_BREAKER")).toBe(true)
  })
})

// --- H7 ----------------------------------------------------------------------

const outcome = (over: Partial<ExecutionOutcome> = {}): ExecutionOutcome => ({
  sessionId: "S1",
  routeId: "R1",
  executionId: "E1",
  providerId: "prov",
  modelId: "prov/model1",
  variant: "high",
  taskClass: "deep-research",
  optimizationClass: "deep-research",
  timestamp: NOW,
  provenance: ["test"],
  outcome: "COMPLETED",
  errorClass: null,
  environment: { timeout: false, network: false, quota: false, tooling: false, userCancel: false },
  ...over,
})

describe("H7: attribution lifecycle (no fabricated evaluationId) + signal event identity", () => {
  const store = (): { s: EvaluationStore; dir: string } => {
    const dir = mkdtempSync(join(tmpdir(), "v22wave1-"))
    return { s: new EvaluationStore(join(dir, "signals.jsonl")), dir }
  }

  it("execution outcome without evaluationId → stored for audit, attribution INCOMPLETE, zero stats effect", () => {
    const { s, dir } = store()
    try {
      const r = s.recordExecution(outcome())
      expect(r).toEqual({ stored: true, attributed: false })
      expect(s.all()[0]?.chain.evaluationId).toBe("")
      expect(isAttributionComplete(s.all()[0]!)).toBe(false)
      const stats = s.stats()
      expect(stats.total).toBe(1)
      expect(stats.attributed).toBe(0)
      expect(stats.incomplete).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("execution outcome WITH evaluationId → attribution complete", () => {
    const { s, dir } = store()
    try {
      const r = s.recordExecution(outcome(), true, "EV-1")
      expect(r).toEqual({ stored: true, attributed: true })
      expect(isAttributionComplete(s.all()[0]!)).toBe(true)
      expect(s.stats().attributed).toBe(1)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("missing routeId → incomplete even with evaluationId; variant null (base model) → complete", () => {
    const { s, dir } = store()
    try {
      const noRoute = s.recordExecution(outcome({ routeId: "" }), true, "EV-1")
      expect(noRoute.attributed).toBe(false)
      const baseModel = s.recordExecution(outcome({ executionId: "E2", variant: null }), true, "EV-2")
      expect(baseModel.attributed).toBe(true)
      expect(s.all()[1]?.chain.candidate.modelId).toBe("prov/model1")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("duplicate execution outcome (same executionId → same signalId) is ignored (first wins)", () => {
    const { s, dir } = store()
    try {
      expect(s.recordExecution(outcome(), true, "EV-1").stored).toBe(true)
      const dup = s.recordExecution(outcome({ outcome: "FAILED", errorClass: "timeout" }), true, "EV-1")
      expect(dup).toEqual({ stored: false, attributed: false })
      expect(s.all().length).toBe(1)
      expect(s.all()[0]?.execution?.outcome).toBe("COMPLETED")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("duplicate evaluation signal (same signalId via record) is ignored", () => {
    const { s, dir } = store()
    try {
      const sig = {
        signalId: "SIG-1",
        executionId: "E1",
        chain: { sessionId: "S1", routeId: "R1", executionId: "E1", candidate: { providerId: "prov", modelId: "prov/model1", variant: "high" as const }, taskClass: "deep-research" as const, evaluationId: "EV-1" },
        attributionComplete: true,
        quality: { grade: 0.8, confidence: 0.9, evaluatorId: "ev", failureClass: null },
        execution: undefined,
      }
      expect(s.record(sig as never).stored).toBe(true)
      expect(s.record({ ...sig, quality: { grade: 0.1, confidence: 0.9, evaluatorId: "ev", failureClass: null } } as never)).toEqual({ stored: false, attributed: false })
      expect(s.all().length).toBe(1)
      expect(s.all()[0]?.quality?.grade).toBe(0.8)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
