// Smart Router v2 — OpenCode plugin (directive #60–#63).
// Migrated to the OpenCode v2 server plugin API:
//   v2 `session.hook("prompt")`   ← v1 `chat.message`      classification, routing metadata, session state
//   v2 `session.hook("context")`  ← v1 `chat.params`       reasoning-effort task downgrade + hard-ceiling clamp
//   v2 `permission.hook("evaluate")` ← v1 `permission.ask` permission routing: ALLOW/ASK/DENY per profile/agent/risk (#13)
//   v2 `tool.hook("execute.before")` ← v1 `tool.execute.before` git/secret hard-deny guard (#16)
//   v2 `tool.hook("execute.after")`  ← v1 `tool.execute.after`  error signal collection for the post-turn evaluator
//   v2 `event.subscribe()`          ← v1 `event`           provider/session error observation, circuit breaker
//   setup cleanup                   ← v1 `dispose`
// Every hook is failure-isolated: router bugs must never break the host runtime.
//
// V2 MIGRATION DEBT (documented, not hidden):
//   - ISR (abort → switch → replay) has no verified v2 equivalent: `session.prompt` carries
//     no model binding and v2 interrupt semantics are unmeasured. Flags stay readable but the
//     coordinator is never constructed; a requested mode is logged as `isr-unavailable-v2`.
//   - `context` request options start empty in v2, so the live effort is derived from the
//     model variant instead of the resolved request options.

import { join } from "node:path"
import { buildRegistry, findModel, effortRank } from "../smart-router/capability.ts"
import { loadPermissionPolicy, resolveRoute } from "../smart-router/router.ts"
import { resolvePermission, detectEnvironment } from "../smart-router/permission-resolver.ts"
import { loadConfig } from "../smart-router/config.ts"
import { recordRoute, getSession } from "../smart-router/session-state.ts"
import { recordFailure as breakerFailure, recordSuccess as breakerSuccess } from "../smart-router/circuit-breaker.ts"
import { appendJsonl, LOG } from "../smart-router/logger.ts"
import { writeStatus } from "../smart-router/status.ts"
import { evaluate } from "../smart-router/evaluator.ts"
// V2.2 host observation (additive, I-021): observational sidecar — never influences routing.
import { loadFlags } from "../smart-router/v22/flags.ts"
import { createHostV22 } from "../smart-router/v22/host.ts"
// V2.2 ISR flags are read only to report that the feature is unavailable in v2.
import { loadIsrFlags } from "../smart-router/v22/isr-flags.ts"
import { effortForTaskClass } from "../smart-router/v22/task-effort.ts"

const SIGNALS = { toolErrors: [] as string[], exceptions: [] as string[], testFailures: 0, reviewBlockers: [] as string[], repeatedRetries: 0, providerErrors: [] as string[], contextIssues: [] as string[] }

// v2 permission actions are tool-family names. Only actions this router has a policy
// class for are handled; everything else (skill, question, external_directory, MCP,
// Code Mode `execute`, …) is left to the runtime.
const V2_ACTION_TOOL: Record<string, string> = {
  read: "read",
  glob: "read",
  grep: "read",
  edit: "edit",
  write: "edit",
  patch: "edit",
  shell: "shell",
  webfetch: "webfetch",
  websearch: "webfetch",
  subagent: "task",
}

// -------- minimal v2 plugin context (the installed @opencode-ai/plugin types are v1) --------

interface Registration {
  dispose(): Promise<void>
}

interface PromptEvent {
  readonly sessionID: string
  readonly messageID: string
  prompt: { text: string; files?: readonly unknown[] }
}

interface ContextEvent {
  readonly sessionID: string
  readonly agent: string
  readonly model: { providerID: string; id: string; variant?: string }
  options: Record<string, unknown>
}

interface PermissionEvent {
  readonly sessionID: string
  readonly agent?: string
  readonly action: string
  readonly resources: readonly string[]
  effect: "allow" | "ask" | "deny"
  message?: string
}

interface ToolBeforeEvent {
  readonly tool: string
  readonly sessionID: string
  input: Record<string, unknown>
}

interface ToolAfterEvent {
  readonly tool: string
  readonly sessionID: string
  readonly status: "completed" | "error"
  readonly result?: { content?: unknown; metadata?: Record<string, unknown> }
  readonly error?: { message?: string; type?: string }
}

