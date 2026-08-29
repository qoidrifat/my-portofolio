// Smart Router v2 — agent router (directive #24). Deterministic: task class -> agent via routing policy.

import type { AgentName, TaskClassification } from "./types.ts"

export interface RoutingTaskEntry {
  task_class: string
  agent: AgentName
  model: string | null
  variant: string | null
  chain?: string[]
  escalates_to?: string
  risk?: string
  modality_required?: "text" | "vision"
  reason: string
}

export interface RoutingPolicy {
  version: string
  default_task_class: string
  task_classes: RoutingTaskEntry[]
  review_requirements: Record<string, string>
  zcode_independent_review: string[]
}

export function loadTaskEntry(policy: RoutingPolicy, taskClass: string): RoutingTaskEntry | null {
  return policy.task_classes.find((t) => t.task_class === taskClass) ?? null
}

export function resolveAgent(policy: RoutingPolicy, classification: TaskClassification): { agent: AgentName; entry: RoutingTaskEntry; warnings: string[] } {
  const warnings: string[] = []
  let entry = loadTaskEntry(policy, classification.matchedTaskClass)
  if (!entry) {
    entry = loadTaskEntry(policy, policy.default_task_class)
    warnings.push(`unknown task class '${classification.matchedTaskClass}' -> defaulted to '${policy.default_task_class}'`)
  }
  return { agent: entry!.agent, entry: entry!, warnings }
}
