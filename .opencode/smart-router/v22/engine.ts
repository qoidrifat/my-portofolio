// Smart Router V2.2 — decision engine orchestrator (Phase L/M).
// Pure pipeline: requirement → discovery → hard gates → dimension values → scoring →
// cold-start ranking → probe rule → stickiness. All evidence access injected (L3 purity, ADR-010).
// Modes: OFF = V2.1 passthrough (zero compute); SHADOW = compute + record, V2.1 executes;
// ADVISORY/OPTIMIZED = selection surfaced (adoption guarded by feature flags elsewhere).

import { createHash } from "node:crypto"
import type { Candidate, RouteDecisionV22, ScoredCandidate, ScoreDimension, TaskRequirement, DimensionValue, Exclusion, HysteresisState } from "./types.ts"
import { CLASS_FLOORS, WEIGHT_PROFILES } from "./policy-data.ts"
import type { GateExclusion, HealthInput } from "./gates.ts"
import { applyHardGates } from "./gates.ts"
import type { CapabilityDimEvidence, DimInputs } from "./evidence.ts"
import { capabilityFit, contextFit, costFit, latencyFit, quality, recentSuccess, reliability, type CostDatum, type LatencyDatum } from "./evidence.ts"
import { applyProbeRule, candidateConfidence, coldStartTier, rankCandidates, scoreCandidate } from "./scoring.ts"
import { applyStickiness } from "./hysteresis.ts"
import type { RouterMode } from "./types.ts"

export interface EvidenceProviders {
  /** Evidence level per (candidate, dim) for hard gates; absent = UNKNOWN. */
  capabilityLevel: (candidateId: string, dim: string) => import("./types.ts").EvidenceLevel
  /** Full evidence record per (candidate, capability dim) for scoring. */
  capabilityDim: (candidateId: string, dim: import("./types.ts").CapabilityDim) => CapabilityDimEvidence | null
  contextWindow: (candidateId: string) => number | null
  health: (candidateId: string) => HealthInput | null
  budgetEvidence: (candidateId: string) => { estimatedCost: number | null; costConfidence: number; p95LatencyMs: number | null; latencyConfidence: number }
  healthFull: (candidateId: string) => DimInputs["health"]
  quality: (candidateId: string) => DimInputs["quality"]
  segment: (candidateId: string, taskClass: string) => DimInputs["segment"]
  truncation: (candidateId: string) => { truncationEvents: number }
  costDatum: (candidateId: string) => CostDatum
  latencyDatum: (candidateId: string) => LatencyDatum
}

export interface EngineInput {
  mode: RouterMode
  requirement: TaskRequirement
  candidates: Candidate[]
  providers: EvidenceProviders
  budgets: { costBudget: number | null; latencyBudgetP95Ms: number | null }
  hysteresis: HysteresisState
  stickyRouteBroken: boolean
  now: string
  sessionId: string
  routeId: string
  attempt: number
}

export interface EngineResult {
  /** Discriminator consumed by cli.ts / replay.ts (`"ok" | "blocked" | "degraded"`). */
  kind: "ok"
  decision: RouteDecisionV22
  selected: { candidateId: string; providerId: string; modelId: string; variant: string | null } | null
  v21LadderHead: string
  floorCredit: Map<string, boolean>
  /** Evolved state — callers persist it for the next decision (stateless shadow: SHADOW discards). */
  stickiness: { retained: boolean; reason: string; state: HysteresisState }
  degraded: false
}

export interface EngineBlocked {
  kind: "blocked"
  decision: RouteDecisionV22
  selected: null
  reason: string
  /** Gate exclusions that led to the block (consumed by cli.ts v22 shadow output). */
  exclusions: GateExclusion[]
  degraded: false
}

export interface EngineDegraded {
  kind: "degraded"
  decision: RouteDecisionV22
  selected: null
  reason: string
  degraded: true
}

export type EngineOutcome = EngineResult | EngineBlocked | EngineDegraded

