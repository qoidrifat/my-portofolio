// Smart Router v2 — fallback engine (directive #72, #73).
// Chain order: same model lower variant -> entry chain (same agent) -> different model -> different provider.
// Provider failure policy: transient errors retry once then fall back; unsupported-parameter errors never retry identically.

import type { FallbackRoute, ModelRegistry, RouteDecision } from "./types.ts"
import { findModel } from "./capability.ts"
import type { RoutingPolicy, RoutingTaskEntry } from "./agent-router.ts"

export type ProviderFailureKind = "transient" | "unsupported_parameter" | "auth" | "unknown"

export function classifyProviderFailure(message: string): ProviderFailureKind {
  const m = String(message ?? "")
  if (/\b(429|5\d\d|timeout|ECONNRESET|ECONNREFUSED|rate limit|temporarily unavailable|overloaded)\b/i.test(m)) return "transient"
  if (/\b400\b|unsupported|invalid (parameter|value|request)|must be one of/i.test(m)) return "unsupported_parameter"
  if (/\b(401|403|unauthorized|forbidden|invalid api key)\b/i.test(m)) return "auth"
  return "unknown"
}

export function nextFallbackAfterFailure(
  decision: RouteDecision,
  failedModel: string | null,
  failedVariant: string | null,
  registry: ModelRegistry,
): FallbackRoute | null {
  void registry
  const fb = decision.fallback ?? []
  if (!failedModel) return fb[0] ?? null
  const idx = fb.findIndex((f) => f.model === failedModel && f.variant === failedVariant)
  if (idx >= 0) return fb[idx + 1] ?? null
  // failed model was not in the recorded chain: hand back the first fallback
  return fb[0] ?? null
}

export function validateFallbackRoute(route: FallbackRoute, registry: ModelRegistry): boolean {
  const m = findModel(registry, route.model)
  if (!m || !m.available) return false
  const v = m.variants.find((x) => x.name === route.variant)
  return !!v && v.status !== "UNSUPPORTED" && !m.rejectedEfforts.includes(v.effort ?? "")
}

export function providerFailureDecision(kind: ProviderFailureKind, taskEntry: RoutingTaskEntry, policy: RoutingPolicy): { retry: boolean; escalateTo: string | null } {
  void policy
  if (kind === "transient") return { retry: true, escalateTo: null } // retry once, then chain (handled by caller)
  if (kind === "unsupported_parameter") return { retry: false, escalateTo: null } // never retry the same invalid request
  if (kind === "auth") return { retry: false, escalateTo: null } // user must fix credentials
  return { retry: false, escalateTo: (taskEntry.chain ?? [])[0] ?? null }
}
