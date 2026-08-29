// Smart Router v2 — CLI. Runs under Node >= 24 (native TS type-stripping) or Bun.
// Deterministic JSON output only; commands (/router*, /auto) consume this.
// Long prompts: pass --prompt-file <path> or pipe via stdin (Windows argv length limits, directive #59).

import { readFileSync, writeFileSync, mkdirSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { resolveRoute, loadRoutingPolicy, loadPermissionPolicy, buildContinuationPacket, writeContinuationPacket } from "./router.ts"
import { loadConfig, saveConfig, ROUTER_VERSION } from "./config.ts"
import { validateRoutingPolicy, validatePermissionPolicy } from "./schemas.ts"
import { buildRegistry } from "./capability.ts"
import { readJsonlTail, LOG } from "./logger.ts"
import { writeStatus } from "./status.ts"
import { getSession, loadState, recordReroute, recordFailure, recordRoute } from "./session-state.ts"
import { evaluate } from "./evaluator.ts"
import { nextEscalationRoute, MAX_REROUTES } from "./escalation.ts"
import { loadBreaker, resetBreaker, breakerStatus } from "./circuit-breaker.ts"

const __dirname = dirname(fileURLToPath(import.meta.url))
const PROJECT_ROOT = process.env.SMART_ROUTER_PROJECT_ROOT || join(__dirname, "..", "..")

function argValue(flag: string): string | null {
  const i = process.argv.indexOf(flag)
  return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : null
}

async function readPrompt(): Promise<string> {
  const file = argValue("--prompt-file")
  if (file) return readFileSync(file, "utf8")
  const inline = argValue("--prompt")
  if (inline) return inline
  if (!process.stdin.isTTY) {
    const chunks: Buffer[] = []
    for await (const c of process.stdin) chunks.push(c as Buffer)
    const s = Buffer.concat(chunks).toString("utf8").trim()
    if (s) return s
  }
  return ""
}

function out(obj: unknown) {
  process.stdout.write(JSON.stringify(obj, null, 2) + "\n")
}

async function main() {
  const cmd = process.argv[2] ?? "help"

  switch (cmd) {
    case "classify": {
      const prompt = await readPrompt()
      const { decision } = resolveRoute(PROJECT_ROOT, { prompt })
      out({ matched_task_class: decision.input.matched_task_class, taskType: decision.input.taskType, complexity: decision.input.complexity, modality: decision.input.modality, confidence: decision.input.confidence, signals: decision.warnings })
      break
    }
    case "route":
    case "explain": {
      const prompt = await readPrompt()
      const modelOverride = argValue("--model")
      const variantOverride = argValue("--variant")
      const { decision, risk, permissionProfile } = resolveRoute(PROJECT_ROOT, { prompt, sessionId: argValue("--session"), modelOverride, variantOverride })
      out(decision.status === "RESOLVED" ? { ...decision, risk, permissionProfile } : { ...decision, risk, permissionProfile })
      break
    }
    case "dispatch": {
      const prompt = await readPrompt()
      const { decision } = resolveRoute(PROJECT_ROOT, { prompt, sessionId: argValue("--session") })
      if (decision.status !== "RESOLVED") {
        out({ status: "BLOCKED", reason: decision.reason, warnings: decision.warnings })
        process.exitCode = 2
        break
      }
      const packet = buildContinuationPacket({
        task: decision.input.promptExcerpt,
        currentState: "fresh dispatch",
        completedWork: [],
        failedWork: [],
        relevantFiles: [],
        gitState: "unknown (pre-dispatch)",
        previousRoute: { model: null, variant: null, agent: decision.agent },
        newRoute: { model: decision.model, variant: decision.variant, agent: decision.agent },
        escalationReason: "initial routing",
        requiredNextAction: `run: ${decision.dispatchCommand}`,
      })
      const packetPath = writeContinuationPacket(PROJECT_ROOT, packet)
      out({ status: "DISPATCH", routeId: decision.routeId, agent: decision.agent, model: decision.model, variant: decision.variant, variantStatus: decision.variantStatus, permission: decision.permission, fallback: decision.fallback, dispatchCommand: decision.dispatchCommand, continuationPacket: packetPath, warnings: decision.warnings })
      break
    }
    case "matrix": {
      const policy = loadRoutingPolicy(PROJECT_ROOT)
      const registry = buildRegistry()
      out(
        policy.task_classes.map((t) => ({
          task: t.task_class,
          agent: t.agent,
          model: t.model,
          variant: t.variant,
          risk: t.risk ?? "medium",
          fallback: (t.chain ?? []).map((m) => {
            const reg = registry.models.find((x) => x.id === m)
            return `${m}${reg ? "" : " (unregistered)"}`
          }),
        })),
      )
      break
    }
    case "status": {
      writeStatus(PROJECT_ROOT)
      out(loadConfig(PROJECT_ROOT))
      break
    }
    case "history": {
      const n = Number(argValue("--limit") ?? 20)
      out(readJsonlTail(PROJECT_ROOT, LOG.routing, n))
      break
    }
    case "session": {
      const id = argValue("--session") ?? "last"
      out(getSession(PROJECT_ROOT, id))
      break
    }
    case "set-mode": {
      const v = argValue("--value") ?? ""
      if (!["auto", "advisory", "off"].includes(v)) {
        out({ error: "value must be auto|advisory|off" })
        process.exitCode = 1
        break
      }
      out(saveConfig(PROJECT_ROOT, { mode: v as "auto" | "advisory" | "off" }))
      break
    }
    case "set-permissions": {
      const v = argValue("--value") ?? ""
      if (!["safe", "standard", "elevated", "yolo"].includes(v)) {
        out({ error: "value must be safe|standard|elevated|yolo" })
        process.exitCode = 1
        break
      }
      const cfg = saveConfig(PROJECT_ROOT, { permissionMode: v as "safe" | "standard" | "elevated" | "yolo" })
      // YOLO status snapshot (directive #21)
      out({
        PermissionMode: cfg.permissionMode.toUpperCase(),
        HardDenies: "ACTIVE",
        GitGuard: "ACTIVE",
        SecretGuard: "ACTIVE",
      })
      break
    }
    case "escalate": {
      // controlled escalation: evaluate supplied signals, then produce the next route for the session (#113)
      const sessionId = argValue("--session") ?? "manual"
      const kind = argValue("--kind") ?? "review-blocker"
      const signals = {
        toolErrors: kind === "tool-error" ? ["bash"] : [],
        exceptions: kind === "exception" ? ["RuntimeError: simulated"] : [],
        testFailures: kind === "tests-failed" ? 3 : 0,
        reviewBlockers: kind === "review-blocker" ? ["SECURITY BLOCKER (simulated harness signal)"] : [],
        repeatedRetries: kind === "retries" ? 3 : 0,
        providerErrors: kind === "provider-failure" ? ["429", "timeout"] : [],
        contextIssues: [],
      }
      const evaluation = evaluate(signals)
      const state = loadState(PROJECT_ROOT)
      const session = state.sessions[sessionId] ?? getSession(PROJECT_ROOT, sessionId)
      const lastDecision = (session.lastDecision ?? {}) as { model?: string | null; variant?: string | null; agent?: string; fallback?: Array<{ model: string; variant: string }> }
      const pseudo = {
        model: lastDecision.model ?? null,
        variant: lastDecision.variant ?? null,
        agent: lastDecision.agent ?? "build",
        fallback: lastDecision.fallback ?? [],
      } as Parameters<typeof nextEscalationRoute>[0]
      // mark the current route as failed so the chain walks forward (no oscillation)
      if (pseudo.model) recordFailure(PROJECT_ROOT, sessionId, `${pseudo.model}#${pseudo.variant ?? "?"}`)
      const registry = buildRegistry()
      const next = nextEscalationRoute(pseudo, registry, { failedRoutes: session.failedRoutes, rerouteCount: session.rerouteCount, projectRoot: PROJECT_ROOT })
      if (next.route) {
        recordReroute(PROJECT_ROOT, sessionId, next.action === "fallback" ? "fallback" : "escalation")
        // advance the session's current route so the next escalation evaluates from the re-dispatched route
        recordRoute(
          PROJECT_ROOT,
          sessionId,
          { model: next.route.model, variant: next.route.variant, agent: pseudo.agent },
          { model: next.route.model, variant: next.route.variant, agent: pseudo.agent, fallback: pseudo.fallback },
        )
        const packet = buildContinuationPacket({
          task: `escalation for session ${sessionId}`,
          currentState: "previous route produced insufficient result",
          completedWork: [],
          failedWork: [`${pseudo.model ?? "?"}#${pseudo.variant ?? "?"} -> ${evaluation.reasons.join("; ")}`],
          relevantFiles: [],
          gitState: "unchanged",
          previousRoute: { model: pseudo.model, variant: pseudo.variant, agent: pseudo.agent },
          newRoute: { model: next.route.model, variant: next.route.variant, agent: pseudo.agent },
          escalationReason: next.reason,
          requiredNextAction: `re-dispatch with: opencode run --model ${next.route.model} --variant ${next.route.variant} --agent ${pseudo.agent}`,
        })
        const packetPath = writeContinuationPacket(PROJECT_ROOT, packet)
        out({ evaluation, next: { action: next.action, reason: next.reason, route: next.route }, rerouteCount: session.rerouteCount + 1, continuationPacket: packetPath, semantics: "automatic re-routing via continuation dispatch (NOT in-flight model mutation)" })
      } else {
        recordFailure(PROJECT_ROOT, sessionId, `${pseudo.model ?? "?"}#${pseudo.variant ?? "?"}`)
        out({ evaluation, next, blocked: true, maxReroutes: MAX_REROUTES })
        process.exitCode = 2
      }
      break
    }
    case "breaker": {
      const action = argValue("--action") ?? "status"
      const key = argValue("--key") ?? "session"
      if (action === "reset") out(resetBreaker(PROJECT_ROOT, key === "all" ? null : key))
      else out(breakerStatus(PROJECT_ROOT, key))
      break
    }
    case "health": {
      const registry = buildRegistry()
      const results = {
        version: ROUTER_VERSION,
        opencode: process.env.OPENCODE_VERSION || "1.18.25",
        registry: { models: registry.models.length, generatedFrom: registry.generatedFrom },
        policies: {
          routing: validateRoutingPolicy(loadRoutingPolicy(PROJECT_ROOT)),
          permission: validatePermissionPolicy(loadPermissionPolicy(PROJECT_ROOT)),
        },
        config: loadConfig(PROJECT_ROOT),
      }
      const path = join(PROJECT_ROOT, ".opencode", "ai", "verification", "smart-router-health.json")
      mkdirSync(dirname(path), { recursive: true })
      writeFileSync(path, JSON.stringify(results, null, 2) + "\n")
      out(results)
      break
    }
    case "permissions": {
      // show the effective permission view for a given agent (directive #41)
      const agent = argValue("--agent") ?? "build"
      const policy = loadPermissionPolicy(PROJECT_ROOT)
      const cfg = loadConfig(PROJECT_ROOT)
      const ap = policy.agent_policy[agent] ?? { default_profile: "standard" }
      const profile = policy.profiles[cfg.permissionMode] ?? policy.profiles.standard
      out({
        PERMISSION_MODE: cfg.permissionMode.toUpperCase(),
        agent,
        agentPolicy: ap,
        profile: cfg.permissionMode,
        profileDescription: profile.description,
        hardDenies: policy.hard_denies.patterns.map((p) => ({ id: p.id, reason: p.reason })),
        confirmationGates: policy.confirmation_gates.patterns.map((p) => p.id),
        environment: policy.environment_policy,
      })
      break
    }
    default:
      out({
        name: "smart-router",
        version: ROUTER_VERSION,
        commands: ["classify", "route|explain", "dispatch", "matrix", "status", "history", "session", "set-mode", "set-permissions", "escalate", "breaker", "health", "permissions"],
        notes: "prompt via --prompt, --prompt-file, or stdin",
      })
  }
}

main().catch((e) => {
  out({ error: String(e && e.stack ? e.stack : e) })
  process.exitCode = 1
})
