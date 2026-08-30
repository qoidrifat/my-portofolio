// Smart Router V2.2 — hard gates D2–D5 (Phase C, ROUTING_MODEL §3; DECISION_MATRIX §3).
// Pure. Binary, pre-scoring, no bypass (SECURITY_BOUNDARY §2). Order: D1 policy →
// D2 capability (variant verification + mandatory dims) → D3 context → D4 health/breaker/quality →
// D5 budget. C1 semantics: MANDATORY+UNKNOWN → exclude; REQUIRED_FLOOR+UNKNOWN → eligible
// WITHOUT floor credit; floor credit only at ≥ minLevel.
// H1 (Wave 1): the class QUALITY floor (DECISION_MATRIX §1) is enforced at D4 with the same
// evidence contract as the health floor — KNOWN below floor → EXCLUDE; UNKNOWN (any floor leg
// unverifiable) → eligible WITHOUT floor credit (never converted into a failure, C1/§9).

import type { Candidate, CapabilityRequirement, EvidenceLevel, TaskRequirement } from "./types.ts"
import { EVIDENCE_LEVEL_RANK } from "./types.ts"
import type { ClassFloors, NumericFloor } from "./policy-data.ts"
import type { QualityInput } from "./evidence.ts"

export type GateName = "D1_POLICY" | "D2_CAPABILITY" | "D3_CONTEXT" | "D4_HEALTH_BREAKER" | "D5_BUDGET"

export interface GateExclusion {
  candidateId: string
  gate: GateName
  reason: string
}

/** Per-dim evidence level for a candidate; absent = UNKNOWN (never fabricated). */
export type CapabilityEvidenceFn = (candidateId: string, dim: string) => EvidenceLevel

/** Usable context window in tokens for a candidate; null = UNKNOWN (neutral, conf 0). */
export type ContextWindowFn = (candidateId: string) => number | null

export interface HealthInput {
  breakerState: "OPEN" | "HALF_OPEN" | "CLOSED"
  successRate: number | null
  confidence: number
  sampleSize: number
}

export type HealthFn = (candidateId: string) => HealthInput | null

export interface BudgetInput {
  /** Cost budget per execution in unit-agnostic cost units (null = no budget). */
  costBudget: number | null
  /** p95 latency budget in ms (null = no budget). LOW-risk only by default (matrix Q2). */
  latencyBudgetP95Ms: number | null
}

export interface BudgetEvidence {
  estimatedCost: number | null
  costConfidence: number
  p95LatencyMs: number | null
  latencyConfidence: number
}

export type BudgetEvidenceFn = (candidateId: string) => BudgetEvidence

/** Quality evidence per candidate (QualityInput); null = UNKNOWN (neutral, conf 0). */
export type QualityFn = (candidateId: string) => QualityInput | null

export interface FloorCredit {
  /** true when the candidate satisfied a REQUIRED_FLOOR at ≥ minLevel (may claim quality floor credit). */
  floorVerified: boolean
}

export type FloorCreditFn = (candidateId: string) => FloorCredit

export interface GateResult {
  eligible: Candidate[]
  exclusions: GateExclusion[]
  /** floorVerified per surviving candidate (REQUIRED_FLOOR credit bookkeeping, §9). */
  floorCredit: Map<string, boolean>
}

function evaluateRequirement(
  req: CapabilityRequirement,
  level: EvidenceLevel,
): { eligible: boolean; floorVerified: boolean; reason: string } {
  if (req.tier === "MANDATORY") {
    if (EVIDENCE_LEVEL_RANK[level] >= EVIDENCE_LEVEL_RANK[req.minLevel]) {
      return { eligible: true, floorVerified: false, reason: "" }
    }
    // MANDATORY + anything below required level (incl. UNKNOWN) → hard exclude (C1)
    return { eligible: false, floorVerified: false, reason: `mandatory dim '${req.dim}' not ${req.minLevel} (evidence ${level})` }
  }
  if (req.tier === "REQUIRED_FLOOR") {
    if (EVIDENCE_LEVEL_RANK[level] >= EVIDENCE_LEVEL_RANK[req.minLevel]) {
      return { eligible: true, floorVerified: true, reason: "" }
    }
    // REQUIRED_FLOOR + UNKNOWN/below → eligible WITHOUT floor credit (C1)
    return { eligible: true, floorVerified: false, reason: "" }
  }
  return { eligible: true, floorVerified: false, reason: "" } // OPTIONAL never gates
}

/**
 * H1 — class quality floor (DECISION_MATRIX §1) under the exact C1/evidence contract.
 * A floor leg is KNOWN when its value is non-null with confidence ≥ gate. Floor verified when
 * any leg is known-supported (security-review: intrinsic OR observed; deep-research: intrinsic
 * only). KNOWN-and-below on every leg (verdict fully determined) → EXCLUDE. Any UNKNOWN leg →
 * eligible WITHOUT floor credit — UNKNOWN is never converted into a failure (C1; §9 gate rule).
 */
function evaluateQualityFloor(
  q: QualityInput | null,
  floor: NumericFloor,
  observedAlternative: boolean,
): { eligible: boolean; floorVerified: boolean; reason: string } {
  const intrinsicLeg = { value: q?.intrinsic ?? null, confidence: q?.intrinsicConfidence ?? 0 }
  // I-019: an observed leg with sampleSize < 5 is UNKNOWN — it can never enforce or pass a floor.
  const observedLeg = q && q.observed !== null && q.observedSampleSize >= 5
    ? { value: q.observed, confidence: q.observedConfidence }
    : { value: null, confidence: 0 }
  const legs = observedAlternative ? [intrinsicLeg, observedLeg] : [intrinsicLeg]
  const known = legs.filter((l): l is { value: number; confidence: number } => l.value !== null && l.confidence >= floor.confidenceGate)
  if (known.some((l) => l.value >= floor.threshold)) return { eligible: true, floorVerified: true, reason: "" }
  if (known.length === legs.length) {
    return { eligible: false, floorVerified: false, reason: `quality below floor ${floor.threshold} (evidence-known)` }
  }
  return { eligible: true, floorVerified: false, reason: "" }
}

