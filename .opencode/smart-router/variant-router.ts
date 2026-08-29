// Smart Router v2 — variant router. Faithful port of the Phase-7 Resolve-Variant semantics:
// rejected-effort ban, maximum-verified ceiling, BLOCKED_UPSTREAM != UNSUPPORTED, verified-preferred selection.

import type { ModelRegistryEntry, VariantInfo } from "./types.ts"
import { effortRank } from "./capability.ts"

export interface VariantResolution {
  variant: VariantInfo | null
  warnings: string[]
}

export function resolveVariant(
  model: ModelRegistryEntry,
  wantedVariant: string | null | undefined,
  desiredRank: number,
  rankOrder: string[],
): VariantResolution {
  const warnings: string[] = []
  const variants = model.variants ?? []
  if (variants.length === 0) {
    warnings.push(`model '${model.id}' exposes no variants; using provider default`)
    return { variant: null, warnings }
  }
  const ceilingEffort = model.maxVerifiedEffort
  const ceilingRank = ceilingEffort ? effortRank(ceilingEffort, rankOrder) : Number.MAX_SAFE_INTEGER

  const usable = variants.filter(
    (v) => v.status !== "UNSUPPORTED" && !model.rejectedEfforts.includes(v.effort ?? "") && effortRank(v.effort, rankOrder) <= ceilingRank,
  )

  let chosen: VariantInfo | null = null
  const target = wantedVariant ? variants.find((v) => v.name === wantedVariant) ?? null : null

  if (wantedVariant && !target) {
    warnings.push(`variant '${wantedVariant}' does not exist on '${model.id}'`)
  }

  if (target) {
    const tRank = effortRank(target.effort, rankOrder)
    const banned = model.rejectedEfforts.includes(target.effort ?? "")
    const overCeiling = tRank > ceilingRank || tRank === Number.MAX_SAFE_INTEGER
    if (overCeiling && target.status === "BLOCKED_UPSTREAM") {
      warnings.push(`requested variant '${target.name}' is TEMPORARILY BLOCKED upstream (rate limit) on '${model.id}' - treated as UNVERIFIED, not unsupported - clamped to verified ceiling`)
    } else if (overCeiling || banned) {
      warnings.push(`requested variant '${target.name}' exceeds verified/rejected limits on '${model.id}' (maximum_verified=${ceilingEffort ?? ""}) - clamped`)
    } else if (target.status === "BLOCKED_UPSTREAM") {
      warnings.push(`variant '${target.name}' is TEMPORARILY BLOCKED upstream (rate limit) on '${model.id}' - not classified unsupported`)
    } else {
      chosen = target
    }
  }

  if (!chosen) {
    // ceiling-safe choice nearest at-or-above DesiredRank, preferring VERIFIED
    const above = usable.filter((v) => effortRank(v.effort, rankOrder) >= desiredRank).sort((a, b) => effortRank(a.effort, rankOrder) - effortRank(b.effort, rankOrder))
    const verifiedAbove = above.filter((v) => v.status === "VERIFIED")
    if (verifiedAbove.length) chosen = verifiedAbove[0]
    else if (above.length) chosen = above[0]
    else {
      const below = [...usable].sort((a, b) => effortRank(a.effort, rankOrder) - effortRank(b.effort, rankOrder))
      if (below.length) {
        chosen = below[below.length - 1]
        warnings.push(`'${model.id}': downgraded below requested effort rank - clamped to highest verified variant '${chosen.name}'`)
      }
    }
  }

  if (chosen) {
    if (chosen.status === "CONFIGURED") warnings.push(`variant '${chosen.name}' on '${model.id}' is configured but not individually runtime-verified`)
    if (chosen.status === "BLOCKED_UPSTREAM") warnings.push(`variant '${chosen.name}' on '${model.id}' currently rate-limited upstream (TEMPORARILY BLOCKED)`)
  }
  return { variant: chosen, warnings }
}
