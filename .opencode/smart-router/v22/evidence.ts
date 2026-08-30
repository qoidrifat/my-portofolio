// Smart Router V2.2 — evidence → dimension values (Phase E).
// Pure transcription of ROUTING_MODEL §4.3, §5.3, §6, §7, §8 into per-dimension DimensionValues.
// UNKNOWN evidence is explicit: value null + confidence 0 — never fabricated (I-007).

import type {
  CapabilityDim,
  DimensionValue,
  EvidenceLevel,
  TaskRequirement,
} from "./types.ts"
import { EVIDENCE_LEVEL_RANK } from "./types.ts"

// --- capability registry view -------------------------------------------------

export interface CapabilityDimEvidence {
  level: EvidenceLevel
  /** Numeric value for ordinal dims (0..1) or tokens (contextWindow); null for level-only dims. */
  value: number | null
  confidence: number
}

export type CapabilityEvidence = (dim: CapabilityDim) => CapabilityDimEvidence | null

export interface HealthInputFull {
  breakerState: "OPEN" | "HALF_OPEN" | "CLOSED"
  successRate: number | null
  timeoutRate: number | null
  recoveryStability: number | null
  sampleSize: number
  confidence: number
}

export interface QualityInput {
  intrinsic: number | null
  intrinsicConfidence: number
  observed: number | null
  observedConfidence: number
  observedSampleSize: number
}

export interface SegmentStats {
  /** recent-20 success rate for the (class, candidate) segment; null = no samples. */
  successRate: number | null
  sampleSize: number
  confidence: number
}

export interface TruncationHistory {
  /** Effective k ∈ [0,3]: observed truncation events, capped at 3; the store resets to 0 after 10 clean events. */
  truncationEvents: number
}

export interface DimInputs {
  requirement: TaskRequirement
  capability: CapabilityEvidence
  health: HealthInputFull | null
  quality: QualityInput | null
  segment: SegmentStats | null
  contextWindowTokens: number | null
  truncation: TruncationHistory
}

const NEUTRAL: DimensionValue = { value: null, confidence: 0, sampleSize: 0, lastUpdated: null }

function neutral(sampleSize = 0): DimensionValue {
  return { ...NEUTRAL, sampleSize }
}

// --- §4.3 capabilityFit --------------------------------------------------------

export function capabilityFit(inputs: DimInputs): DimensionValue {
  const reqs = inputs.requirement.capabilityRequirements
  if (!reqs.length) return neutral()
  let wSum = 0
  let fitSum = 0
  let conf = 1
  for (const r of reqs) {
    const ev = inputs.capability(r.dim)
    wSum += 1 // r_d = 1 for each declared requirement
    if (!ev || ev.level === "UNKNOWN") {
      fitSum += 0.5
      conf = Math.min(conf, 0)
      continue
    }
    if (EVIDENCE_LEVEL_RANK[ev.level] >= EVIDENCE_LEVEL_RANK[r.minLevel]) {
      fitSum += 1.0
      conf = Math.min(conf, ev.confidence)
    } else {
      fitSum += 0.0
      conf = Math.min(conf, ev.confidence)
    }
  }
  return { value: fitSum / wSum, confidence: conf, sampleSize: reqs.length, lastUpdated: null }
}

// --- §5.3 reliability ----------------------------------------------------------

export function reliability(inputs: DimInputs): DimensionValue {
  const h = inputs.health
  if (!h || h.successRate === null || h.sampleSize < 5) return neutral(h?.sampleSize ?? 0)
  const timeout = h.timeoutRate ?? 0
  const recovery = h.recoveryStability ?? 0.5
  return {
    value: 0.6 * h.successRate + 0.25 * (1 - timeout) + 0.15 * recovery,
    confidence: h.confidence,
    sampleSize: h.sampleSize,
    lastUpdated: null,
  }
}

// --- §6.1 costFit (relative normalization across the eligible set) -------------

export interface CostDatum {
  effectiveCost: number | null
  confidence: number
}

export function costFit(candidateCost: CostDatum, maxCost: number | null): DimensionValue {
  if (candidateCost.effectiveCost === null || maxCost === null || maxCost <= 0) return neutral()
  return {
    value: 1 - Math.min(Math.max(candidateCost.effectiveCost / maxCost, 0), 1),
    confidence: candidateCost.confidence,
    sampleSize: 1,
    lastUpdated: null,
  }
}

// --- §6.2 latencyFit (p50 primary, relative within eligible set) ---------------

export interface LatencyDatum {
  p50Ms: number | null
  confidence: number
  sampleSize: number
}

export function latencyFit(candidateLatency: LatencyDatum, maxP50: number | null): DimensionValue {
  if (candidateLatency.p50Ms === null || maxP50 === null || maxP50 <= 0) return neutral(candidateLatency.sampleSize)
  return {
    value: 1 - Math.min(Math.max(candidateLatency.p50Ms / maxP50, 0), 1),
    confidence: candidateLatency.confidence,
    sampleSize: candidateLatency.sampleSize,
    lastUpdated: null,
  }
}

// --- §7 quality (confidence-weighted blend; 50/50 PROVISIONAL) -----------------

export function quality(inputs: DimInputs): DimensionValue {
  const q = inputs.quality
  if (!q) return neutral()
  const observedUsable = q.observed !== null && q.observedSampleSize >= 5 && q.observedConfidence >= 0.6
  if (q.intrinsic === null) {
    if (!observedUsable) return neutral(q.observedSampleSize)
    // observed-only path (Wave 2 / M1): same provisional cap ×0.5 as intrinsic-only —
    // single-source evidence never gets full confidence (EVIDENCE_CONTRACT §Quality)
    return { value: q.observed, confidence: q.observedConfidence * 0.5, sampleSize: q.observedSampleSize, lastUpdated: null }
  }
  if (!observedUsable) {
    // intrinsic-only path: confidence capped ×0.5 (EVIDENCE_CONTRACT §Quality)
    return { value: q.intrinsic, confidence: Math.min(q.intrinsicConfidence, 1) * 0.5, sampleSize: 0, lastUpdated: null }
  }
  const wO = Math.min(Math.max(q.observedConfidence / (q.intrinsicConfidence + q.observedConfidence), 0.25), 0.75)
  const wI = 1 - wO
  return {
    value: wI * q.intrinsic + wO * q.observed!,
    confidence: Math.min(q.intrinsicConfidence, q.observedConfidence),
    sampleSize: q.observedSampleSize,
    lastUpdated: null,
  }
}

// --- §8 contextFit --------------------------------------------------------------

export function contextFit(inputs: DimInputs): DimensionValue {
  const w = inputs.contextWindowTokens
  if (w === null || w <= 0) return neutral()
  const k = Math.min(inputs.truncation.truncationEvents, 3)
  return {
    value: Math.min(Math.max(w / inputs.requirement.contextTokens, 0), 1) * Math.pow(0.9, k),
    confidence: 0.6, // STATIC registry numeric value (§4.2)
    sampleSize: 1,
    lastUpdated: null,
  }
}

// --- recentSuccess (segment recent-20) ------------------------------------------

export function recentSuccess(inputs: DimInputs): DimensionValue {
  const s = inputs.segment
  if (!s || s.successRate === null || s.sampleSize < 5) return neutral(s?.sampleSize ?? 0)
  return { value: s.successRate, confidence: s.confidence, sampleSize: s.sampleSize, lastUpdated: null }
}
