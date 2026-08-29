// Smart Router v2 — Permission Decision Engine (directive #13–#23, #46–#53).
// Pure function: (agent, tool, operation, mode, environment, policy) -> ALLOW/ASK/DENY + reason.
// Precedence: HARD DENY > read-only agent force > confirmation gates > profile rules > default ASK.

import type { PermissionDecision, RiskLevel } from "./types.ts"
import type { PermissionMode } from "./config.ts"

export interface PermissionPolicy {
  version: string
  profiles: Record<string, { description: string; allow: string[]; ask: string[]; deny: string[] }>
  agent_policy: Record<string, { default_profile: string; force_read_only?: boolean }>
  environment_policy: Record<string, string>
  production_indicators: { env?: string[]; branch?: string[]; path?: string[] }
  operation_classes: Record<string, string[]>
  hard_denies: { description: string; patterns: Array<{ id: string; pattern: string; reason: string }> }
  confirmation_gates: { description: string; patterns: Array<{ id: string; pattern: string; reason: string }> }
  tool_class_map: Record<string, string>
}

export interface PermissionInput {
  agent: string
  tool: string
  operation: string // e.g. bash command line, or file path for write/edit tools
  mode: PermissionMode
  environment?: "local" | "staging" | "production"
  env?: Record<string, string | undefined>
}

const COMPILED = new WeakMap<PermissionPolicy, { deny: Array<{ id: string; re: RegExp; reason: string }>; gates: Array<{ id: string; re: RegExp; reason: string }>; classes: Record<string, RegExp[]> }>()

function compile(policy: PermissionPolicy) {
  let c = COMPILED.get(policy)
  if (c) return c
  c = {
    deny: policy.hard_denies.patterns.map((p) => ({ id: p.id, re: new RegExp(p.pattern, "i"), reason: p.reason })),
    gates: policy.confirmation_gates.patterns.map((p) => ({ id: p.id, re: new RegExp(p.pattern, "i"), reason: p.reason })),
    classes: Object.fromEntries(Object.entries(policy.operation_classes).map(([k, pats]) => [k, pats.map((p) => new RegExp(p, "i"))])),
  }
  COMPILED.set(policy, c)
  return c
}

export function detectEnvironment(env: Record<string, string | undefined> = process.env): "local" | "staging" | "production" {
  for (const key of ["NODE_ENV", "VERCEL_ENV", "OPENCODE_ENV"]) {
    const v = env[key]
    if (v === "production") return "production"
    if (v === "staging") return "staging"
  }
  return "local"
}

export function classifyOperation(policy: PermissionPolicy, operation: string): { toolClass: string; matchedClass: string | null } {
  const c = compile(policy)
  for (const [cls, res] of Object.entries(c.classes)) {
    if (res.some((re) => re.test(operation))) return { toolClass: "execute", matchedClass: cls }
  }
  return { toolClass: "execute", matchedClass: null }
}

export function profileForAgent(policy: PermissionPolicy, agent: string, mode: PermissionMode): { profile: string; readOnly: boolean } {
  const ap = policy.agent_policy[agent]
  const profile = mode ?? (ap?.default_profile as PermissionMode) ?? "standard"
  const readOnly = !!ap?.force_read_only && mode !== "yolo" ? true : !!ap?.force_read_only && mode === "yolo" ? true : false
  // force_read_only holds even under YOLO: reviewer/research must never silently become implementers (#17)
  return { profile, readOnly: !!ap?.force_read_only }
}

