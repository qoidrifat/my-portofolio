// Smart Router v2 — OpenCode plugin (directive #60–#63).
// Hooks verified against @opencode-ai/plugin 1.18.23 types installed at .opencode/node_modules:
//   chat.message      — classification, routing metadata, session state (READ-ONLY: cannot mutate model #61)
//   chat.params       — reasoning-effort hard-ceiling enforcement (#62)
//   permission.ask    — permission routing: ALLOW/ASK/DENY per profile/agent/risk (#13)
//   tool.execute.before — git/secret hard-deny guard for shell commands (even under YOLO #16)
//   tool.execute.after  — error signal collection for the post-turn evaluator
//   event             — provider/session error observation, circuit breaker
// Every hook is failure-isolated: router bugs must never break the host runtime.

import type { Plugin } from "@opencode-ai/plugin"
import { join } from "node:path"
import { classify } from "../smart-router/classifier.ts"
import { buildRegistry, findModel, effortRank } from "../smart-router/capability.ts"
import { loadPermissionPolicy, resolveRoute } from "../smart-router/router.ts"
import { resolvePermission, detectEnvironment } from "../smart-router/permission-resolver.ts"
import { loadConfig } from "../smart-router/config.ts"
import { recordRoute, recordFailure, getSession } from "../smart-router/session-state.ts"
import { recordFailure as breakerFailure, recordSuccess as breakerSuccess, breakerStatus } from "../smart-router/circuit-breaker.ts"
import { appendJsonl, LOG } from "../smart-router/logger.ts"
import { writeStatus } from "../smart-router/status.ts"
import { evaluate } from "../smart-router/evaluator.ts"
// V2.2 host observation (additive, I-021): observational sidecar — never influences routing.
import { loadFlags } from "../smart-router/v22/flags.ts"
import { createHostV22 } from "../smart-router/v22/host.ts"

const SIGNALS = { toolErrors: [] as string[], exceptions: [] as string[], testFailures: 0, reviewBlockers: [] as string[], repeatedRetries: 0, providerErrors: [] as string[], contextIssues: [] as string[] }

function toolClassOf(policy: ReturnType<typeof loadPermissionPolicy>, tool: string): string {
  return policy.tool_class_map[String(tool).toLowerCase()] ?? "execute"
}

