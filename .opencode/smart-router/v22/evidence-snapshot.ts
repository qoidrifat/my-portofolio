// Smart Router V2.2 — evidence snapshot bridge (Wave 2, Phase 12-13).
// Reads store aggregates and presents them as engine EvidenceProviders with M1 provenance.
// Pure read-side: no store mutation, no fabrication — missing evidence ⇒ null (I-007).

import type { DimInputs } from "./evidence.ts"
import type { EvaluationStore } from "./evaluation-store.ts"
import { candidateKey, parseQualifiedModel } from "./evaluation-store.ts"
import type { StoreStats, AggregateStats } from "./evaluation-store.ts"
import type { AggregateSourceLevel, SourceTaskClass } from "./types.ts"

/** M1 hierarchy presentation: MODEL-level fallback is provisional (confidence ×0.5 cap). */
export interface ObservedQualityEvidence {
  value: number
  confidence: number
  sampleSize: number
  sourceLevel: AggregateSourceLevel
  /** Set when the value was inherited from the model level, not the variant's own segment. */
  inheritedFrom: "model" | null
  lastUpdated: string | null
}

/** M1 resolution order: variant segment (taskClass-scoped) → model fallback (taskClass-scoped). */
export function resolveObservedQuality(
  stats: StoreStats,
  taskClass: string,
  providerId: string,
  modelId: string,
  variant: string | null,
): ObservedQualityEvidence | null {
  const segmentKey = `${taskClass}|${candidateKey({ providerId, modelId, variant })}`
  const own = stats.qualityBySegment.get(segmentKey)
  if (own) return toObserved(own, "VARIANT", null)
  const modelKey = `${taskClass}|${providerId}/${modelId}`
  const inherited = stats.qualityByModel.get(modelKey)
  if (inherited) return toObserved(inherited, "MODEL", "model")
  return null
}

function toObserved(a: AggregateStats, sourceLevel: AggregateSourceLevel, inheritedFrom: "model" | null): ObservedQualityEvidence {
  return {
    value: a.mean,
    confidence: inheritedFrom === "model" ? Math.min(a.confidence, 0.5) : a.confidence,
    sampleSize: a.n,
    sourceLevel,
    inheritedFrom,
    lastUpdated: a.lastUpdated,
  }
}

export interface EvidenceSnapshotProviders {
  quality: (candidateId: string) => DimInputs["quality"]
  segment: (candidateId: string, taskClass: string) => DimInputs["segment"]
}

/**
 * Builds evidence providers backed by the evaluation store for ONE task class.
 * The quality provider emits observed-only QualityInput (intrinsic: null) — the engine's
 * evidence.quality() applies the provisional ×0.5 cap on the observed-only path.
 */
export function providersFromEvidenceStore(
  store: EvaluationStore,
  taskClass: SourceTaskClass | string,
  nowMs: number = Date.now(),
): EvidenceSnapshotProviders {
  const stats = store.stats(nowMs)
  return {
    quality: (candidateId: string): DimInputs["quality"] => {
      const parsed = parseCandidateId(candidateId)
      if (!parsed) return null
      const obs = resolveObservedQuality(stats, taskClass, parsed.providerId, parsed.modelId, parsed.variant)
      if (!obs) return null
      return {
        intrinsic: null,
        intrinsicConfidence: 0,
        observed: obs.value,
        observedConfidence: obs.confidence,
        observedSampleSize: obs.sampleSize,
      }
    },
    segment: (candidateId: string, segTaskClass: string): DimInputs["segment"] => {
      const parsed = parseCandidateId(candidateId)
      if (!parsed) return null
      const key = `${segTaskClass}|${candidateKey(parsed)}`
      const r = stats.recentSuccessBySegment.get(key)
      if (!r) return null
      return { successRate: r.rate, sampleSize: r.n, confidence: r.confidence }
    },
  }
}

/** Parses engine candidate ids of the form `providerId/modelId#variant` (or without variant). */
export function parseCandidateId(candidateId: string): { providerId: string; modelId: string; variant: string | null } | null {
  const hash = candidateId.indexOf("#")
  if (hash === 0 || hash === candidateId.length - 1) return null
  const variant = hash >= 0 ? candidateId.slice(hash + 1) : null
  const modelPart = hash >= 0 ? candidateId.slice(0, hash) : candidateId
  // Delegates to the canonical identity parse (CRITICAL-1) — single source of truth for
  // provider/model splitting across wire, store, snapshot and engine vocabularies.
  const { providerId, modelId } = parseQualifiedModel(modelPart)
  if (!providerId || !modelId) return null
  return { providerId, modelId, variant }
}
