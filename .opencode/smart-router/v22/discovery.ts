// Smart Router V2.2 — candidate discovery (Phase C, ROUTING_MODEL §2–§3).
// Pure. Candidate set mirrors the V2.1 decision path: policy entry model, then its chain,
// then remaining registry models (extended discovery). ladderRank = position in that order;
// rank 0 is the V2.1 ladder head — the D-COLD all-UNPROVEN fallback anchor.

import type { ModelRegistry, VariantInfo } from "../types.ts"
import type { RoutingTaskEntry } from "../agent-router.ts"
import type { Candidate } from "./types.ts"

export interface DiscoveryResult {
  candidates: Candidate[]
  /** Warnings about registry entries skipped during enumeration. */
  warnings: string[]
}

function variantCandidates(registry: ModelRegistry, modelId: string, policyVariant: string | null): Array<{ variant: string | null; status: VariantInfo["status"] }> {
  const m = registry.models.find((x) => x.id === modelId)
  if (!m) return []
  const names = m.variants.filter((v) => v.status !== "UNSUPPORTED").map((v) => v.name)
  if (!names.length) return [{ variant: null, status: "CONFIGURED" }]
  // policy variant first, then remaining verified/configured variants in registry order
  const ordered = policyVariant && names.includes(policyVariant)
    ? [policyVariant, ...names.filter((n) => n !== policyVariant)]
    : names
  return ordered.map((n) => {
    const v = m.variants.find((x) => x.name === n)!
    return { variant: n, status: v.status }
  })
}

export function discoverCandidates(registry: ModelRegistry, entry: RoutingTaskEntry): DiscoveryResult {
  const warnings: string[] = []
  const ordered: string[] = []
  if (entry.model) ordered.push(entry.model)
  for (const c of entry.chain ?? []) ordered.push(c)
  for (const m of registry.models) {
    if (m.available && !ordered.includes(m.id)) ordered.push(m.id)
  }

  const candidates: Candidate[] = []
  let rank = 0
  for (const modelId of ordered) {
    const m = registry.models.find((x) => x.id === modelId)
    if (!m) {
      warnings.push(`discovery: '${modelId}' has no registry entry — skipped`)
      continue
    }
    if (!m.available) {
      warnings.push(`discovery: '${modelId}' unavailable — skipped`)
      continue
    }
    const policyVariant = modelId === entry.model ? (entry.variant ?? null) : null
    for (const v of variantCandidates(registry, modelId, policyVariant)) {
      candidates.push({
        candidateId: v.variant ? `${modelId}#${v.variant}` : modelId,
        provider: m.provider,
        model: modelId.slice(m.provider.length + 1) || modelId,
        variant: v.variant,
        variantStatus: v.status,
        policyStatus: "ALLOWED",
        maxContextTokens: 0, // populated by capability evidence (contextWindow dim), not by discovery
        ladderRank: rank++,
      })
    }
  }
  return { candidates, warnings }
}