interface V2EventLike {
  readonly type: string
  readonly data?: Record<string, unknown>
}

interface SessionInfoLike {
  agent?: string
  model?: { providerID: string; id: string; variant?: string }
}

export interface SmartRouterContext {
  readonly location: { readonly directory: string }
  session: {
    get(input: { sessionID: string }): Promise<SessionInfoLike>
    hook(name: "prompt", callback: (event: PromptEvent) => void | Promise<void>): Promise<Registration>
    hook(name: "context", callback: (event: ContextEvent) => void | Promise<void>): Promise<Registration>
  }
  permission: {
    hook(name: "evaluate", callback: (event: PermissionEvent) => void | Promise<void>): Promise<Registration>
  }
  tool: {
    hook(name: "execute.before", callback: (event: ToolBeforeEvent) => void | Promise<void>): Promise<Registration>
    hook(name: "execute.after", callback: (event: ToolAfterEvent) => void | Promise<void>): Promise<Registration>
  }
  event: {
    subscribe(options: { signal: AbortSignal }): AsyncIterable<V2EventLike>
  }
}

// -------- helpers --------

function variantEffort(model: ReturnType<typeof findModel>, variant: string | undefined, order: string[]): string | null {
  if (!variant) return null
  const match = model?.variants.find((v) => v.name === variant)
  if (match?.effort) return match.effort
  return effortRank(variant, order) === Number.MAX_SAFE_INTEGER ? null : variant
}

function resultText(content: unknown): string {
  if (!Array.isArray(content)) return ""
  return content
    .map((part) => {
      if (!part || typeof part !== "object") return ""
      const p = part as { type?: unknown; text?: unknown }
      return p.type === "text" && typeof p.text === "string" ? p.text : ""
    })
    .join("\n")
}

/** Translate v2 events into the v1-shaped events the V2.2 observational host understands. */
function adaptForHost(type: string, data: Record<string, unknown>): { type: string; properties: Record<string, unknown> } | null {
  if (type === "session.text.delta" || type === "session.reasoning.delta") {
    return { type: "message.part.updated", properties: { part: { sessionID: data.sessionID } } }
  }
  if (type === "session.step.ended") {
    return {
      type: "message.updated",
      properties: {
        info: {
          role: "assistant",
          sessionID: data.sessionID,
          time: { completed: Date.now() },
          tokens: data.tokens,
          cost: data.cost,
        },
      },
    }
  }
  if (type === "session.step.failed" || type === "session.execution.failed") {
    const err = data.error as { type?: string; message?: string; status?: number } | undefined
    return {
      type: "session.error",
      properties: {
        sessionID: data.sessionID,
        error: { name: err?.type, message: err?.message, data: { statusCode: err?.status, message: err?.message } },
      },
    }
  }
  if (type === "session.idle") {
    return { type: "session.idle", properties: { sessionID: data.sessionID } }
  }
  return null
}

