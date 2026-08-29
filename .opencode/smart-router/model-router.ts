// Smart Router v2 — model router. Deterministic port of the Phase-7 resolve-agent-model semantics:
// task class -> [override, entry.model, ...chain], desired effort rank from the entry variant,
// vision tasks BLOCK (never silent text-only fallback), latency=speed downgrades one tier on the primary model.

import type { ModelRegistry, RouteDecisionInput, FallbackRoute, Complexity, Modality } from "./types.ts"
import { effortRank, findModel } from "./capability.ts"
import { resolveVariant } from "./variant-router.ts"
import type { RoutingPolicy, RoutingTaskEntry } from "./agent-router.ts"
import { loadTaskEntry } from "./agent-router.ts"
import { breakerStatus } from "./circuit-breaker.ts"
import type { BreakerOptions } from "./circuit-breaker.ts"

export interface ModelRouteInput {
  matchedTaskClass: string
  complexity: Complexity
  modality: Modality
  latencyPreference: "normal" | "speed"
  qualityPreference: "normal" | "max"
  modelOverride?: string | null
  variantOverride?: string | null
  // when provided, live circuit-breaker state participates in eligibility:
  // open -> excluded (before selection), half_open -> probe permitted, unknown/closed -> eligible
  projectRoot?: string | null
  breakerOptions?: BreakerOptions
}

export interface BreakerExclusion {
  model: string
  provider: string | null
  breakerState: string
  reason: string
}

export interface ModelRouteResult {
  status: "RESOLVED" | "BLOCKED"
  agent: string
  entry: RoutingTaskEntry
  matchedTaskClass: string
  provider: string | null
  model: string | null
  variant: string | null
  variantStatus: string | null
  fallback: FallbackRoute[]
  reason: string
  warnings: string[]
  excluded: BreakerExclusion[]
}

interface Routeable {
  ok: boolean
  why?: string
  variantName?: string
  variantStatus?: string
  breakerState?: string
  warnings: string[]
}

function testRouteable(registry: ModelRegistry, modelId: string, wantVariant: string | null, requiredModality: string, desiredRank: number, projectRoot?: string | null, breakerOptions?: BreakerOptions): Routeable {
  const m = findModel(registry, modelId)
  if (!m) return { ok: false, why: "NO_REGISTRY_ENTRY", warnings: [] }
  if (!m.available) return { ok: false, why: "UNAVAILABLE", warnings: [] }
  if (requiredModality === "vision" && !m.supportsVision) return { ok: false, why: "VISION_NOT_VERIFIED", warnings: [] }
  if (projectRoot) {
    const bs = breakerStatus(projectRoot, modelId, breakerOptions)
    // half_open = cooldown elapsed, one probe permitted (isAvailable semantics); only state=open blocks
    if (bs.state === "open") return { ok: false, why: "CIRCUIT_OPEN", breakerState: bs.state, warnings: [] }
  }
  const res = resolveVariant(m, wantVariant, desiredRank, registry.effortRankOrder)
  if (!res.variant) return { ok: false, why: "NO_USABLE_VARIANT", warnings: res.warnings }
  if (res.variant.status === "UNSUPPORTED") return { ok: false, why: "UNSUPPORTED_EFFORT", warnings: res.warnings }
  return { ok: true, variantName: res.variant.name, variantStatus: res.variant.status, warnings: res.warnings }
}