/** Evidence-null providers: every lookup is UNKNOWN with explicit zeros (no synthetic data). */
export const noopProviders: EvidenceProviders = {
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

function decisionIdOf(parts: unknown[]): string {
  const h = createHash("sha256")
  h.update(JSON.stringify(parts))
  return `D-${h.digest("hex").slice(0, 12)}`
}

export function runEngine(input: EngineInput): EngineOutcome {
  if (input.mode === "OFF") {
    const head = [...input.candidates].sort((a, b) => a.ladderRank - b.ladderRank)[0]
    return {
      kind: "ok",
      decision: {
        decisionId: decisionIdOf([input.requirement, "off"]),
        sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
        requirement: input.requirement, candidateSet: [], excluded: [], scores: [],
        selected: null, tieBreaker: null, mode: "OFF", degradedToV21: false, stickinessApplied: false,
      },
      selected: null,
      v21LadderHead: head?.candidateId ?? "",
      floorCredit: new Map(),
      stickiness: { retained: false, reason: "mode OFF", state: input.hysteresis },
      degraded: false,
    }
  }

  // ADR-010: any exception inside the pipeline → V2.1 ladder route. The gates run inside the
  // boundary too (H1 consumes quality evidence there), so both stages share one degrade path.
  const degrade = (err: unknown): EngineOutcome => {
    const head = [...input.candidates].sort((a, b) => a.ladderRank - b.ladderRank)[0]
    return {
      kind: "degraded",
      decision: {
        decisionId: decisionIdOf([input.requirement, "degraded"]),
        sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
        requirement: input.requirement, candidateSet: input.candidates.map((c) => c.candidateId),
        excluded: [], scores: [], selected: head?.candidateId ?? null, tieBreaker: null,
        mode: input.mode, degradedToV21: true, stickinessApplied: false,
      },
      selected: null,
      reason: `engine degraded to V2.1: ${err instanceof Error ? err.message : String(err)}`,
      degraded: true,
    }
  }

  // D2–D5 hard gates (D1 policy is embedded via variantStatus/policyStatus on candidates)
  let gated: ReturnType<typeof applyHardGates>
  try {
    gated = applyHardGates(
      input.candidates,
      input.requirement,
      CLASS_FLOORS[input.requirement.optimizationClass],
      {
        capability: input.providers.capabilityLevel,
        contextWindow: input.providers.contextWindow,
        health: input.providers.health,
        budgetEvidence: input.providers.budgetEvidence,
        quality: input.providers.quality,
      },
      input.budgets,
    )
  } catch (err) {
    return degrade(err)
  }

  if (!gated.eligible.length) {
    // MANDATORY empty-eligible → BLOCK (no silent degradation; C1 edge rule)
    const decision: RouteDecisionV22 = {
      decisionId: decisionIdOf([input.requirement, gated.exclusions]),
      sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
      requirement: input.requirement,
      candidateSet: input.candidates.map((c) => c.candidateId),
      excluded: gated.exclusions.map((e) => ({ candidateId: e.candidateId, gate: e.gate, reason: e.reason }) as Exclusion),
      scores: [], selected: null, tieBreaker: null, mode: input.mode, degradedToV21: false, stickinessApplied: false,
    }
    return { kind: "blocked", decision, selected: null, reason: "BLOCK: no eligible candidate after hard gates", exclusions: gated.exclusions, degraded: false }
  }

  try {
    // dimension values: first pass raw (for relative normalization), second pass scored
    const dimInputsFor = (c: Candidate): DimInputs => ({
      requirement: input.requirement,
      capability: (d) => input.providers.capabilityDim(c.candidateId, d),
      health: input.providers.healthFull(c.candidateId),
      quality: input.providers.quality(c.candidateId),
      segment: input.providers.segment(c.candidateId, input.requirement.sourceTaskClass),
      contextWindowTokens: input.providers.contextWindow(c.candidateId),
      truncation: input.providers.truncation(c.candidateId),
    })

    const costs = new Map<string, CostDatum>()
    const latencies = new Map<string, LatencyDatum>()
    for (const c of gated.eligible) {
      costs.set(c.candidateId, input.providers.costDatum(c.candidateId))
      latencies.set(c.candidateId, input.providers.latencyDatum(c.candidateId))
    }
    const maxCost = Math.max(...[...costs.values()].map((x) => x.effectiveCost ?? 0), 0) || null
    const maxP50 = Math.max(...[...latencies.values()].map((x) => x.p50Ms ?? 0), 0) || null

    const profile = WEIGHT_PROFILES[input.requirement.optimizationClass]
    const scored: ScoredCandidate[] = gated.eligible.map((c) => {
      const di = dimInputsFor(c)
      const values: Record<ScoreDimension, DimensionValue> = {
        quality: quality(di),
        capabilityFit: capabilityFit(di),
        reliability: reliability(di),
        latency: latencyFit(latencies.get(c.candidateId)!, maxP50),
        cost: costFit(costs.get(c.candidateId)!, maxCost),
        context: contextFit(di),
        recent: recentSuccess(di),
      }
      const s = scoreCandidate(values, profile, input.requirement.riskClass)
      // cold-start tier uses RAW evidence presence: aggregated min-confidence would mask a
      // candidate with real evidence on one dim behind an unknown sibling dim (§10.3 tiers)
      const rawCapEvidenced = input.requirement.capabilityRequirements.some((r) => {
        const ev = input.providers.capabilityDim(c.candidateId, r.dim)
        return Boolean(ev && ev.level !== "UNKNOWN" && ev.confidence > 0)
      })
      const anyDimEvidenced = (Object.keys(values) as ScoreDimension[]).some((d) => values[d].value !== null && values[d].confidence > 0)
      return {
        candidateId: c.candidateId,
        score: s.score,
        confidence: candidateConfidence(values),
        contributions: s.contributions,
        values,
        tier: rawCapEvidenced || anyDimEvidenced ? "KNOWN_EVIDENCED" : "UNPROVEN",
      }
    })

    // H2 (C1 REQUIRED-FLOOR fallback): a candidate is floor-verified only when it satisfies
    // ALL declared floors (capability REQUIRED_FLOOR dims + class quality floor — see gates
    // floorCredit). With no floor-verified candidate the V2.2 result must be the V2.1 route:
    // never BLOCK, never an ASCII winner, never an arbitrary scored candidate.
    // Pure cold start (all UNPROVEN) is governed by D-COLD instead: the ladder head IS the
    // V2.1 anchor route (ADR-014 CASE A/B), so the fallback target is selected by construction.
    const floorsDeclared = input.requirement.capabilityRequirements.some((r) => r.tier === "REQUIRED_FLOOR")
      || CLASS_FLOORS[input.requirement.optimizationClass].quality !== null
    const anyFloorVerified = floorsDeclared && gated.eligible.some((c) => gated.floorCredit.get(c.candidateId) === true)
    if (floorsDeclared && !anyFloorVerified && scored.some((s) => s.tier === "KNOWN_EVIDENCED")) {
      const decision: RouteDecisionV22 = {
        decisionId: decisionIdOf([input.requirement, gated.exclusions, scored.map((s) => [s.candidateId, s.score])]),
        sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
        requirement: input.requirement,
        candidateSet: input.candidates.map((c) => c.candidateId),
        excluded: gated.exclusions.map((e) => ({ candidateId: e.candidateId, gate: e.gate, reason: e.reason }) as Exclusion),
        scores: scored,
        selected: null, tieBreaker: null, mode: input.mode, degradedToV21: true, stickinessApplied: false,
      }
      return {
        kind: "degraded",
        decision,
        selected: null,
        reason: "REQUIRED_FLOOR: no floor-verified candidate — C1 V2.1 fallback (H2)",
        degraded: true,
      }
    }

    const rank = rankCandidates({
      candidates: input.candidates,
      scored,
      latencyP50: new Map([...latencies].filter(([, l]) => l.p50Ms !== null).map(([k, l]) => [k, l.p50Ms!])),
      cost: new Map([...costs].filter(([, c]) => c.effectiveCost !== null).map(([k, c]) => [k, c.effectiveCost!])),
    })

    const breakerStates = new Map<string, HealthInput["breakerState"]>()
    for (const c of gated.eligible) {
      const h = input.providers.health(c.candidateId)
      breakerStates.set(c.candidateId, h?.breakerState ?? "CLOSED")
    }
    const probe = applyProbeRule(rank.ranked, breakerStates)
    if (!probe.selected) {
      return { kind: "blocked", decision: emptyDecision(input, gated.exclusions, input.mode), selected: null, reason: "no selectable candidate", exclusions: gated.exclusions, degraded: false }
    }

    // stickiness: sticky route retained when challenger delta ≤ H (ADR-015). The sticky route
    // is identified by the canonical route vocabulary {providerId, provider-qualified modelId,
    // variant} — same as Candidate.candidateId / v21Route (H3 fix at the abstraction boundary).
    // Breaker authority overrides stickiness (§16): OPEN on the sticky route, or HALF_OPEN when
    // a healthy CLOSED peer exists (§5.3 probe rule — never a ranked winner among healthy peers).
    const stickyRoute = input.hysteresis.currentRoute
    const stickyCandidate = stickyRoute
      ? gated.eligible.find((c) => c.provider === stickyRoute.providerId
        && `${c.provider}/${c.model}` === stickyRoute.modelId
        && (c.variant ?? null) === (stickyRoute.variant ?? null)) ?? null
      : null
    const stickyScore = stickyCandidate ? (scored.find((s) => s.candidateId === stickyCandidate.candidateId)?.score ?? null) : null
    const chosen = probe.selected
    const stickyBreaker = stickyCandidate ? breakerStates.get(stickyCandidate.candidateId) : undefined
    const stickyBlockedByBreaker = input.stickyRouteBroken
      || stickyBreaker === "OPEN"
      || (stickyBreaker === "HALF_OPEN" && [...breakerStates.values()].some((s) => s === "CLOSED"))
    const stick = applyStickiness(
      input.hysteresis,
      { candidateId: chosen.candidateId, route: routeOf(chosen.candidateId, gated.eligible), score: chosen.score },
      stickyScore,
      { stickyRouteBroken: stickyBlockedByBreaker, now: input.now },
    )
    const finalSelection = stick.retained && stickyCandidate ? stickyCandidate : chosen

    const decision: RouteDecisionV22 = {
      decisionId: decisionIdOf([input.requirement, input.candidates.map((c) => c.candidateId), scored.map((s) => [s.candidateId, s.score, s.confidence])]),
      sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
      requirement: input.requirement,
      candidateSet: input.candidates.map((c) => c.candidateId),
      excluded: gated.exclusions.map((e) => ({ candidateId: e.candidateId, gate: e.gate, reason: e.reason }) as Exclusion),
      scores: rank.ranked,
      selected: finalSelection.candidateId,
      tieBreaker: rank.tieBreaker,
      mode: input.mode,
      degradedToV21: false,
      stickinessApplied: stick.retained && Boolean(stickyCandidate),
    }

    return {
      kind: "ok",
      decision,
      selected: selectedRoute(finalSelection, gated.eligible),
      v21LadderHead: [...input.candidates].sort((a, b) => a.ladderRank - b.ladderRank)[0]?.candidateId ?? "",
      floorCredit: gated.floorCredit,
      stickiness: { retained: stick.retained, reason: stick.reason, state: stick.state },
      degraded: false,
    }
  } catch (err) {
    // one catch boundary at the L2→L3 call site: any exception → V2.1 ladder route (ADR-010)
    return degrade(err)
  }
}

function routeOf(candidateId: string, candidates: Candidate[]): { providerId: string; modelId: string; variant: string | null } {
  // H3 (Wave 1): modelId is the provider-qualified registry id ("provider/model") — the same
  // canonical vocabulary as Candidate.candidateId, v21Route, and Attributed.modelId. Emitting
  // the unqualified model here was the stickiness identity mismatch.
  const c = candidates.find((x) => x.candidateId === candidateId)!
  return { providerId: c.provider, modelId: `${c.provider}/${c.model}`, variant: c.variant }
}

function selectedRoute(c: Candidate | ScoredCandidate, candidates: Candidate[]): { candidateId: string; providerId: string; modelId: string; variant: string | null } {
  const r = routeOf(c.candidateId, candidates)
  return { candidateId: c.candidateId, ...r }
}

function emptyDecision(input: EngineInput, exclusions: GateExclusion[], mode: RouterMode): RouteDecisionV22 {
  return {
    decisionId: decisionIdOf([input.requirement, exclusions, "empty"]),
    sessionId: input.sessionId, routeId: input.routeId, attempt: input.attempt,
    requirement: input.requirement, candidateSet: input.candidates.map((c) => c.candidateId),
    excluded: exclusions.map((e) => ({ candidateId: e.candidateId, gate: e.gate, reason: e.reason }) as Exclusion),
    scores: [], selected: null, tieBreaker: null, mode, degradedToV21: false, stickinessApplied: false,
  }
}
