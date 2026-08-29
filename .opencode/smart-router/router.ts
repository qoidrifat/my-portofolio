// Smart Router v2 — routing orchestrator (directive #6, #7).
// PROMPT -> TASK ANALYSIS -> CAPACITY ESTIMATION -> RISK ANALYSIS -> AGENT -> MODEL -> VARIANT
//        -> PERMISSION -> DECISION (+ logging, state, dispatch command).
// Deterministic and side-effect-light: same inputs => byte-identical decision fields.

import { createHash } from "node:crypto"
import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import type { RouteDecision, RouteDecisionInput, RiskLevel } from "./types.ts"
import { classify } from "./classifier.ts"
import type { ClassifyOverrides } from "./classifier.ts"
import { buildRegistry } from "./capability.ts"
import { resolveModelRoute } from "./model-router.ts"
import { resolveAgent, loadTaskEntry } from "./agent-router.ts"
import type { RoutingPolicy } from "./agent-router.ts"
import { assessTaskRisk } from "./risk-engine.ts"
import { resolvePermission, detectEnvironment } from "./permission-resolver.ts"
import type { PermissionPolicy } from "./permission-resolver.ts"
import { loadConfig, smartRouterDir } from "./config.ts"
import { appendJsonl, LOG } from "./logger.ts"
import { recordRoute } from "./session-state.ts"

// shipped policy defaults live next to this module: projects without their own
// policy files still get correct routing instead of an ENOENT crash
const MODULE_DIR = dirname(fileURLToPath(import.meta.url))

function readPolicyFile(projectRoot: string, file: string): unknown {
  try {
    return JSON.parse(readFileSync(join(smartRouterDir(projectRoot), file), "utf8"))
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === "ENOENT") {
      return JSON.parse(readFileSync(join(MODULE_DIR, file), "utf8"))
    }
    throw e
  }
}

export function loadRoutingPolicy(projectRoot: string): RoutingPolicy {
  return readPolicyFile(projectRoot, "routing-policy.json") as RoutingPolicy
}

export function loadPermissionPolicy(projectRoot: string): PermissionPolicy {
  return readPolicyFile(projectRoot, "permission-policy.json") as PermissionPolicy
}

export interface ResolveOptions {
  prompt: string
  sessionId?: string
  overrides?: ClassifyOverrides
  modelOverride?: string | null
  variantOverride?: string | null
  environment?: "local" | "staging" | "production"
}

export interface ResolveResult {
  decision: RouteDecision
  risk: RiskLevel
  permissionProfile: string
}

function excerpt(prompt: string, n = 160): string {
  const t = String(prompt ?? "").replace(/\s+/g, " ").trim()
  return t.length > n ? t.slice(0, n) + "…" : t
}