export const SmartRouterPlugin = async (ctx: SmartRouterContext): Promise<() => void> => {
  const projectRoot = ctx.location.directory
  const cfg = loadConfig(projectRoot)
  let registry: ReturnType<typeof buildRegistry> | null = null
  try {
    registry = buildRegistry()
  } catch {}

  // WS-C: the session's selected agent is threaded through session state so permission
  // decisions can distinguish agents. Missing session -> "build" (previous hardcoded
  // behavior); this can only tighten decisions (read-only force), never weaken.
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

  // Task class decided at prompt admission, consumed by the per-request context hook
  // (v2 context events carry no prompt text).
  const taskClassBySession = new Map<string, string | null>()

  try {
    writeStatus(projectRoot, { startedAt: new Date().toISOString() })
  } catch {}

  // V2.2 flags default OFF (fail-safe). OFF ⇒ createHostV22 is never constructed ⇒ zero
  // V2.2 activity. SHADOW ⇒ T1–T5 telemetry + shadow computation, all fail-open.
  const v22flags = loadFlags(projectRoot)
  const v22 = v22flags.mode === "OFF" ? null : createHostV22(projectRoot, { registry, mode: v22flags.mode })

  // V2.2 ISR is unavailable on v2 (see header). Never construct it; report a requested mode.
  const isrFlags = loadIsrFlags(projectRoot)
  if (isrFlags.mode !== "off") {
    appendJsonl(projectRoot, LOG.smartRouterLog, {
      timestamp: new Date().toISOString(),
      kind: "isr-unavailable-v2",
      requestedMode: isrFlags.mode,
      note: "ISR needs a verified whole-loop abort + model-bound replay; v2 exposes neither",
    })
  }

  appendJsonl(projectRoot, LOG.smartRouterLog, {
    timestamp: new Date().toISOString(),
    kind: "plugin-loaded",
    runtime: "opencode-v2",
    mode: cfg.mode,
    permissionMode: cfg.permissionMode,
    registryModels: registry?.models.length ?? 0,
  })

  // -------- prompt admission: classification + advisory metadata + state (#61)
  await ctx.session.hook("prompt", async (event) => {
    try {
      if (cfg.mode === "off") return
      const text = String(event.prompt?.text ?? "")
      if (!text.trim()) return

      // v2 prompt events carry no agent/model; read the session's current selection.
      let agent = "build"
      let liveModel: string | null = null
      let liveVariant: string | null = null
      try {
        const session = await ctx.session.get({ sessionID: event.sessionID })
        if (typeof session.agent === "string" && session.agent) agent = session.agent
        if (session.model) {
          liveModel = `${session.model.providerID}/${session.model.id}`
          liveVariant = session.model.variant ?? null
        }
      } catch {}

      const route = resolveRoute(projectRoot, {
        prompt: text,
        sessionId: event.sessionID,
        overrides: { taskType: undefined },
      })

      taskClassBySession.set(event.sessionID, route.decision.input.matched_task_class)

      recordRoute(
        projectRoot,
        event.sessionID,
        // qualified "provider/model" id: this is the live dispatch target and the breaker attribution key
        { model: liveModel, variant: liveVariant, agent },
        { routed: { model: route.decision.model, variant: route.decision.variant, agent: route.decision.agent }, status: route.decision.status },
      )

      // mismatch advisory: the live model differs from the routing recommendation
      if (liveModel && route.decision.model && liveModel !== route.decision.model) {
        appendJsonl(projectRoot, LOG.smartRouterLog, {
          timestamp: new Date().toISOString(),
          kind: "advisory-mismatch",
          sessionId: event.sessionID,
          live: { model: liveModel, variant: liveVariant, agent },
          recommended: { model: route.decision.model, variant: route.decision.variant, agent: route.decision.agent },
          note: "advisory only — /auto dispatch reroutes on the next request (no in-flight model mutation)",
        })
      }

      // V2.2 (additive, observational): t0 + attribution + shadow computation. Cannot mutate
      // the route — the prompt hook returns no routing control to the host.
      v22?.onChatMessage({
        sessionId: event.sessionID,
        agent,
        liveModel,
        liveVariant,
        route,
        ts: Date.now(),
      })
    } catch {}
  })

  // -------- model request: hard-ceiling enforcement (#62). Never escalates; only clamps invalid effort.
  // Task-effort matrix (2026-09-03): routine tasks are downgraded to effort 'high'.
  // v2 `options` starts empty per model call, so the current effort comes from the model variant.
  await ctx.session.hook("context", (event) => {
    try {
      if (cfg.mode === "off") return
      // V2.2 (additive, observational): t1 = provider dispatch moment
      v22?.onChatParams(event.sessionID)

      const modelId = `${event.model.providerID}/${event.model.id}`
      const opts = event.options
      let currentEffort = registry ? variantEffort(findModel(registry, modelId), event.model.variant, registry.effortRankOrder) : null

      // live firing evidence (WS-B): every invocation is recorded, not just clamps
      appendJsonl(projectRoot, LOG.smartRouterLog, {
        timestamp: new Date().toISOString(),
        kind: "chat.params-invoke",
        sessionId: event.sessionID ?? null,
        agent: event.agent ?? null,
        model: modelId,
        hasOptions: true,
        effortKey: "reasoningEffort",
        requestedEffort: currentEffort,
      })

      const m = registry ? findModel(registry, modelId) : undefined
      if (!m || !currentEffort) return

      // stage-1 classification of THIS prompt decides the effort tier (downgrade-only)
      const taskClass = taskClassBySession.get(event.sessionID) ?? null
      const taskEffort = effortForTaskClass(taskClass)
      if (taskEffort && currentEffort !== taskEffort && !m.rejectedEfforts.includes(taskEffort)) {
        opts.reasoningEffort = taskEffort
        appendJsonl(projectRoot, LOG.smartRouterLog, {
          timestamp: new Date().toISOString(),
          kind: "effort-task-downgrade",
          sessionId: event.sessionID ?? null,
          model: modelId,
          taskClass,
          from: currentEffort,
          to: taskEffort,
        })
        currentEffort = taskEffort
      }

      const banned = m.rejectedEfforts.includes(currentEffort)
      const overCeiling = m.maxVerifiedEffort ? effortRank(currentEffort, registry?.effortRankOrder) > effortRank(m.maxVerifiedEffort, registry?.effortRankOrder) : false
      const blockedVariant = m.variants.find((v) => v.effort === currentEffort && v.status === "BLOCKED_UPSTREAM")
      if (!banned && !overCeiling && !blockedVariant) return

      // clamp target: verified max; else self high; else highest verified
      const verified = m.variants.filter((v) => v.status === "VERIFIED")
      const target =
        verified.find((v) => v.name === "max") ??
        verified.find((v) => v.effort === m.maxVerifiedEffort) ??
        verified.find((v) => v.name === "high") ??
        verified.at(-1)
      if (!target) return

      opts.reasoningEffort = target.effort ?? target.name
      appendJsonl(projectRoot, LOG.smartRouterLog, {
        timestamp: new Date().toISOString(),
        kind: "effort-clamp",
        model: modelId,
        from: currentEffort,
        to: opts.reasoningEffort,
        reason: banned ? "effort rejected by backend" : blockedVariant ? "effort TEMPORARILY BLOCKED upstream" : "effort above verified ceiling",
      })
    } catch {}
  })

  // -------- permission evaluation: the Permission Router (#13)
  await ctx.permission.hook("evaluate", (event) => {
    try {
      if (cfg.mode === "off") return
      const tool = V2_ACTION_TOOL[String(event.action).toLowerCase()]
      if (!tool) return // action this router has no policy for — leave to the runtime
      const policy = loadPermissionPolicy(projectRoot)
      const pattern = event.resources.map(String).join(" ")
      const agent = sessionAgentOf(event.sessionID)
      const perm = resolvePermission(policy, {
        agent, // threaded from the prompt hook (session state); missing -> "build"
        tool,
        operation: pattern,
        mode: cfg.permissionMode,
        environment: detectEnvironment(),
      })
      event.effect = perm.decision
      if (perm.decision === "deny") event.message = `${perm.reason} (rule: ${perm.matchedRule ?? "none"})`
      appendJsonl(projectRoot, LOG.permissions, {
        timestamp: new Date().toISOString(),
        sessionId: event.sessionID,
        agent,
        agentSource: "session-threaded",
        permissionAction: event.action,
        permissionType: tool,
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
  })

  // -------- hard-deny guard; runs even when a permission prompt was pre-approved
  await ctx.tool.hook("execute.before", async (event) => {
    try {
      if (cfg.mode === "off") return
      const tool = String(event.tool ?? "").toLowerCase()
      if (tool !== "bash" && tool !== "shell") return
      const cmd = typeof event.input?.command === "string" ? event.input.command : ""
      if (!cmd.trim()) return
      const policy = loadPermissionPolicy(projectRoot)
      const agent = sessionAgentOf(event.sessionID)
      const decision = resolvePermission(policy, { agent, tool, operation: cmd, mode: cfg.permissionMode, environment: detectEnvironment() })
      if (decision.decision === "deny") {
        appendJsonl(projectRoot, LOG.permissions, { timestamp: new Date().toISOString(), guard: "execute.before", agent, sessionId: event.sessionID, decision: "deny", rule: decision.matchedRule, reason: decision.reason, operationPreview: cmd.slice(0, 120) })
        throw new Error(`SMART-ROUTER HARD DENY [${decision.matchedRule}]: ${decision.reason}`)
      }
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("SMART-ROUTER HARD DENY")) throw e
      // non-deny failures are swallowed: the guard must not break normal execution
    }
  })

  // -------- tool completion: evaluator signals
  await ctx.tool.hook("execute.after", (event) => {
    try {
      const tool = String(event.tool ?? "")
      if (event.status === "error") {
        SIGNALS.toolErrors.push(tool)
        if (SIGNALS.toolErrors.length > 50) SIGNALS.toolErrors.shift()
        if (tool.toLowerCase() === "shell" && /tests?\s+failed|failing/i.test(String(event.error?.message ?? "").slice(0, 2000))) SIGNALS.testFailures += 1
        return
      }
      const meta = event.result?.metadata ?? {}
      const out = resultText(event.result?.content)
      if (meta.error || /error|failed|exception/i.test(out.slice(0, 400))) {
        SIGNALS.toolErrors.push(tool)
        if (SIGNALS.toolErrors.length > 50) SIGNALS.toolErrors.shift()
        if (tool.toLowerCase() === "shell" && /tests?\s+failed|failing/i.test(out.slice(0, 2000))) SIGNALS.testFailures += 1
      } else if (tool.toLowerCase() === "shell") {
        breakerSuccess(join(projectRoot), sessionBreakerKey(event.sessionID))
      }
    } catch {}
  })

  // -------- events: provider/session observation (#63) — observation, not control
  const controller = new AbortController()

  void (async () => {
    try {
      for await (const event of ctx.event.subscribe({ signal: controller.signal })) {
        try {
          const type = String(event?.type ?? "")
          const data = event?.data ?? {}

          // V2.2 (additive, observational): translate to the host's v1-shaped vocabulary.
          const adapted = adaptForHost(type, data)
          if (adapted) v22?.onEvent(adapted)

          // TEMP-DIAG: log the v2 event vocabulary seen by the plugin hook
          if (
            type === "session.step.started" ||
            type === "session.step.ended" ||
            type === "session.step.failed" ||
            type === "session.execution.failed" ||
            type === "session.idle" ||
            type === "session.status" ||
            type === "session.model.selected"
          ) {
            const model = data.model as { providerID?: string; id?: string; variant?: string } | undefined
            appendJsonl(projectRoot, LOG.smartRouterLog, {
              timestamp: new Date().toISOString(),
              kind: "isr-diag-event",
              type,
              sessionId: String(data.sessionID ?? ""),
              finish: data.finish ?? null,
              status: data.status ? JSON.stringify(data.status) : null,
              model: model?.providerID && model?.id ? `${model.providerID}/${model.id}` : null,
              variant: model?.variant ?? null,
            })
          }

          if (type === "session.execution.failed" || type === "session.step.failed") {
            const err = data.error as { type?: string; message?: string } | undefined
            const text = String(err?.message ?? err?.type ?? "")
            SIGNALS.exceptions.push(text.slice(0, 200))
            // closed-loop attribution: open the circuit for the session's live model (per-model)
            const key = sessionBreakerKey(typeof data.sessionID === "string" ? data.sessionID : null)
            breakerFailure(join(projectRoot), key, text)
            appendJsonl(projectRoot, LOG.smartRouterLog, {
              timestamp: new Date().toISOString(),
              kind: "breaker-failure-recorded",
              sessionId: data.sessionID ?? null,
              breakerKey: key,
              error: text.slice(0, 200),
            })
          }

          if (type === "permission.asked") {
            appendJsonl(projectRoot, LOG.permissions, { timestamp: new Date().toISOString(), observed: "permission.asked", permissionAction: data.action ?? null })
          }
        } catch {}
      }
    } catch {}
  })()

  // v2 cleanup replaces v1 `dispose`.
  return () => {
    controller.abort()
    try {
      const result = evaluate(SIGNALS)
      appendJsonl(projectRoot, LOG.smartRouterLog, { timestamp: new Date().toISOString(), kind: "dispose-evaluation", quality: result.quality, action: result.action, reasons: result.reasons })
      // V2.2 (additive, observational): T1 evaluation attribution (+ T3 window fallback)
      v22?.onDispose(result)
    } catch {}
  }
}

export default {
  id: "smart-router",
  setup: SmartRouterPlugin,
}