export function applyHardGates(
  candidates: Candidate[],
  requirement: TaskRequirement,
  classFloors: ClassFloors,
  fns: {
    capability: CapabilityEvidenceFn
    contextWindow: ContextWindowFn
    health: HealthFn
    budgetEvidence: BudgetEvidenceFn
    quality: QualityFn
  },
  budgets: BudgetInput,
): GateResult {
  const exclusions: GateExclusion[] = []
  const floorCredit = new Map<string, boolean>()
  const eligible: Candidate[] = []

  for (const c of candidates) {
    let alive = true

    // D1 policy — variant ceiling/verification is structural (V2.1 SSOT); provider availability checked at discovery
    if (c.variantStatus === "UNSUPPORTED") {
      exclusions.push({ candidateId: c.candidateId, gate: "D1_POLICY", reason: "variant UNSUPPORTED (verified ceiling)" })
      alive = false
    }

    // D2 capability — modality/mandatory dims + floor credit bookkeeping
    if (alive) {
      for (const req of requirement.capabilityRequirements) {
        const level = fns.capability(c.candidateId, req.dim)
        const r = evaluateRequirement(req, level)
        if (!r.eligible) {
          exclusions.push({ candidateId: c.candidateId, gate: "D2_CAPABILITY", reason: r.reason })
          alive = false
          break
        }
      }
    }

    // D3 context — hard gate only when both demand and window are known (UNKNOWN window = neutral, conf 0)
    if (alive) {
      const window = fns.contextWindow(c.candidateId)
      if (window !== null && window < requirement.contextTokens) {
        exclusions.push({ candidateId: c.candidateId, gate: "D3_CONTEXT", reason: `context ${window} < demand ${requirement.contextTokens}` })
        alive = false
      }
    }

    // D4 health — breaker OPEN hard-excludes (INV-B); HALF_OPEN eligible only as probe (never ranked winner);
    // class health floor with confidence gate (floors need evidence: n ≥ 5 + conf ≥ .6, I-019)
    let healthFloorAlive = true
    if (alive) {
      const h = fns.health(c.candidateId)
      if (h) {
        if (h.breakerState === "OPEN") {
          exclusions.push({ candidateId: c.candidateId, gate: "D4_HEALTH_BREAKER", reason: "circuit OPEN" })
          alive = false
          healthFloorAlive = false
        }
        else if (classFloors.health && h.successRate !== null && h.sampleSize >= 5 && h.confidence >= classFloors.health.confidenceGate && h.successRate < classFloors.health.threshold) {
          exclusions.push({ candidateId: c.candidateId, gate: "D4_HEALTH_BREAKER", reason: `health ${h.successRate} < floor ${classFloors.health.threshold} (conf ${h.confidence})` })
          alive = false
          healthFloorAlive = false
        }
      }
      // health UNKNOWN → no floor enforcement (I-019); candidate stays eligible with neutral prior
    }

    // D4 quality — H1 (Wave 1): class quality floor, C1 evidence contract (see evaluateQualityFloor)
    let qualityVerified = true
    if (healthFloorAlive && alive && classFloors.quality) {
      const r = evaluateQualityFloor(fns.quality(c.candidateId), classFloors.quality, classFloors.qualityObservedAlternative)
      qualityVerified = r.floorVerified
      if (!r.eligible) {
        exclusions.push({ candidateId: c.candidateId, gate: "D4_HEALTH_BREAKER", reason: r.reason })
        alive = false
      }
    }

    // D5 budget — only enforceable with confident evidence; UNKNOWN is inert (never excluded on unknowns)
    if (alive) {
      const b = fns.budgetEvidence(c.candidateId)
      if (budgets.costBudget !== null && b.estimatedCost !== null && b.costConfidence >= 0.6 && b.estimatedCost > budgets.costBudget) {
        exclusions.push({ candidateId: c.candidateId, gate: "D5_BUDGET", reason: `cost ${b.estimatedCost} > budget ${budgets.costBudget}` })
        alive = false
      }
      if (alive && budgets.latencyBudgetP95Ms !== null && b.p95LatencyMs !== null && b.latencyConfidence >= 0.6 && b.p95LatencyMs > budgets.latencyBudgetP95Ms) {
        exclusions.push({ candidateId: c.candidateId, gate: "D5_BUDGET", reason: `p95 ${b.p95LatencyMs}ms > budget ${budgets.latencyBudgetP95Ms}ms` })
        alive = false
      }
    }

    if (alive) {
      // floor credit (H2 bookkeeping): ALL declared floors verified — every REQUIRED_FLOOR
      // capability dim at ≥ minLevel AND the class quality floor where one is declared.
      const capabilityCredit = requirement.capabilityRequirements
        .filter((r) => r.tier === "REQUIRED_FLOOR")
        .every((r) => EVIDENCE_LEVEL_RANK[fns.capability(c.candidateId, r.dim)] >= EVIDENCE_LEVEL_RANK[r.minLevel])
        && requirement.capabilityRequirements.some((r) => r.tier === "REQUIRED_FLOOR")
      floorCredit.set(c.candidateId, capabilityCredit && qualityVerified)
      eligible.push(c)
    }
  }

  return { eligible, exclusions, floorCredit }
}
