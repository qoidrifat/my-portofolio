// Smart Router V2.2 — requirement builder (Phase B, ROUTING_MODEL §1).
// Pure: V2.1 classification + policy row → canonical TaskRequirement.
// vision-task is BLOCKED at the mapping level (DECISION_MATRIX §1.1) — never a profile.

import type { AgentName, Complexity, ContextDemand, Modality, ReasoningDemand, RiskLevel } from "../types.ts"
import type { SourceTaskClass } from "./types.ts"
import { CAPABILITY_FLOORS, CLASS_MAPPING, CONTEXT_DEMAND_TOKENS } from "./policy-data.ts"
import type { CapabilityRequirement, TaskRequirement } from "./types.ts"

export interface RequirementInput {
  sourceTaskClass: SourceTaskClass
  riskClass: RiskLevel
  agent: AgentName
  modality: Modality
  complexity: Complexity
  contextDemand: ContextDemand
  reasoningDemand: ReasoningDemand
  latencyPreference: "normal" | "speed"
  qualityPreference: "normal" | "max"
  costProfile: "economy" | "balanced" | "quality"
  /** Explicit token estimate; falls back to CONTEXT_DEMAND_TOKENS mapping. */
  contextTokens?: number
  sessionId?: string
  routeId?: string
}

export type BuildRequirementResult =
  | { kind: "ok"; requirement: TaskRequirement }
  | { kind: "blocked"; reason: "VISION_TASK_BLOCKED" }

export function buildRequirement(input: RequirementInput): BuildRequirementResult {
  const mapping = CLASS_MAPPING[input.sourceTaskClass]
  if (!mapping) return { kind: "blocked", reason: "VISION_TASK_BLOCKED" } // unreachable for typed input; guard for policy drift
  if (mapping.blocked) return { kind: "blocked", reason: "VISION_TASK_BLOCKED" }

  const requirements: CapabilityRequirement[] = CAPABILITY_FLOORS[mapping.optimizationClass].map((f) => ({
    dim: f.dim,
    tier: f.tier,
    minLevel: f.minLevel,
  }))

  // Vision modality is MANDATORY (hard): unknown evidence excludes (C1; I-005 keeps it BLOCKED anyway).
  if (input.modality === "vision") {
    requirements.push({ dim: "vision", tier: "MANDATORY", minLevel: "VERIFIED" })
  }

  return {
    kind: "ok",
    requirement: {
      sessionId: input.sessionId,
      routeId: input.routeId,
      sourceTaskClass: input.sourceTaskClass,
      optimizationClass: mapping.optimizationClass,
      riskClass: input.riskClass,
      agent: input.agent,
      modality: input.modality,
      complexity: input.complexity,
      contextDemand: input.contextDemand,
      reasoningDemand: input.reasoningDemand,
      contextTokens: input.contextTokens ?? CONTEXT_DEMAND_TOKENS[input.contextDemand],
      capabilityRequirements: requirements,
      latencyPreference: input.latencyPreference,
      qualityPreference: input.qualityPreference,
      costProfile: input.costProfile,
    },
  }
}