export function resolveRoute(projectRoot: string, opts: ResolveOptions): ResolveResult {
  const cfg = loadConfig(projectRoot)
  const registry = buildRegistry()
  const routingPolicy = loadRoutingPolicy(projectRoot)
  const permissionPolicy = loadPermissionPolicy(projectRoot)

  const classification = classify(opts.prompt, opts.overrides)
  const risk = assessTaskRisk(classification, opts.prompt)
  const { agent, entry, warnings: agentWarnings } = resolveAgent(routingPolicy, classification)

  const modelRoute = resolveModelRoute(registry, routingPolicy, {
    matchedTaskClass: classification.matchedTaskClass,
    complexity: classification.complexity,
    modality: classification.modality,
    latencyPreference: opts.overrides?.latencyPreference ?? (cfg.latencyProfile === "interactive" ? "speed" : "normal"),
    qualityPreference: opts.overrides?.qualityPreference ?? "normal",
    modelOverride: opts.modelOverride ?? null,
    variantOverride: opts.variantOverride ?? null,
    // closed-loop reliability: circuit-open candidates are excluded before selection
    projectRoot,
  })

  // Permission routing is INDEPENDENT of model routing (#46): reasoning demand never implies tool permission.
  const environment = opts.environment ?? detectEnvironment()
  const perm = resolvePermission(permissionPolicy, {
    agent,
    tool: "task",
    operation: "task-dispatch",
    mode: cfg.permissionMode,
    environment,
  })
  const hardDenies = permissionPolicy.hard_denies.patterns.map((p) => p.id)

  const input: RouteDecisionInput = {
    promptExcerpt: excerpt(opts.prompt),
    taskType: classification.taskType,
    matched_task_class: modelRoute.matchedTaskClass,
    complexity: classification.complexity,
    contextDemand: classification.contextDemand,
    reasoningDemand: classification.reasoningDemand,
    modality: classification.modality,
    confidence: classification.confidence,
    latency_preference: opts.overrides?.latencyPreference ?? "normal",
    quality_preference: opts.overrides?.qualityPreference ?? "normal",
    cost_profile: cfg.costProfile,
  }

  const warnings = [...agentWarnings, ...modelRoute.warnings, ...classification.signals]
  const routeId = `R-${createHash("sha1").update(JSON.stringify({ c: input.matched_task_class, m: modelRoute.model, v: modelRoute.variant, a: agent, r: risk, e: environment })).digest("hex").slice(0, 10)}`

  const decision: RouteDecision = {
    routeId,
    timestamp: new Date().toISOString(),
    sessionId: opts.sessionId,
    input,
    status: modelRoute.status,
    agent: modelRoute.agent as RouteDecision["agent"],
    provider: modelRoute.provider,
    model: modelRoute.model,
    variant: modelRoute.variant,
    variantStatus: modelRoute.variantStatus as RouteDecision["variantStatus"],
    permission: {
      profile: perm.profile as RouteDecision["permission"]["profile"],
      risk,
      hardDenies,
      requiresConfirmation: permissionPolicy.confirmation_gates.patterns.map((p) => p.id),
    },
    fallback: modelRoute.fallback,
    reason: modelRoute.reason,
    warnings,
  }

  if (modelRoute.status === "RESOLVED" && decision.model) {
    decision.dispatchCommand = [
      "opencode run",
      `--model ${decision.model}`,
      decision.variant ? `--variant ${decision.variant}` : null,
      decision.agent ? `--agent ${decision.agent}` : null,
      `"${excerpt(opts.prompt, 120).replace(/"/g, "'")}"`,
    ]
      .filter(Boolean)
      .join(" ")
  }

  // observability + state (both failure-isolated)
  appendJsonl(projectRoot, LOG.routing, {
    timestamp: decision.timestamp,
    routeId,
    sessionId: opts.sessionId ?? null,
    taskType: input.taskType,
    matched_task_class: input.matched_task_class,
    agent: decision.agent,
    model: decision.model,
    variant: decision.variant,
    permission: decision.permission.profile,
    risk,
    decision: decision.status,
    reason: decision.reason,
    warnings: decision.warnings,
    fallback: decision.fallback,
    result: "logged",
  })
  // breaker exclusion observability (A6): reconstructable candidate exclusions
  for (const ex of modelRoute.excluded) {
    appendJsonl(projectRoot, LOG.routing, {
      timestamp: decision.timestamp,
      kind: "breaker-exclusion",
      routeId,
      sessionId: opts.sessionId ?? null,
      candidate: `${ex.model}${decision.variant ? `#${decision.variant}` : ""}`,
      provider: ex.provider,
      model: ex.model,
      breakerState: ex.breakerState,
      reason: ex.reason,
      route: input.matched_task_class,
      result: "excluded-before-selection",
    })
  }
  appendJsonl(projectRoot, LOG.smartRouterLog, {
    timestamp: decision.timestamp,
    routeId,
    sessionId: opts.sessionId ?? null,
    decision,
  })
  if (opts.sessionId) {
    recordRoute(projectRoot, opts.sessionId, { model: decision.model, variant: decision.variant, agent: decision.agent }, decision as unknown as Record<string, unknown>)
  }

  void entry
  void loadTaskEntry
  return { decision, risk, permissionProfile: perm.profile }
}

// ---------- continuation packet (directive #30) ----------

import type { ContinuationPacket } from "./types.ts"
import { writeJson } from "./logger.ts"

export function buildContinuationPacket(params: {
  task: string
  currentState: string
  completedWork: string[]
  failedWork: string[]
  relevantFiles: string[]
  gitState: string
  previousRoute: ContinuationPacket["previousRoute"]
  newRoute: ContinuationPacket["newRoute"]
  escalationReason: string
  requiredNextAction: string
}): ContinuationPacket {
  return { ...params, createdAt: new Date().toISOString() }
}

export function writeContinuationPacket(projectRoot: string, packet: ContinuationPacket): string {
  const rel = `routing/continuation-${Date.now()}.json`
  writeJson(projectRoot, rel, packet)
  appendJsonl(projectRoot, LOG.routing, { timestamp: packet.createdAt, kind: "continuation-packet", previousRoute: packet.previousRoute, newRoute: packet.newRoute, reason: packet.escalationReason })
  return join(projectRoot, ".opencode", "ai", rel)
}
