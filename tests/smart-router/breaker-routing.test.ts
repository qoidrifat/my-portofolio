// Smart Router v2.1 — closed-loop breaker→routing integration tests (Workstream A).
// Eligibility contract: open → excluded BEFORE selection; half_open → probe permitted;
// closed/unknown → eligible; dynamic fallback; all-open → BLOCK; per-model attribution.

import { describe, it, expect, beforeEach, afterEach } from "vitest"
import { mkdtempSync, rmSync, existsSync, readFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { buildRegistry } from "../../.opencode/smart-router/capability.ts"
import { resolveModelRoute } from "../../.opencode/smart-router/model-router.ts"
import { nextEscalationRoute, validateLadderStep } from "../../.opencode/smart-router/escalation.ts"
import { recordFailure, recordSuccess, breakerStatus } from "../../.opencode/smart-router/circuit-breaker.ts"
import { resolveRoute } from "../../.opencode/smart-router/router.ts"
import type { RoutingPolicy } from "../../.opencode/smart-router/agent-router.ts"

const PROJECT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const registry = buildRegistry()
const policy = JSON.parse(readFileSync(join(PROJECT, ".opencode/smart-router/routing-policy.json"), "utf8")) as RoutingPolicy

const GLM = "b-ai/glm-5.3-flash"
const DEEPSEEK = "b-ai/deepseek-v4-flash"
const QWEN = "b-ai/qwen3.8-flash"
const M3 = "minimaxm3new/MiniMaxAI/MiniMax-M3"
const M3FREE = "open-router/minimax/minimax-m3:free"

const BREAKER = { failureThreshold: 3, cooldownMs: 60_000 }
const SECURITY_PROMPT = "Audit the authentication and authorization architecture for security weaknesses."

function route(cls: string, projectRoot?: string | null) {
  return resolveModelRoute(registry, policy, {
    matchedTaskClass: cls,
    complexity: "medium",
    modality: "text",
    latencyPreference: "normal",
    qualityPreference: "normal",
    modelOverride: null,
    variantOverride: null,
    projectRoot: projectRoot ?? null,
  })
}

function open(root: string, key: string, times = 3) {
  for (let i = 0; i < times; i++) recordFailure(root, key, `simulated failure ${i + 1}`, BREAKER)
}

describe("circuit breaker → routing eligibility (closed-loop)", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sr-v21-brk-"))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("closed (no entry = UNKNOWN) → candidate eligible, primary unchanged", () => {
    const r = route("security-review", root)
    expect(r.status).toBe("RESOLVED")
    expect(r.model).toBe(GLM)
    expect(r.variant).toBe("max")
    expect(r.excluded).toEqual([])
  })

  it("open → candidate excluded BEFORE selection; fallback dynamically promoted", () => {
    open(root, GLM)
    const r = route("security-review", root)
    expect(r.status).toBe("RESOLVED")
    expect(r.model).toBe(DEEPSEEK)
    expect(r.excluded).toEqual([{ model: GLM, provider: "b-ai", breakerState: "open", reason: "circuit-open" }])
    expect(r.warnings.some((w) => w.includes("circuit-open") && w.includes(GLM))).toBe(true)
  })

  it("primary + first fallback open → next available candidate selected", () => {
    open(root, GLM)
    open(root, DEEPSEEK)
    const r = route("security-review", root)
    expect(r.model).toBe(QWEN)
    expect(r.excluded.map((e) => e.model)).toEqual([GLM, DEEPSEEK])
  })

  it("all candidates open → BLOCK, no selection of known-unavailable candidate", () => {
    open(root, GLM)
    open(root, DEEPSEEK)
    open(root, QWEN)
    const r = route("security-review", root)
    expect(r.status).toBe("BLOCKED")
    expect(r.model).toBeNull()
    expect(r.excluded.map((e) => e.model)).toEqual(expect.arrayContaining([GLM, DEEPSEEK, QWEN]))
  })

  it("per-model attribution: one open circuit does not disable an unrelated model", () => {
    open(root, GLM)
    const coding = route("standard-coding", root)
    expect(coding.status).toBe("RESOLVED")
    expect(coding.model).toBe(M3FREE)
    const arch = route("architecture-analysis", root)
    expect(arch.model).toBe(QWEN) // architecture chain: glm → qwen; glm open → qwen
  })

  it("half_open = cooldown elapsed → probe permitted (available), then success → closed → eligible", async () => {
    const probeRoot = mkdtempSync(join(tmpdir(), "sr-v21-probe-"))
    try {
      // The cooldown has to outlive three file writes, not three in-memory calls.
      // At 30 ms the three recordFailure() calls occasionally ate the whole window
      // on CI, so the breaker was already half_open at the first assertion.
      const PROBE = { failureThreshold: 3, cooldownMs: 200 }
      recordFailure(probeRoot, GLM, "simulated failure 1", PROBE)
      recordFailure(probeRoot, GLM, "simulated failure 2", PROBE)
      recordFailure(probeRoot, GLM, "simulated failure 3", PROBE)
      expect(breakerStatus(probeRoot, GLM).state).toBe("open")
      await new Promise((r) => setTimeout(r, 250))
      expect(breakerStatus(probeRoot, GLM).state).toBe("half_open")
      const r = route("security-review", probeRoot)
      expect(r.model).toBe(GLM) // probe permitted
      recordSuccess(probeRoot, GLM)
      expect(breakerStatus(probeRoot, GLM).state).toBe("closed")
      expect(route("security-review", probeRoot).model).toBe(GLM)
    } finally {
      rmSync(probeRoot, { recursive: true, force: true })
    }
  })

  it("open circuit does not bypass security policy: permission profile independent of breaker state", () => {
    open(root, GLM)
    const { decision, permissionProfile } = resolveRoute(root, { prompt: SECURITY_PROMPT, sessionId: "brk-sec-1" })
    expect(decision.model).toBe(DEEPSEEK)
    expect(permissionProfile).toBe("standard")
    expect(decision.permission.hardDenies.length).toBeGreaterThan(0)
    expect(decision.agent).toBe("reviewer")
  })

  it("router-level integration: exclusion logged as reconstructable breaker-exclusion record", () => {
    open(root, GLM)
    resolveRoute(root, { prompt: SECURITY_PROMPT, sessionId: "brk-log-1" })
    const logPath = join(root, ".opencode", "ai", "routing", "routing-decisions.jsonl")
    expect(existsSync(logPath)).toBe(true)
    const records = readFileSync(logPath, "utf8").trim().split("\n").map((l) => JSON.parse(l))
    const exclusions = records.filter((r) => r.kind === "breaker-exclusion")
    expect(exclusions.length).toBeGreaterThan(0)
    const e = exclusions.at(-1) as Record<string, unknown>
    expect(e.model).toBe(GLM)
    expect(e.breakerState).toBe("open")
    expect(e.reason).toBe("circuit-open")
    expect(e.sessionId).toBe("brk-log-1")
    expect(typeof e.timestamp).toBe("string")
    expect(typeof e.routeId).toBe("string")
  })

  it("determinism: identical prompt + identical breaker state → identical routing fields", () => {
    const a = resolveRoute(root, { prompt: SECURITY_PROMPT, sessionId: "brk-det" })
    const b = resolveRoute(root, { prompt: SECURITY_PROMPT, sessionId: "brk-det" })
    for (const k of ["model", "variant", "agent", "status", "fallback"] as const) {
      expect(JSON.stringify(a.decision[k])).toBe(JSON.stringify(b.decision[k]))
    }
    expect(a.decision.routeId).toBe(b.decision.routeId)
  })
})

