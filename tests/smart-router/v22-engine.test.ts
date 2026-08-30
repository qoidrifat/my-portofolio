// Smart Router V2.2 — engine tests for Phases A–I (types, requirement, gates, evidence, scoring, hysteresis).
// Canonical references: ROUTING_MODEL §4.3/§7/§10.3/§11/§16, DECISION_MATRIX §1/§1.1/§2, ADR-011/012/014/015.

import { describe, it, expect } from "vitest"
import type { Candidate, DimensionValue, ScoreDimension, ScoredCandidate, WeightProfile } from "../../.opencode/smart-router/v22/types.ts"
import { CAPABILITY_FLOORS, CLASS_MAPPING, WEIGHT_PROFILES } from "../../.opencode/smart-router/v22/policy-data.ts"
import type { ClassFloors } from "../../.opencode/smart-router/v22/policy-data.ts"
import { buildRequirement } from "../../.opencode/smart-router/v22/requirement.ts"
import { discoverCandidates } from "../../.opencode/smart-router/v22/discovery.ts"
import { applyHardGates } from "../../.opencode/smart-router/v22/gates.ts"
import { capabilityFit, contextFit, costFit, latencyFit, quality, recentSuccess, reliability, type DimInputs } from "../../.opencode/smart-router/v22/evidence.ts"
import { applyProbeRule, coldStartTier, candidateConfidence, rankCandidates, renormalizedWeights, riskAdjustedWeights, scoreCandidate } from "../../.opencode/smart-router/v22/scoring.ts"
import { applyStickiness, emptyHysteresisState, noteEnvironmentOutcome, HYSTERESIS_H_EVIDENCE_FLOOR, HYSTERESIS_H_PROVISIONAL } from "../../.opencode/smart-router/v22/hysteresis.ts"

const dim = (value: number | null, confidence: number, sampleSize = 10): DimensionValue => ({ value, confidence, sampleSize, lastUpdated: null })

function allKnown(values: Partial<Record<ScoreDimension, number>>): Record<ScoreDimension, DimensionValue> {
  const full = { quality: 0.5, capabilityFit: 0.5, reliability: 0.5, latency: 0.5, cost: 0.5, context: 0.5, recent: 0.5 }
  const out = {} as Record<ScoreDimension, DimensionValue>
  for (const d of Object.keys(full) as ScoreDimension[]) out[d] = dim(values[d] ?? full[d], 0.8)
  return out
}

const baseInput = {
  sourceTaskClass: "security-review" as const,
  riskClass: "critical" as const,
  agent: "reviewer" as const,
  modality: "text" as const,
  complexity: "high" as const,
  contextDemand: "medium" as const,
  reasoningDemand: "max" as const,
  latencyPreference: "normal" as const,
  qualityPreference: "max" as const,
  costProfile: "quality" as const,
}

// --- Phase B: mapping + requirement ------------------------------------------