export const SmartRouterPlugin: Plugin = async ({ client, directory }) => {
  const projectRoot = directory
  const cfg = loadConfig(projectRoot)
  let registry: ReturnType<typeof buildRegistry> | null = null
  try {
    registry = buildRegistry()
  } catch {}

  // WS-C: the SDK Permission type carries no agent field (verified: @opencode-ai/sdk 1.18.25);
  // the host DOES expose the selected agent on chat.message (input.agent). Thread it through
  // session state so permission decisions can distinguish agents. Missing session -> "build"
  // (previous hardcoded behavior); can only tighten decisions (read-only force), never weaken.
  const sessionAgentOf = (sessionId: string | null | undefined): string => {
    if (!sessionId) return "build"
    try {
      return getSession(projectRoot, sessionId).currentRoute.agent || "build"
    } catch {
      return "build"
    }
  }

  // WS-A: failure attribution key. Prefer the session's live model id ("provider/model")
  // so circuits open per-model, not per-session. Unknown -> legacy "session" key.
  const sessionBreakerKey = (sessionId: string | null | undefined): string => {
    if (!sessionId) return "session"
    try {
      return getSession(projectRoot, sessionId).currentRoute.model || "session"
    } catch {
      return "session"
    }
  }

  try {
    writeStatus(projectRoot, { startedAt: new Date().toISOString() })
  } catch {}

  // V2.2 flags default OFF (fail-safe). OFF ⇒ createHostV22 is never constructed ⇒ zero V2.2
  // activity. SHADOW ⇒ T1–T5 telemetry + shadow computation, all fail-open, zero influence.
  const v22flags = loadFlags(projectRoot)
  const v22 = v22flags.mode === "OFF" ? null : createHostV22(projectRoot, { registry, mode: v22flags.mode })

  try {
    await client.app
      .log({
        body: {
          service: "smart-router",
          level: "info",
          message: `Smart Router v2 loaded (mode=${cfg.mode}, permissions=${cfg.permissionMode}, registry=${registry?.models.length ?? 0} models)`,
          extra: {},
        },
      })
      .catch(() => {})
  } catch {}

  return {
    // -------- chat.message: classification + advisory metadata + state (no model mutation possible #61)
    "chat.message": async (input, output) => {
      try {
        if (cfg.mode === "off") return
        const text = (output.parts ?? [])
          .filter((p) => (p as { type?: string })?.type === "text")
          .map((p) => (p as { text?: string }).text ?? "")
          .join("\n")
        if (!text.trim()) return
        const agent = input.agent ?? "build"
        const route = resolveRoute(projectRoot, {
          prompt: text,
          sessionId: input.sessionID,
          overrides: { taskType: undefined },
        })
        recordRoute(
          projectRoot,
          input.sessionID,
          // qualified "provider/model" id: this is the live dispatch target and the breaker attribution key
          { model: input.model ? `${input.model.providerID}/${input.model.modelID}` : null, variant: input.variant ?? null, agent },
          { routed: { model: route.decision.model, variant: route.decision.variant, agent: route.decision.agent }, status: route.decision.status },
        )
        // mismatch advisory: the live model differs from the routing recommendation
        const liveModel = input.model ? `${input.model.providerID}/${input.model.modelID}` : null
        if (liveModel && route.decision.model && liveModel !== route.decision.model) {
          appendJsonl(projectRoot, LOG.smartRouterLog, {
            timestamp: new Date().toISOString(),
            kind: "advisory-mismatch",
            sessionId: input.sessionID,
            live: { model: liveModel, variant: input.variant ?? null, agent },
            recommended: { model: route.decision.model, variant: route.decision.variant, agent: route.decision.agent },
            note: "advisory only — /auto dispatch reroutes on the next request (no in-flight model mutation)",
          })
        }
        // V2.2 (additive, observational): t0 + attribution + shadow computation. Cannot mutate
        // the route — chat.message output is untouched and the host cannot receive a model here.
        v22?.onChatMessage({
          sessionId: input.sessionID,
          agent,
          liveModel,
          liveVariant: input.variant ?? null,
          route,
          ts: Date.now(),
        })
      } catch {}
    },

    // -------- chat.params: hard-ceiling enforcement (#62). Never escalates; only clamps invalid effort.
    "chat.params": async (input, output) => {
      try {
        if (cfg.mode === "off") return
        // V2.2 (additive, observational): t1 = provider dispatch moment (host-exposed transition)
        v22?.onChatParams(input.sessionID)
        const modelId = input.model ? `${(input.model as { providerID?: string }).providerID ?? ""}/${(input.model as { modelID?: string }).modelID ?? (input.model as { id?: string }).id ?? ""}` : null
        const opts = output.options as Record<string, unknown>
        const key = opts ? ("reasoning_effort" in opts ? "reasoning_effort" : "reasoningEffort" in opts ? "reasoningEffort" : null) : null
        // live firing evidence (WS-B): every invocation is recorded, not just clamps
        appendJsonl(projectRoot, LOG.smartRouterLog, {
          timestamp: new Date().toISOString(),
          kind: "chat.params-invoke",
          sessionId: input.sessionID ?? null,
          agent: (input as { agent?: string }).agent ?? null,
          model: modelId,
          hasOptions: !!opts,
          effortKey: key,
          requestedEffort: key && opts ? String(opts[key] ?? "") : null,
        })
        if (!modelId || !registry) return
        const m = findModel(registry, modelId)
        if (!m) return
        if (!opts) return
        if (!key) return
        const current = String(opts[key] ?? "")
        const banned = m.rejectedEfforts.includes(current)
        const overCeiling = m.maxVerifiedEffort ? effortRank(current, registry.effortRankOrder) > effortRank(m.maxVerifiedEffort, registry.effortRankOrder) : false
        const blockedVariant = m.variants.find((v) => v.effort === current && v.status === "BLOCKED_UPSTREAM")
        if (!banned && !overCeiling && !blockedVariant) return
        // clamp target: verified max; else self high; else highest verified
        const verified = m.variants.filter((v) => v.status === "VERIFIED")
        const target =
          verified.find((v) => v.name === "max") ??
          verified.find((v) => v.effort === m.maxVerifiedEffort) ??
          verified.find((v) => v.name === "high") ??
          verified.at(-1)
        if (!target) return
        opts[key] = target.effort ?? target.name
        appendJsonl(projectRoot, LOG.smartRouterLog, {
          timestamp: new Date().toISOString(),
          kind: "effort-clamp",
          model: modelId,
          from: current,
          to: opts[key],
          reason: banned ? "effort rejected by backend" : blockedVariant ? "effort TEMPORARILY BLOCKED upstream" : "effort above verified ceiling",
        })
      } catch {}
    },

    // -------- permission.ask: the Permission Router (#13)
    "permission.ask": async (input, output) => {
      try {
        if (cfg.mode === "off") return
        const policy = loadPermissionPolicy(projectRoot)
        const pattern = Array.isArray(input.pattern) ? input.pattern.join(" ") : String(input.pattern ?? input.title ?? "")
        const agent = sessionAgentOf(input.sessionID)
        const perm = resolvePermission(policy, {
          agent, // threaded from chat.message (host does not expose agent on Permission); missing -> "build"
          tool: input.type,
          operation: pattern,
          mode: cfg.permissionMode,
          environment: detectEnvironment(),
        })
        output.status = perm.decision
        appendJsonl(projectRoot, LOG.permissions, {
          timestamp: new Date().toISOString(),
          sessionId: input.sessionID,
          agent,
          agentSource: "session-threaded",
          permissionType: input.type,
          operationPreview: pattern.slice(0, 120),
          decision: perm.decision,
          risk: perm.risk,
          profile: perm.profile,
          rule: perm.matchedRule,
          reason: perm.reason,
        })
      } catch {
        // on any router failure fall back to the runtime default (ask) — never silently allow
      }
    },

    // -------- tool.execute.before: hard-deny guard; runs even when a permission prompt was pre-approved
    "tool.execute.before": async (input, output) => {
      try {
        if (cfg.mode === "off") return
        const tool = String(input.tool ?? "").toLowerCase()
        if (tool !== "bash" && tool !== "shell") return
        const cmd = String((output?.args as { command?: string } | undefined)?.command ?? "")
        if (!cmd.trim()) return
        const policy = loadPermissionPolicy(projectRoot)
        const agent = sessionAgentOf(input.sessionID)
        const decision = resolvePermission(policy, { agent, tool, operation: cmd, mode: cfg.permissionMode, environment: detectEnvironment() })
        if (decision.decision === "deny") {
          appendJsonl(projectRoot, LOG.permissions, { timestamp: new Date().toISOString(), guard: "tool.execute.before", agent, sessionId: input.sessionID, decision: "deny", rule: decision.matchedRule, reason: decision.reason, operationPreview: cmd.slice(0, 120) })
          throw new Error(`SMART-ROUTER HARD DENY [${decision.matchedRule}]: ${decision.reason}`)
        }
      } catch (e) {
        if (e instanceof Error && e.message.startsWith("SMART-ROUTER HARD DENY")) throw e
        // non-deny failures are swallowed: the guard must not break normal execution
      }
    },

    // -------- tool.execute.after: evaluator signals
    "tool.execute.after": async (input, output) => {
      try {
        const meta = (output?.metadata ?? {}) as { error?: unknown }
        const out = String(output?.output ?? "")
        if (meta?.error || /error|failed|exception/i.test(out.slice(0, 400))) {
          SIGNALS.toolErrors.push(String(input.tool))
          if (SIGNALS.toolErrors.length > 50) SIGNALS.toolErrors.shift()
          if (String(input.tool).toLowerCase() === "bash" && /tests?\s+failed|failing/i.test(out.slice(0, 2000))) SIGNALS.testFailures += 1
        } else if (String(input.tool).toLowerCase() === "bash") {
          breakerSuccess(join(projectRoot), sessionBreakerKey(input.sessionID))
        }
      } catch {}
    },

    // -------- event: provider/session observation (#63) — observation, not control
    event: async ({ event }) => {
      try {
        // V2.2 (additive, observational): T2 outcome + T3 t2/t3 + T4 usage from the event bus
        v22?.onEvent(event)
        const type = (event as { type?: string }).type ?? ""
        if (type === "session.error") {
          const props = (event as { properties?: { error?: string; sessionID?: string } }).properties ?? {}
          SIGNALS.exceptions.push(String(props.error ?? "").slice(0, 200))
          // closed-loop attribution: open the circuit for the session's live model (per-model), not a global key
          const key = sessionBreakerKey(props.sessionID)
          breakerFailure(join(projectRoot), key, String(props.error ?? ""))
          appendJsonl(projectRoot, LOG.smartRouterLog, {
            timestamp: new Date().toISOString(),
            kind: "breaker-failure-recorded",
            sessionId: props.sessionID ?? null,
            breakerKey: key,
            error: String(props.error ?? "").slice(0, 200),
          })
        }
        if (type === "permission.updated") {
          const props = (event as { properties?: { id?: string; type?: string } }).properties ?? {}
          appendJsonl(projectRoot, LOG.permissions, { timestamp: new Date().toISOString(), observed: "permission.updated", permissionType: props.type ?? null })
        }
      } catch {}
    },

    dispose: async () => {
      try {
        const result = evaluate(SIGNALS)
        appendJsonl(projectRoot, LOG.smartRouterLog, { timestamp: new Date().toISOString(), kind: "dispose-evaluation", quality: result.quality, action: result.action, reasons: result.reasons })
        // V2.2 (additive, observational): T1 evaluation attribution (+ T3 window fallback)
        v22?.onDispose(result)
      } catch {}
    },
  }
}

// named default export too: OpenCode accepts either style
export default SmartRouterPlugin