describe("circuit breaker → escalation eligibility", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "sr-v21-esc-"))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it("validateLadderStep: open circuit → step ineligible; closed → eligible", () => {
    expect(validateLadderStep(registry, { model: GLM, variant: "high" }, root)).toBe(true)
    open(root, GLM)
    expect(validateLadderStep(registry, { model: GLM, variant: "high" }, root)).toBe(false)
  })

  it("escalation skips breaker-open ladder steps (no selection of known-unavailable candidate)", () => {
    open(root, GLM)
    const decision = {
      model: M3,
      variant: "deep",
      fallback: [{ model: M3, variant: "balanced", status: "CONFIGURED" }],
    } as Parameters<typeof nextEscalationRoute>[0]
    const next = nextEscalationRoute(decision, registry, { failedRoutes: [], rerouteCount: 0, projectRoot: root })
    // ladder: M3#balanced -> M3#deep -> GLM#high -> GLM#max; both GLM steps breaker-open -> skipped;
    // ladder exhausted -> recorded fallback chain walks to the closed M3#balanced, never GLM
    expect(next.action).toBe("fallback")
    expect(next.route).toEqual({ model: M3, variant: "balanced" })
  })

  it("escalation reaches closed fallback chain entry when ladder is open", () => {
    open(root, GLM)
    const decision = {
      model: M3,
      variant: "deep",
      fallback: [{ model: DEEPSEEK, variant: "max", status: "VERIFIED" }],
    } as Parameters<typeof nextEscalationRoute>[0]
    const next = nextEscalationRoute(decision, registry, { failedRoutes: [], rerouteCount: 0, projectRoot: root })
    expect(next.action).toBe("fallback")
    expect(next.route).toEqual({ model: DEEPSEEK, variant: "max" })
  })
})
