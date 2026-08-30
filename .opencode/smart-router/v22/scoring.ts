// Smart Router V2.2 — scoring, confidence, ranking + cold-start (Phases F–H).
// Pure transcription of ROUTING_MODEL §10.2–§10.3, §11 (tie-break T1–T6), ADR-014 (D-COLD).

import type {
  Candidate,
  ColdStartTier,
  RiskLevel,
  ScoreDimension,
  ScoredCandidate,
  TieBreakerTier,
  WeightProfile,
} from "./types.ts"
import { RISK_OVERLAY } from "./policy-data.ts"
import type { DimensionValue } from "./types.ts"

// --- risk overlay: reweight + renormalize (DECISION_MATRIX §2) ------------------

export function riskAdjustedWeights(profile: WeightProfile, risk: RiskLevel): WeightProfile {
  const m = RISK_OVERLAY[risk].multipliers
  const adjusted = {} as WeightProfile
  let sum = 0
  for (const d of Object.keys(profile) as ScoreDimension[]) {
    adjusted[d] = profile[d] * (m[d] ?? 1)
    sum += adjusted[d]
  }
  for (const d of Object.keys(adjusted) as ScoreDimension[]) adjusted[d] /= sum
  return adjusted
}

// --- §10.3: renormalize over known dims -----------------------------------------
// UNKNOWN evidence = value null OR confidence 0 (neutral prior 0.5/conf 0) ⇒ the dim is
// renormalized away, never scored as 0 or 0.5. Only dims with real evidence (conf > 0) count.

export function renormalizedWeights(weights: WeightProfile, values: Record<ScoreDimension, DimensionValue>): { weights: WeightProfile; unknown: ScoreDimension[] } {
  const unknown = (Object.keys(values) as ScoreDimension[]).filter((d) => values[d].value === null || values[d].confidence === 0)
  if (!unknown.length) return { weights, unknown }
  const known = (Object.keys(weights) as ScoreDimension[]).filter((d) => !unknown.includes(d))
  const sum = known.reduce((s, d) => s + weights[d], 0)
  const out = {} as WeightProfile
  for (const d of known) out[d] = sum > 0 ? weights[d] / sum : 0
  for (const d of unknown) out[d] = 0
  return { weights: out, unknown }
}

// --- §10.2 score + candidateConfidence (§9: min over contributed dims) ----------

export function scoreCandidate(
  values: Record<ScoreDimension, DimensionValue>,
  profile: WeightProfile,
  risk: RiskLevel,
): { score: number; contributions: Record<ScoreDimension, number>; weights: WeightProfile; unknown: ScoreDimension[] } {
  const base = riskAdjustedWeights(profile, risk)
  const { weights, unknown } = renormalizedWeights(base, values)
  const contributions = {} as Record<ScoreDimension, number>
  let score = 0
  for (const d of Object.keys(weights) as ScoreDimension[]) {
    const v = values[d].value
    contributions[d] = v === null ? 0 : weights[d] * v
    score += contributions[d]
  }
  return { score, contributions, weights, unknown }
}

export function candidateConfidence(values: Record<ScoreDimension, DimensionValue>): number {
  let conf = 1
  let any = false
  for (const d of Object.keys(values) as ScoreDimension[]) {
    if (values[d].value !== null && values[d].confidence > 0) {
      conf = Math.min(conf, values[d].confidence)
      any = true
    }
  }
  return any ? conf : 0 // no contributed dims (no evidence) → confidence 0, never fabricated
}

// --- cold-start tiers (§10.3, ADR-014): EXCLUDED < UNPROVEN < KNOWN_EVIDENCED ---

const TIER_RANK: Record<ColdStartTier, number> = { EXCLUDED: 0, UNPROVEN: 1, KNOWN_EVIDENCED: 2 }

export function coldStartTier(values: Record<ScoreDimension, DimensionValue>, gatedOut: boolean): ColdStartTier {
  if (gatedOut) return "EXCLUDED"
  const anyEvidenced = (Object.keys(values) as ScoreDimension[]).some((d) => values[d].value !== null && values[d].confidence > 0)
  return anyEvidenced ? "KNOWN_EVIDENCED" : "UNPROVEN"
}

// --- ranking: tier order → score → T2–T6 (§11); all-UNPROVEN → ladder head ------

export interface RankInput {
  candidates: Candidate[]
  scored: ScoredCandidate[]
  /** Raw p50 ms per candidateId — used by tie-break T4 (lower wins). */
  latencyP50?: Map<string, number>
  /** Raw effective cost per candidateId — used by tie-break T5 (lower wins). */
  cost?: Map<string, number>
}

export interface RankResult {
  ranked: ScoredCandidate[]
  selected: ScoredCandidate
  tieBreaker: { tier: TieBreakerTier } | null
  /** true when the all-UNPROVEN rule resolved the decision (D-COLD). */
  coldStartFallback: boolean
}