export function resolveModelRoute(registry: ModelRegistry, policy: RoutingPolicy, input: ModelRouteInput): ModelRouteResult {
  const warnings: string[] = []
  let entry = loadTaskEntry(policy, input.matchedTaskClass)
  let matchedClass = input.matchedTaskClass
  if (!entry) {
    entry = loadTaskEntry(policy, policy.default_task_class)!
    warnings.push(`unknown task class '${input.matchedTaskClass}' -> defaulted to '${policy.default_task_class}'`)
    matchedClass = policy.default_task_class
  }

  // complexity escalation (baseline semantics: complexity=high escalates crud-simple -> standard-coding)
  if (input.complexity === "high" && entry.escalates_to) {
    const esc = loadTaskEntry(policy, entry.escalates_to)
    if (esc) {
      warnings.push(`complexity=high escalated '${matchedClass}' -> '${esc.task_class}'`)
      entry = esc
      matchedClass = esc.task_class
    }
  }

  const modalityReq: string = input.modality === "vision" || entry.modality_required === "vision" ? "vision" : "text"

  const modelIds: string[] = []
  if (input.modelOverride) modelIds.push(input.modelOverride)
  if (entry.model) modelIds.push(entry.model)
  for (const c of entry.chain ?? []) modelIds.push(c)
  const uniqueIds = [...new Set(modelIds)]

  // desired effort rank from the policy-selected variant on the policy-selected model
  const entryModel = entry.model ? findModel(registry, entry.model) : undefined
  let desiredRank = Number.MAX_SAFE_INTEGER
  if (entryModel && entry.variant) {
    const ev = entryModel.variants.find((v) => v.name === entry.variant)
    if (ev) desiredRank = effortRank(ev.effort, registry.effortRankOrder)
  }

  const resolvedFallbacks: FallbackRoute[] = []
  const excluded: BreakerExclusion[] = []
  let primary: { modelId: string; variantName: string; variantStatus: string } | null = null

  for (const mid of uniqueIds) {
    let wanted: string | null = null
    if (input.modelOverride && mid === input.modelOverride) wanted = input.variantOverride ?? null
    else if (!input.modelOverride && mid === entry.model) wanted = entry.variant
    const res = testRouteable(registry, mid, wanted, modalityReq, desiredRank, input.projectRoot, input.breakerOptions)
    if (!res.ok) {
      // vision never silently falls back to a text-only model (SSOT vision policy)
      warnings.push(...res.warnings)
      if (res.why === "CIRCUIT_OPEN") {
        const why = `circuit-open: '${mid}' excluded from routing (breaker state=open)`
        warnings.push(why)
        excluded.push({ model: mid, provider: findModel(registry, mid)?.provider ?? null, breakerState: res.breakerState ?? "open", reason: "circuit-open" })
      }
      continue
    }
    if (!primary) {
      primary = { modelId: mid, variantName: res.variantName!, variantStatus: res.variantStatus! }
      warnings.push(...res.warnings)
    } else {
      warnings.push(...res.warnings)
      resolvedFallbacks.push({ model: mid, variant: res.variantName!, status: res.variantStatus as FallbackRoute["status"] })
    }
  }

  let latencyNote = ""
  if (input.latencyPreference === "speed" && primary && primary.modelId === entry.model && entryModel) {
    const cur = entryModel.variants.find((v) => v.name === primary!.variantName)
    if (cur) {
      const lower = entryModel.variants
        .filter((v) => v.status !== "UNSUPPORTED" && !entryModel.rejectedEfforts.includes(v.effort ?? "") && effortRank(v.effort, registry.effortRankOrder) < effortRank(cur.effort, registry.effortRankOrder))
        .sort((a, b) => effortRank(a.effort, registry.effortRankOrder) - effortRank(b.effort, registry.effortRankOrder))
      if (lower.length) {
        const newv = lower[lower.length - 1]
        primary = { ...primary, variantName: newv.name, variantStatus: newv.status }
        latencyNote = `latency=speed downgraded variant to '${newv.name}'`
        warnings.push(latencyNote)
      }
    }
  }

  if (primary) {
    // canonical chain step 1: same model / adjacent lower verified variant first
    const pm = findModel(registry, primary.modelId)
    if (pm) {
      const chosenVariant = pm.variants.find((v) => v.name === primary!.variantName)
      if (chosenVariant) {
        const chosenRank = effortRank(chosenVariant.effort, registry.effortRankOrder)
        const lower = pm.variants
          .filter((v) => v.status !== "UNSUPPORTED" && !pm.rejectedEfforts.includes(v.effort ?? "") && v.name !== chosenVariant.name && effortRank(v.effort, registry.effortRankOrder) < chosenRank)
          .sort((a, b) => effortRank(a.effort, registry.effortRankOrder) - effortRank(b.effort, registry.effortRankOrder))
        if (lower.length) {
          const adjacent = lower[lower.length - 1] // immediate lower tier, not the floor
          if (!resolvedFallbacks.some((f) => f.model === primary!.modelId)) {
            resolvedFallbacks.unshift({ model: primary.modelId, variant: adjacent.name, status: adjacent.status as FallbackRoute["status"] })
          }
        }
      }
    }
  }

  if (!primary) {
    const blockedWhy =
      modalityReq === "vision"
        ? "no runtime-verified multimodal-input model exists in this environment (image input explicitly rejected by b.ai endpoint) - refusing silent text-only fallback"
        : "no routeable model in chain"
    warnings.push(blockedWhy)
    return { status: "BLOCKED", agent: entry.agent, entry, matchedTaskClass: matchedClass, provider: null, model: null, variant: null, variantStatus: null, fallback: [], reason: entry.reason, warnings, excluded }
  }

  const pm = findModel(registry, primary.modelId)
  return {
    status: "RESOLVED",
    agent: entry.agent,
    entry,
    matchedTaskClass: matchedClass,
    provider: pm?.provider ?? null,
    model: primary.modelId,
    variant: primary.variantName,
    variantStatus: primary.variantStatus,
    fallback: resolvedFallbacks,
    reason: [entry.reason, latencyNote].filter(Boolean).join("; "),
    warnings,
    excluded,
  }
}
