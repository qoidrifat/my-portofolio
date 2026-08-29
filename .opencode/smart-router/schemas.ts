// Smart Router v2 — minimal schema validation for the policy JSONs (directive #90).
// Runtime config validation: fail fast with exact reasons before routing decisions are trusted.

import type { RoutingPolicy } from "./agent-router.ts"
import type { PermissionPolicy } from "./permission-resolver.ts"
import type { ModelRegistry } from "./types.ts"

export interface ValidationResult {
  valid: boolean
  errors: string[]
}

export function validateRoutingPolicy(p: unknown): ValidationResult {
  const errors: string[] = []
  const o = p as RoutingPolicy
  if (!o || typeof o !== "object") return { valid: false, errors: ["routing policy is not an object"] }
  if (!Array.isArray(o.task_classes) || o.task_classes.length === 0) errors.push("task_classes must be a non-empty array")
  else {
    for (const t of o.task_classes) {
      if (!t.task_class) errors.push("task_class entry missing 'task_class'")
      if (!t.agent) errors.push(`task class '${t.task_class}' missing 'agent'`)
      if (t.task_class !== "vision-task" && !t.model) errors.push(`task class '${t.task_class}' missing 'model'`)
      if (!t.reason) errors.push(`task class '${t.task_class}' missing 'reason'`)
    }
  }
  if (!o.default_task_class) errors.push("missing default_task_class")
  return { valid: errors.length === 0, errors }
}

export function validatePermissionPolicy(p: unknown): ValidationResult {
  const errors: string[] = []
  const o = p as PermissionPolicy
  if (!o || typeof o !== "object") return { valid: false, errors: ["permission policy is not an object"] }
  for (const prof of ["safe", "standard", "elevated", "yolo"]) {
    if (!o.profiles?.[prof]) errors.push(`missing profile '${prof}'`)
  }
  if (!o.hard_denies?.patterns?.length) errors.push("hard_denies.patterns must be non-empty")
  else {
    for (const pat of o.hard_denies.patterns) {
      try {
        new RegExp(pat.pattern, "i")
      } catch (e) {
        errors.push(`hard deny '${pat.id}' has invalid regex: ${String(e)}`)
      }
    }
  }
  for (const [k, pats] of Object.entries(o.operation_classes ?? {})) {
    for (const pat of pats) {
      try {
        new RegExp(pat, "i")
      } catch (e) {
        errors.push(`operation class '${k}' has invalid regex: ${String(e)}`)
      }
    }
  }
  if (!o.agent_policy?.build) errors.push("agent_policy missing 'build'")
  return { valid: errors.length === 0, errors }
}

export function validateRegistry(r: ModelRegistry): ValidationResult {
  const errors: string[] = []
  if (!r.models?.length) errors.push("registry has no models — check SSOT files in the global OpenCode config")
  for (const m of r.models) {
    if (!m.id) errors.push("registry entry missing id")
  }
  const ids = new Set(r.models.map((m) => m.id))
  if (ids.size !== r.models.length) errors.push("duplicate model ids in registry")
  return { valid: errors.length === 0, errors }
}
