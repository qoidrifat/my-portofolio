// Smart Router v2 — escalation engine (#28, #31, #32, #69, #70, #71). Post-turn evaluation lives in evaluator.ts.

import type { RouteDecision, ModelRegistry } from "./types.ts"
import { findModel } from "./capability.ts"
import { isAvailable } from "./circuit-breaker.ts"

// ---------- escalation ----------

export const ESCALATION_LADDER: Array<{ model: string; variant: string }> = [
  { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "balanced" },
  { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep" },
  { model: "b-ai/glm-5.3-flash", variant: "high" },
  { model: "b-ai/glm-5.3-flash", variant: "max" },
]

export const MAX_REROUTES = 3

export function validateLadderStep(registry: ModelRegistry, step: { model: string; variant: string }, projectRoot?: string | null): boolean {
  const m = findModel(registry, step.model)
  if (!m || !m.available) return false
  // closed-loop: an open circuit makes the step ineligible (half_open = probe permitted)
  if (projectRoot && !isAvailable(projectRoot, step.model)) return false
  const v = m.variants.find((x) => x.name === step.variant)
  return !!v && v.status !== "UNSUPPORTED" && !m.rejectedEfforts.includes(v.effort ?? "")
}

export interface EscalationContext {
  failedRoutes: string[] // "model#variant" keys that already failed without new evidence
  rerouteCount: number
  projectRoot?: string | null // when set, breaker-open candidates are skipped
}

export function nextEscalationRoute(
  decision: RouteDecision,
  registry: ModelRegistry,
  ctx: EscalationContext,
): { route: { model: string; variant: string } | null; action: "escalate" | "fallback" | "block"; reason: string } {
  if (ctx.rerouteCount >= MAX_REROUTES) {
    return { route: null, action: "block", reason: `maximum reroutes (${MAX_REROUTES}) reached — BLOCKED with report (#32)` }
  }
  // 1) climb the verified escalation ladder from the current position (no oscillation: skip failed keys).
  // Off-ladder current routes (mid-fallback-chain) do NOT re-enter the ladder from the bottom —
  // that would present a weaker route as "escalate"; they continue walking the fallback chain instead.
  const currentKey = decision.model && decision.variant ? `${decision.model}#${decision.variant}` : ""
  const failedSet = new Set(ctx.failedRoutes)
  const startIdx = ESCALATION_LADDER.findIndex((s) => `${s.model}#${s.variant}` === currentKey)
  for (let i = startIdx >= 0 ? startIdx + 1 : ESCALATION_LADDER.length; i < ESCALATION_LADDER.length; i++) {
    const step = ESCALATION_LADDER[i]
    const key = `${step.model}#${step.variant}`
    if (failedSet.has(key)) continue // no oscillation without new evidence (#31)
    if (!validateLadderStep(registry, step, ctx.projectRoot)) continue // never escalate to unsupported/unavailable routes (#28)
    return { route: step, action: "escalate", reason: `escalating to stronger verified route '${key}'` }
  }

  // 2) ladder exhausted: try the recorded fallback chain
  for (const fb of decision.fallback ?? []) {
    const key = `${fb.model}#${fb.variant}`
    if (failedSet.has(key) || key === currentKey) continue
    if (!validateLadderStep(registry, fb, ctx.projectRoot)) continue
    return { route: { model: fb.model, variant: fb.variant }, action: "fallback", reason: `ladder exhausted; falling back to '${key}'` }
  }

  return { route: null, action: "block", reason: "no stronger verified route available — BLOCKED" }
}