export function rankCandidates(input: RankInput): RankResult {
  // V2.1 ladder position per candidateId — the D-COLD / UNPROVEN seed order (§10.3, ADR-014).
  const ladder = new Map(input.candidates.map((c) => [c.candidateId, c.ladderRank]))
  const byLadder = (a: ScoredCandidate, b: ScoredCandidate): number => {
    const la = ladder.get(a.candidateId) ?? Number.MAX_SAFE_INTEGER
    const lb = ladder.get(b.candidateId) ?? Number.MAX_SAFE_INTEGER
    if (la !== lb) return la - lb
    return a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0
  }
  // defensive normalization: sort by candidateId before ranking (§11)
  const sorted = [...input.scored].sort((a, b) => (a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0))

  const tiers = new Map(sorted.map((s) => [s.candidateId, s.tier]))
  const allUnproven = sorted.length > 0 && sorted.every((s) => s.tier === "UNPROVEN")
  if (allUnproven) {
    // D-COLD (CASE A/B): resolve by V2.1 ladder order over the gated-eligible set — never an
    // ASCII winner (I-017). ranked[0] is the ladder head when eligible; if the head was
    // hard-gate excluded (e.g. breaker OPEN), the next candidate in V2.1 ladder order is the
    // V2.1-defined safe fallback. applyProbeRule selects ranked[0], not `selected`.
    const ordered = [...sorted].sort(byLadder)
    return { ranked: ordered, selected: ordered[0]!, tieBreaker: null, coldStartFallback: true }
  }

  const compare = (a: ScoredCandidate, b: ScoredCandidate): number => {
    const ta = TIER_RANK[tiers.get(a.candidateId) ?? "UNPROVEN"]
    const tb = TIER_RANK[tiers.get(b.candidateId) ?? "UNPROVEN"]
    if (ta !== tb) return tb - ta // KNOWN_EVIDENCED before UNPROVEN
    if (ta === TIER_RANK.UNPROVEN) {
      // CASE C: UNPROVEN candidates follow evidenced ones ordered by the V2.1 seed (§10.3) —
      // their neutral scores are never compared (ASCII is not a cold-start decision input).
      return byLadder(a, b)
    }
    if (Math.abs(a.score - b.score) > Number.EPSILON) return b.score - a.score // T1
    const capA = a.contributions.capabilityFit
    const capB = b.contributions.capabilityFit
    if (Math.abs(capA - capB) > Number.EPSILON) return capB - capA // T2
    const relA = a.contributions.reliability
    const relB = b.contributions.reliability
    if (Math.abs(relA - relB) > Number.EPSILON) return relB - relA // T3
    const p50 = input.latencyP50
    if (p50) {
      const la = p50.get(a.candidateId)
      const lb = p50.get(b.candidateId)
      if (la !== undefined && lb !== undefined && Math.abs(la - lb) > Number.EPSILON) return la - lb // T4 lower p50
    }
    const cost = input.cost
    if (cost) {
      const ca = cost.get(a.candidateId)
      const cb = cost.get(b.candidateId)
      if (ca !== undefined && cb !== undefined && Math.abs(ca - cb) > Number.EPSILON) return ca - cb // T5 lower cost
    }
    return a.candidateId < b.candidateId ? -1 : a.candidateId > b.candidateId ? 1 : 0 // T6 final
  }

  const ranked = [...sorted].sort(compare)
  const selected = ranked[0]
  const tieBreaker = detectTieBreaker(ranked[0], ranked[1])
  return { ranked, selected, tieBreaker, coldStartFallback: false }
}

function detectTieBreaker(winner: ScoredCandidate, runnerUp: ScoredCandidate | undefined): { tier: TieBreakerTier } | null {
  if (!runnerUp) return null
  // Tie tiers (T2–T6) only apply to evidenced-equal pairs. Different cold-start tiers are
  // resolved by tier ordering itself (§10.4) — that is not an evidence tie.
  if (winner.tier !== runnerUp.tier) return null
  if (Math.abs(winner.score - runnerUp.score) <= Number.EPSILON) {
    if (Math.abs(winner.contributions.capabilityFit - runnerUp.contributions.capabilityFit) > Number.EPSILON) return { tier: "T2" }
    if (Math.abs(winner.contributions.reliability - runnerUp.contributions.reliability) > Number.EPSILON) return { tier: "T3" }
    if (Math.abs(winner.contributions.latency - runnerUp.contributions.latency) > Number.EPSILON) return { tier: "T4" }
    if (Math.abs(winner.contributions.cost - runnerUp.contributions.cost) > Number.EPSILON) return { tier: "T5" }
    return { tier: "T6" }
  }
  return null
}

// --- §5.3 half-open probe rule: HALF_OPEN candidate never a ranked winner --------

export function applyProbeRule(ranked: ScoredCandidate[], breakerStates: Map<string, "OPEN" | "HALF_OPEN" | "CLOSED">): { selected: ScoredCandidate | null; probeExcluded: string | null } {
  const top = ranked[0]
  if (!top) return { selected: null, probeExcluded: null }
  const state = breakerStates.get(top.candidateId)
  if (state === "HALF_OPEN") {
    // eligible ONLY as the single next attempt (probe), never as a ranked winner among healthy peers
    const healthy = ranked.find((s) => breakerStates.get(s.candidateId) === "CLOSED")
    if (healthy) return { selected: healthy, probeExcluded: top.candidateId }
  }
  return { selected: top, probeExcluded: null }
}