export function resolvePermission(policy: PermissionPolicy, input: PermissionInput): PermissionDecision {
  const op = String(input.operation ?? "")
  // tool class comes from the declared tool for non-shell tools (edit/write/webfetch/...),
  // and from command classification for bash/shell
  const toolClass = policy.tool_class_map[String(input.tool).toLowerCase()] ?? "execute"
  const isShell = toolClass === "execute"
  const { matchedClass } = isShell ? classifyOperation(policy, op) : { matchedClass: null }
  const base: PermissionDecision = { decision: "ask", reason: "no rule matched; default is ASK", profile: input.mode, risk: "medium", toolClass, matchedRule: matchedClass }

  // 1. HARD DENY — outranks everything including YOLO (#16)
  const c = compile(policy)
  for (const d of c.deny) {
    if (d.re.test(op)) {
      return { decision: "deny", reason: `HARD DENY (${d.id}): ${d.reason}`, profile: input.mode, risk: "critical", toolClass, matchedRule: d.id }
    }
  }

  // 2. read-only agent force (#17): research/reviewer never mutate
  const { readOnly } = profileForAgent(policy, input.agent, input.mode)
  if (readOnly && toolClass !== "read") {
    const isReadonlyBash = matchedClass === "read" || matchedClass === "build"
    if (!(toolClass === "execute" && isReadonlyBash)) {
      return { decision: "deny", reason: `agent '${input.agent}' is read-only (#17); ${input.tool} mutation denied`, profile: input.mode, risk: "medium", toolClass, matchedRule: "agent-readonly" }
    }
  }

  // 3. environment escalation (#52, #53): production tightens, never loosens
  const env = input.environment ?? detectEnvironment()
  const envProfile = (policy.environment_policy[env] ?? policy.environment_policy.default) as PermissionMode
  const requested = input.mode
  const effectiveMode: PermissionMode = env === "production" ? (requested === "yolo" ? "safe" : requested === "elevated" ? "standard" : (envProfile as PermissionMode)) : requested

  // 4. confirmation gates — ASK even under YOLO (#15); only ELEVATED/YOLO lift the install gate
  for (const g of c.gates) {
    if (g.re.test(op)) {
      if (g.id === "install" && (effectiveMode === "elevated" || effectiveMode === "yolo")) continue // package installation allowed at ELEVATED/YOLO per matrix
      return { decision: "ask", reason: `confirmation gate '${g.id}': ${g.reason}`, profile: effectiveMode, risk: "high", toolClass, matchedRule: g.id }
    }
  }

  // 5. profile rules
  // NOTE: "execute:*" entries grant SHELL execution only — they must never imply file-write (#47).
  const profileDef = policy.profiles[effectiveMode] ?? policy.profiles.standard
  const allowsWrite = profileDef.allow.includes("write")
  if (toolClass === "read") return { decision: "allow", reason: `read tool allowed in '${effectiveMode}'`, profile: effectiveMode, risk: "low", toolClass, matchedRule: matchedClass }
  if (toolClass === "write") {
    if (!allowsWrite) return { decision: "ask", reason: `write not allowed by '${effectiveMode}' profile`, profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
    return { decision: "allow", reason: `file edit allowed in '${effectiveMode}'`, profile: effectiveMode, risk: "low", toolClass, matchedRule: matchedClass }
  }
  if (toolClass === "execute") {
    if (matchedClass === "read" || matchedClass === "build") {
      const ok = profileDef.allow.some((a) => a === "execute:read-only" || a === "execute:build")
      return ok
        ? { decision: "allow", reason: `safe shell allowed in '${effectiveMode}'`, profile: effectiveMode, risk: "low", toolClass, matchedRule: matchedClass }
        : { decision: "ask", reason: `shell not in '${effectiveMode}' allow list`, profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
    }
    if (matchedClass === "install") {
      const ok = profileDef.allow.includes("execute:install")
      return ok
        ? { decision: "allow", reason: "package installation allowed at ELEVATED/YOLO (#15)", profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
        : { decision: "ask", reason: "package installation requires confirmation (#15)", profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
    }
    if (matchedClass === "git-commit") {
      const ok = profileDef.allow.includes("git:commit")
      return ok
        ? { decision: "allow", reason: "git commit policy-controlled ALLOW under YOLO (#15)", profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
        : { decision: "ask", reason: "git commit requires confirmation (#15)", profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
    }
    if (matchedClass === "git-mutate" || matchedClass === "git-read") {
      const isRead = matchedClass === "git-read"
      const ok = profileDef.allow.includes(isRead ? "git:read" : "git:mutate:local")
      return ok
        ? { decision: "allow", reason: `git ${isRead ? "read" : "local mutate"} allowed in '${effectiveMode}'`, profile: effectiveMode, risk: isRead ? "low" : "medium", toolClass, matchedRule: matchedClass }
        : { decision: "ask", reason: `git ${isRead ? "read" : "mutation"} not in '${effectiveMode}' allow list`, profile: effectiveMode, risk: "medium", toolClass, matchedRule: matchedClass }
    }
    if (matchedClass === "network-read") {
      return { decision: "allow", reason: "read-only network fetch", profile: effectiveMode, risk: "low", toolClass, matchedRule: matchedClass }
    }
    return base
  }
  if (toolClass === "network") {
    // webfetch-style read-only HTTP fetch is distinct from external mutation (#51)
    return { decision: "allow", reason: "read-only network fetch allowed", profile: effectiveMode, risk: "low", toolClass, matchedRule: null }
  }
  return base
}