describe("V2.2 Phase B — C4 mapping + requirement builder", () => {
  it("maps all 21 source classes (total, deterministic)", () => {
    const sources = Object.keys(CLASS_MAPPING)
    expect(sources.length).toBe(21)
    for (const s of sources) expect(CLASS_MAPPING[s as keyof typeof CLASS_MAPPING]).toBeDefined()
  })

  it("blocks vision-task at the mapping level (hard gate, not a profile)", () => {
    expect(CLASS_MAPPING["vision-task"].blocked).toBe(true)
    const r = buildRequirement({ ...baseInput, sourceTaskClass: "vision-task" })
    expect(r.kind).toBe("blocked")
  })

  it("attaches class floors; vision modality adds a MANDATORY requirement", () => {
    const r = buildRequirement(baseInput)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    expect(r.requirement.optimizationClass).toBe("security-review")
    expect(r.requirement.capabilityRequirements.length).toBe(2)
    const vision = buildRequirement({ ...baseInput, modality: "vision" })
    expect(vision.kind).toBe("ok")
    if (vision.kind !== "ok") return
    const mand = vision.requirement.capabilityRequirements.find((x) => x.tier === "MANDATORY")
    expect(mand?.dim).toBe("vision")
  })

  it("weight profiles sum to 1 and deep-research matches the normative row", () => {
    for (const p of Object.values(WEIGHT_PROFILES)) {
      expect(Object.values(p).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    }
    expect(WEIGHT_PROFILES["deep-research"].quality).toBe(0.40)
    expect(WEIGHT_PROFILES["deep-research"].latency).toBe(0.02)
    expect(WEIGHT_PROFILES["security-review"].reliability).toBe(0.25)
  })

  it("security-review floors are REQUIRED_FLOOR at INTEGRATED (C1)", () => {
    for (const f of CAPABILITY_FLOORS["security-review"]) {
      expect(f.tier).toBe("REQUIRED_FLOOR")
      expect(f.minLevel).toBe("INTEGRATED")
    }
  })
})

// --- Phase C: hard gates -------------------------------------------------------

describe("V2.2 Phase C — hard gates D1–D5", () => {
  const req = buildRequirement(baseInput)
  if (req.kind !== "ok") throw new Error("requirement failed")
  const requirement = req.requirement
  const classFloors: ClassFloors = { health: { threshold: 0.5, confidenceGate: 0.6 }, quality: { threshold: 0.6, confidenceGate: 0.6 }, qualityObservedAlternative: true }
  const mk = (id: string): Candidate => ({ candidateId: id, provider: "p", model: id, variant: null, variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 0 })
  const noBudget = { costBudget: null, latencyBudgetP95Ms: null }
  const fns: Parameters<typeof applyHardGates>[3] = {
    capability: () => "UNKNOWN",
    contextWindow: () => null,
    health: () => null,
    budgetEvidence: () => ({ estimatedCost: null, costConfidence: 0, p95LatencyMs: null, latencyConfidence: 0 }),
    quality: () => null,
  }

  it("REQUIRED_FLOOR + UNKNOWN → eligible WITHOUT floor credit (C1)", () => {
    const r = applyHardGates([mk("a")], requirement, classFloors, fns, noBudget)
    expect(r.eligible.map((c) => c.candidateId)).toEqual(["a"])
    expect(r.floorCredit.get("a")).toBe(false)
  })

  it("MANDATORY + UNKNOWN → excluded (C1)", () => {
    const vision = buildRequirement({ ...baseInput, modality: "vision" })
    if (vision.kind !== "ok") throw new Error("requirement failed")
    const r = applyHardGates([mk("a")], vision.requirement, classFloors, fns, noBudget)
    expect(r.eligible).toEqual([])
    expect(r.exclusions[0].gate).toBe("D2_CAPABILITY")
  })

  it("floor credit granted only at ≥ minLevel", () => {
    // H1: floorCredit requires capability credit AND class-quality verification — both supplied here
    const credit: typeof fns = {
      ...fns,
      capability: (c, d) => (d === "review" || d === "reasoning" ? "INTEGRATED" : "UNKNOWN"),
      quality: () => ({ intrinsic: 0.9, intrinsicConfidence: 0.9, observed: null, observedConfidence: 0, observedSampleSize: 0 }),
    }
    const r = applyHardGates([mk("a")], requirement, classFloors, credit, noBudget)
    expect(r.floorCredit.get("a")).toBe(true)
  })

  it("breaker OPEN hard-excludes; health floor enforced only with conf ≥ .6 and n ≥ 5 (I-019)", () => {
    const open: typeof fns = { ...fns, health: () => ({ breakerState: "OPEN", successRate: 0.9, confidence: 0.9, sampleSize: 20 }) }
    expect(applyHardGates([mk("a")], requirement, classFloors, open, noBudget).eligible).toEqual([])
    const lowFloor: typeof fns = { ...fns, health: () => ({ breakerState: "CLOSED", successRate: 0.2, confidence: 0.9, sampleSize: 20 }) }
    expect(applyHardGates([mk("a")], requirement, classFloors, lowFloor, noBudget).exclusions[0].gate).toBe("D4_HEALTH_BREAKER")
    const lowConf: typeof fns = { ...fns, health: () => ({ breakerState: "CLOSED", successRate: 0.2, confidence: 0.4, sampleSize: 20 }) }
    expect(applyHardGates([mk("a")], requirement, classFloors, lowConf, noBudget).eligible.map((c) => c.candidateId)).toEqual(["a"])
    const smallN: typeof fns = { ...fns, health: () => ({ breakerState: "CLOSED", successRate: 0.2, confidence: 0.9, sampleSize: 3 }) }
    expect(applyHardGates([mk("a")], requirement, classFloors, smallN, noBudget).eligible.map((c) => c.candidateId)).toEqual(["a"])
  })

  it("budget gates are evidence-gated; UNKNOWN is inert", () => {
    const over: typeof fns = { ...fns, budgetEvidence: () => ({ estimatedCost: 10, costConfidence: 0.9, p95LatencyMs: null, latencyConfidence: 0 }) }
    const r = applyHardGates([mk("a")], requirement, classFloors, over, { costBudget: 5, latencyBudgetP95Ms: null })
    expect(r.exclusions[0].gate).toBe("D5_BUDGET")
    const unknown: typeof fns = { ...fns, budgetEvidence: () => ({ estimatedCost: null, costConfidence: 0, p95LatencyMs: null, latencyConfidence: 0 }) }
    expect(applyHardGates([mk("a")], requirement, classFloors, unknown, { costBudget: 0.0001, latencyBudgetP95Ms: 1 }).eligible.map((c) => c.candidateId)).toEqual(["a"])
  })

  it("D3 context gate: hard only when both sides known", () => {
    const small: typeof fns = { ...fns, contextWindow: () => 1000 }
    const r = applyHardGates([mk("a")], requirement, classFloors, small, noBudget)
    expect(r.exclusions[0].gate).toBe("D3_CONTEXT")
    expect(applyHardGates([mk("a")], requirement, classFloors, fns, noBudget).eligible.map((c) => c.candidateId)).toEqual(["a"])
  })

  it("UNSUPPORTED variant → D1 exclusion", () => {
    const bad: Candidate = { ...mk("a"), variantStatus: "UNSUPPORTED" }
    const r = applyHardGates([bad], requirement, classFloors, fns, noBudget)
    expect(r.exclusions[0].gate).toBe("D1_POLICY")
  })
})

// --- Phase E: evidence ---------------------------------------------------------

describe("V2.2 Phase E — evidence dimensions", () => {
  const req = buildRequirement(baseInput)
  if (req.kind !== "ok") throw new Error("requirement failed")
  const mkInputs = (over: Partial<DimInputs>): DimInputs => ({
    requirement: req.requirement,
    capability: () => null,
    health: null,
    quality: null,
    segment: null,
    contextWindowTokens: null,
    truncation: { truncationEvents: 0 },
    ...over,
  })

  it("capabilityFit: UNKNOWN evidence → neutral 0.5, confidence 0", () => {
    const f = capabilityFit(mkInputs({}))
    expect(f.value).toBe(0.5)
    expect(f.confidence).toBe(0)
  })

  it("capabilityFit: met floor → 1.0 with evidence confidence", () => {
    const f = capabilityFit(mkInputs({ capability: (d) => (d === "review" ? { level: "INTEGRATED", value: null, confidence: 0.8 } : d === "reasoning" ? { level: "STATIC", value: null, confidence: 0.6 } : null) }))
    // review ≥ INTEGRATED → 1.0; reasoning STATIC < INTEGRATED (known, below) → 0.0
    expect(f.value).toBe(0.5)
    expect(f.confidence).toBe(0.6)
  })

  it("reliability formula 0.6/0.25/0.15; n < 5 → neutral", () => {
    const f = reliability(mkInputs({ health: { breakerState: "CLOSED", successRate: 0.8, timeoutRate: 0.2, recoveryStability: 1, sampleSize: 20, confidence: 0.7 } }))
    expect(f.value).toBeCloseTo(0.6 * 0.8 + 0.25 * 0.8 + 0.15 * 1, 12)
    const g = reliability(mkInputs({ health: { breakerState: "CLOSED", successRate: 0.8, timeoutRate: 0, recoveryStability: 1, sampleSize: 3, confidence: 0.9 } }))
    expect(g.value).toBeNull()
  })

  it("quality blend clamps observed weight to [0.25, 0.75]; intrinsic-only ×0.5", () => {
    const blend = quality(mkInputs({ quality: { intrinsic: 0.8, intrinsicConfidence: 0.9, observed: 0.4, observedConfidence: 0.9, observedSampleSize: 12 } }))
    expect(blend.value).toBeCloseTo(0.5 * 0.8 + 0.5 * 0.4, 12) // equal confs → 50/50 PROVISIONAL
    const floor = quality(mkInputs({ quality: { intrinsic: 0.8, intrinsicConfidence: 0.1, observed: 1.0, observedConfidence: 0.9, observedSampleSize: 12 } }))
    expect(floor.value).toBeCloseTo(0.25 * 0.8 + 0.75 * 1.0, 12) // conf ratio 0.9 clamps observed weight to 0.75
    const intr = quality(mkInputs({ quality: { intrinsic: 0.8, intrinsicConfidence: 0.8, observed: null, observedConfidence: 0, observedSampleSize: 0 } }))
    expect(intr.value).toBe(0.8)
    expect(intr.confidence).toBeCloseTo(0.4, 12)
  })

  it("costFit/latencyFit relative normalization; UNKNOWN never zero", () => {
    expect(costFit({ effectiveCost: 0.5, confidence: 0.8 }, 1).value).toBe(0.5)
    expect(costFit({ effectiveCost: null, confidence: 0 }, 1).value).toBeNull()
    expect(latencyFit({ p50Ms: 500, confidence: 0.7, sampleSize: 10 }, 1000).value).toBe(0.5)
    expect(latencyFit({ p50Ms: null, confidence: 0, sampleSize: 0 }, 1000).value).toBeNull()
  })

  it("contextFit clamps and applies truncation penalty 0.9^k", () => {
    const r = buildRequirement({ ...baseInput, contextTokens: 1000 })
    if (r.kind !== "ok") throw new Error()
    const f = contextFit(mkInputs({ requirement: r.requirement, contextWindowTokens: 2000 }))
    expect(f.value).toBe(1)
    const g = contextFit(mkInputs({ requirement: r.requirement, contextWindowTokens: 2000, truncation: { truncationEvents: 2 } }))
    expect(g.value).toBeCloseTo(0.81, 12)
  })

  it("recentSuccess needs n ≥ 5", () => {
    expect(recentSuccess(mkInputs({ segment: { successRate: 0.9, sampleSize: 3, confidence: 0.9 } })).value).toBeNull()
    expect(recentSuccess(mkInputs({ segment: { successRate: 0.9, sampleSize: 20, confidence: 0.7 } })).value).toBe(0.9)
  })
})

// --- Phase F–H: scoring + ranking ----------------------------------------------

describe("V2.2 Phases F–H — scoring + cold start + tie-breaks", () => {
  it("risk overlay reweights and renormalizes to 1", () => {
    const w = riskAdjustedWeights(WEIGHT_PROFILES["routine-coding"], "critical")
    expect(Object.values(w).reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12)
    expect(w.quality).toBeGreaterThan(WEIGHT_PROFILES["routine-coding"].quality)
  })

  it("UNKNOWN dims are renormalized away, never scored as 0 or 0.5", () => {
    const values = allKnown({})
    values.cost = dim(null, 0)
    const { weights, unknown } = renormalizedWeights(WEIGHT_PROFILES["routine-coding"], values)
    expect(unknown).toEqual(["cost"])
    expect(weights.cost).toBe(0)
    expect(Object.entries(weights).filter(([d]) => d !== "cost").reduce((a, [, v]) => a + v, 0)).toBeCloseTo(1, 12)
  })

  it("reproduces ROUTING_MODEL §10.4 worked example (A = .859, B = .7285)", () => {
    const profile = WEIGHT_PROFILES["deep-research"]
    const a = allKnown({ quality: 0.82, capabilityFit: 0.90, reliability: 0.95, latency: 0.60, cost: 0.30, context: 0.95, recent: 0.90 })
    const b = allKnown({ quality: 0.74, capabilityFit: 0.80, reliability: 0.70, latency: 0.85, cost: 0.85, context: 0.60, recent: 0.70 })
    expect(scoreCandidate(a, profile, "medium").score).toBeCloseTo(0.859, 12)
    expect(scoreCandidate(b, profile, "medium").score).toBeCloseTo(0.7285, 12)
  })

  it("candidateConfidence = min over contributed dims", () => {
    const v = allKnown({})
    v.quality = dim(0.9, 0.3)
    expect(candidateConfidence(v)).toBe(0.3)
  })

  it("cold-start tier: any conf>0 known dim → KNOWN_EVIDENCED", () => {
    expect(coldStartTier(allKnown({}), false)).toBe("KNOWN_EVIDENCED")
    const neutral = {} as Record<ScoreDimension, DimensionValue>
    for (const d of Object.keys(neutral) as ScoreDimension[]) neutral[d] = dim(null, 0)
    void neutral
    expect(coldStartTier({ quality: dim(null, 0), capabilityFit: dim(null, 0), reliability: dim(null, 0), latency: dim(null, 0), cost: dim(null, 0), context: dim(null, 0), recent: dim(null, 0) }, false)).toBe("UNPROVEN")
    expect(coldStartTier(allKnown({}), true)).toBe("EXCLUDED")
  })

  it("all-UNPROVEN set resolves to the V2.1 ladder head, NOT ASCII (D-COLD, I-017)", () => {
    const neutral = {} as Record<ScoreDimension, DimensionValue>
    for (const d of Object.keys(neutral) as ScoreDimension[]) neutral[d] = dim(null, 0)
    const cands: Candidate[] = [
      { candidateId: "z/zed#max", provider: "z", model: "zed", variant: "max", variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 0 },
      { candidateId: "a/ant#max", provider: "a", model: "ant", variant: "max", variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 1 },
    ]
    const scored: ScoredCandidate[] = cands.map((c) => ({ candidateId: c.candidateId, score: 0.5, confidence: 0, contributions: {} as Record<ScoreDimension, number>, values: neutral, tier: "UNPROVEN" }))
    const r = rankCandidates({ candidates: cands, scored })
    expect(r.coldStartFallback).toBe(true)
    expect(r.selected.candidateId).toBe("z/zed#max")
  })

  it("ASCII tie-break (T6) applies only among evidenced equals", () => {
    const cands: Candidate[] = [
      { candidateId: "b/b", provider: "b", model: "b", variant: null, variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 0 },
      { candidateId: "a/a", provider: "a", model: "a", variant: null, variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 1 },
    ]
    const scored: ScoredCandidate[] = cands.map((c) => ({ candidateId: c.candidateId, score: 0.7, confidence: 0.8, contributions: { quality: 0.7, capabilityFit: 0, reliability: 0, latency: 0, cost: 0, context: 0, recent: 0 }, values: allKnown({}), tier: "KNOWN_EVIDENCED" }))
    const r = rankCandidates({ candidates: cands, scored })
    expect(r.selected.candidateId).toBe("a/a")
    expect(r.tieBreaker?.tier).toBe("T6")
  })

  it("T1 score dominates; tie-breaker detected at T2", () => {
    const cands: Candidate[] = ["x/x", "y/y"].map((id) => ({ candidateId: id, provider: id, model: id, variant: null, variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 0 }))
    const mk = (id: string, score: number, cap: number): ScoredCandidate => ({ candidateId: id, score, confidence: 0.8, contributions: { quality: score, capabilityFit: cap, reliability: 0, latency: 0, cost: 0, context: 0, recent: 0 }, values: allKnown({}), tier: "KNOWN_EVIDENCED" })
    const eq = [mk("x/x", 0.8, 0.9), mk("y/y", 0.8, 0.4)]
    expect(rankCandidates({ candidates: cands, scored: eq }).tieBreaker?.tier).toBe("T2")
    expect(rankCandidates({ candidates: cands, scored: eq }).selected.candidateId).toBe("x/x")
    const clear = [mk("x/x", 0.9, 0.4), mk("y/y", 0.8, 0.9)]
    expect(rankCandidates({ candidates: cands, scored: clear }).tieBreaker).toBeNull()
  })

  it("HALF_OPEN candidate never a ranked winner among healthy peers (probe rule)", () => {
    const cands: Candidate[] = ["p/probe", "h/healthy"].map((id) => ({ candidateId: id, provider: id, model: id, variant: null, variantStatus: "VERIFIED", policyStatus: "ALLOWED", maxContextTokens: 0, ladderRank: 0 }))
    const mk = (id: string, score: number): ScoredCandidate => ({ candidateId: id, score, confidence: 0.8, contributions: { quality: score, capabilityFit: 0, reliability: 0, latency: 0, cost: 0, context: 0, recent: 0 }, values: allKnown({}), tier: "KNOWN_EVIDENCED" })
    const scored = [mk("p/probe", 0.95), mk("h/healthy", 0.8)]
    const states = new Map([["p/probe", "HALF_OPEN" as const], ["h/healthy", "CLOSED" as const]])
    const r = applyProbeRule(scored, states)
    expect(r.selected?.candidateId).toBe("h/healthy")
    expect(r.probeExcluded).toBe("p/probe")
  })
})

// --- Phase I: hysteresis ---------------------------------------------------------

describe("V2.2 Phase I — hysteresis (ADR-015)", () => {
  const seg = { taskClass: "security-review" as const, risk: "critical" as const }
  const routeA = { providerId: "a", modelId: "m", variant: "max" }
  const routeB = { providerId: "b", modelId: "m", variant: "max" }
  const now = "2026-08-29T00:00:00.000Z"

  it("provisional H exceeds the evidence floor", () => {
    expect(HYSTERESIS_H_PROVISIONAL).toBeGreaterThan(HYSTERESIS_H_EVIDENCE_FLOOR)
  })

  it("Δ ≤ H keeps the sticky route", () => {
    const s = emptyHysteresisState(seg)
    s.currentRoute = routeA
    const r = applyStickiness(s, { candidateId: "b", route: routeB, score: 0.72 }, 0.71, { stickyRouteBroken: false, now })
    expect(r.retained).toBe(true)
  })

  it("3 consecutive evaluations > H reset the sticky route", () => {
    let s = emptyHysteresisState(seg)
    s.currentRoute = routeA
    for (let i = 0; i < 3; i++) {
      const r = applyStickiness(s, { candidateId: "b", route: routeB, score: 0.73 }, 0.70, { stickyRouteBroken: false, now })
      s = r.state
    }
    expect(s.currentRoute).toEqual(routeB)
  })

  it("Δ > 2H replaces only after 24 h persistence (strong-exceed rule)", () => {
    let s = emptyHysteresisState(seg)
    s.currentRoute = routeA
    const r1 = applyStickiness(s, { candidateId: "b", route: routeB, score: 0.80 }, 0.70, { stickyRouteBroken: false, now })
    expect(r1.retained).toBe(true) // strong exceed starts, no immediate replacement
    const later = "2026-08-30T00:01:00.000Z" // > 24 h later
    const r2 = applyStickiness(r1.state, { candidateId: "b", route: routeB, score: 0.80 }, 0.70, { stickyRouteBroken: false, now: later })
    expect(r2.retained).toBe(false)
    expect(r2.state.currentRoute).toEqual(routeB)
  })

  it("breaker OPEN overrides stickiness immediately", () => {
    const s = emptyHysteresisState(seg)
    s.currentRoute = routeA
    const r = applyStickiness(s, { candidateId: "b", route: routeB, score: 0.5 }, 0.9, { stickyRouteBroken: true, now })
    expect(r.retained).toBe(false)
    expect(s.currentRoute).toEqual(routeA)
    expect(r.state.currentRoute).toEqual(routeB)
  })

  it("2 consecutive EnvironmentOutcomes drop stickiness", () => {
    let s = emptyHysteresisState(seg)
    s.currentRoute = routeA
    s = noteEnvironmentOutcome(s)
    expect(s.currentRoute).toEqual(routeA)
    s = noteEnvironmentOutcome(s)
    expect(s.currentRoute).toBeNull()
  })
})

// --- discovery -------------------------------------------------------------------

describe("V2.2 discovery", () => {
  it("orders candidates: entry model, chain, then remaining registry models", () => {
    const registry = {
      effortRankOrder: ["low", "medium", "high", "max"],
      models: [
        { id: "prov/chain2", provider: "prov", available: true, supportsVision: false, maxVerifiedEffort: null, rejectedEfforts: [], variants: [{ name: "max", effort: "max", status: "VERIFIED" as const }] },
        { id: "prov/entry", provider: "prov", available: true, supportsVision: false, maxVerifiedEffort: null, rejectedEfforts: [], variants: [{ name: "high", effort: "high", status: "VERIFIED" as const }, { name: "max", effort: "max", status: "VERIFIED" as const }] },
      ],
      generatedFrom: [],
    }
    const r = discoverCandidates(registry, { task_class: "standard-coding", agent: "build", model: "prov/entry", variant: "high", chain: ["prov/entry", "prov/chain2"], risk: "medium", reason: "" })
    const ids = r.candidates.map((c) => c.candidateId)
    expect(ids.indexOf("prov/entry#high")).toBeLessThan(ids.indexOf("prov/entry#max"))
    expect(ids.indexOf("prov/entry#high")).toBe(0)
    expect(ids).toContain("prov/chain2#max")
  })
})
