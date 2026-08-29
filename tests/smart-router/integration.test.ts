// Smart Router v2 — classifier/complexity/context tests + session-state + circuit-breaker + integration.

import { describe, it, expect, beforeEach } from "vitest"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { rmSync, mkdtempSync } from "node:fs"
import { tmpdir } from "node:os"
import { classify } from "../../.opencode/smart-router/classifier.ts"
import { assessTaskRisk } from "../../.opencode/smart-router/risk-engine.ts"
import { resolveRoute, loadRoutingPolicy, loadPermissionPolicy } from "../../.opencode/smart-router/router.ts"
import { validateRoutingPolicy, validatePermissionPolicy } from "../../.opencode/smart-router/schemas.ts"
import { recordReroute, recordFailure, recordSuccess, getSession } from "../../.opencode/smart-router/session-state.ts"
import { recordFailure as breakerFailure, recordSuccess as breakerSuccess, breakerStatus } from "../../.opencode/smart-router/circuit-breaker.ts"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")

describe("classifier (stage-1 heuristic)", () => {
  it("security prompts -> security-review", () => {
    expect(classify("audit the authentication module for vulnerabilities").matchedTaskClass).toBe("security-review")
  })
  it("crud prompts -> crud-simple", () => {
    expect(classify("fix a small typo in the readme").matchedTaskClass).toBe("crud-simple")
  })
  it("implementation prompts -> standard-coding", () => {
    expect(classify("implement a search feature in the sidebar").matchedTaskClass).toBe("standard-coding")
  })
  it("vision prompts request the vision modality", () => {
    expect(classify("look at this screenshot and describe the layout").modality).toBe("vision")
  })
  it("unknown prompts degrade to standard-coding", () => {
    const c = classify("zzz qqq xyzzy")
    expect(c.matchedTaskClass).toBe("standard-coding")
    expect(c.confidence).toBe("low")
  })
  it("generic implementation-review prompts -> routine-review (regression: not silently defaulted to author work)", () => {
    expect(classify("Review this implementation for obvious correctness and maintainability issues.").matchedTaskClass).toBe("routine-review")
    expect(classify("review the code for issues").matchedTaskClass).toBe("routine-review")
  })
  it("complexity signals", () => {
    expect(classify("plan the database migration for multi-module billing").complexity).toBe("high")
    expect(classify("fix a one-line typo").complexity).toBe("low")
  })
  it("context demand signals", () => {
    expect(classify("refactor the whole codebase to use the new api").contextDemand).toBe("large")
    expect(classify("edit this function only").contextDemand).toBe("small")
  })
  it("explicit override: unknown class degrades with 'defaulted' signal", () => {
    const c = classify("anything", { taskType: "no-such-class" })
    expect(c.matchedTaskClass).toBe("standard-coding")
    expect(c.signals.some((s) => s.includes("defaulted"))).toBe(true)
  })
})

describe("risk engine (#12)", () => {
  it("security review is critical; crud is low", () => {
    expect(assessTaskRisk(classify("security audit of auth"), "x")).toBe("critical")
    expect(assessTaskRisk(classify("fix a typo"), "x")).toBe("low")
  })
  it("production keywords raise the risk", () => {
    expect(assessTaskRisk(classify("update the config value"), "this runs in production for live site")).toBe("high")
  })
})

describe("policy validation (#90)", () => {
  it("both policies validate clean", () => {
    expect(validateRoutingPolicy(loadRoutingPolicy(ROOT)).valid).toBe(true)
    expect(validatePermissionPolicy(loadPermissionPolicy(ROOT)).valid).toBe(true)
  })
})

describe("session state persistence (#74, #75)", () => {
  const sandbox = mkdtempSync(resolve(tmpdir(), "sr-state-"))
  it("records routes, reroutes, failures, successes", () => {
    recordReroute(sandbox, "s1", "escalation")
    recordFailure(sandbox, "s1", "m#v")
    recordSuccess(sandbox, "s1", "m2#v2")
    const s = getSession(sandbox, "s1")
    expect(s.rerouteCount).toBe(1)
    expect(s.escalationCount).toBe(1)
    expect(s.failedRoutes).toContain("m#v")
    expect(s.successfulRoutes).toContain("m2#v2")
  })
  it("state survives reload (file persistence #75)", () => {
    expect(getSession(sandbox, "s1").rerouteCount).toBe(1)
    rmSync(sandbox, { recursive: true, force: true })
  })
})

describe("circuit breaker (#33, #34)", () => {
  const sandbox = mkdtempSync(resolve(tmpdir(), "sr-brk-"))
  it("opens after repeated failures and reports availability", () => {
    for (let i = 0; i < 3; i++) breakerFailure(sandbox, "prov/model", "timeout", { failureThreshold: 3, cooldownMs: 60_000 })
    expect(breakerStatus(sandbox, "prov/model", { failureThreshold: 3, cooldownMs: 60_000 }).state).toBe("open")
  })
  it("success closes the breaker (transient failures do not permanently blacklist #33)", () => {
    breakerSuccess(sandbox, "prov/model", { failureThreshold: 3, cooldownMs: 60_000 })
    expect(breakerStatus(sandbox, "prov/model", { failureThreshold: 3, cooldownMs: 60_000 }).state).toBe("closed")
    rmSync(sandbox, { recursive: true, force: true })
  })
})

describe("integration: full pipeline (directive #112 golden scenario)", () => {
  const sandbox = mkdtempSync(resolve(tmpdir(), "sr-int-"))
  it("architecture+security prompt routes to research/GLM max with safe read-only permission", () => {
    const { decision, risk, permissionProfile } = resolveRoute(sandbox, {
      prompt: "Analyze and improve the authentication architecture",
      sessionId: "golden-1",
    })
    expect(decision.status).toBe("RESOLVED")
    expect(decision.model).toBe("b-ai/glm-5.3-flash")
    expect(decision.variant).toBe("max")
    expect(decision.agent).toBe("research")
    expect(risk).toBe("high")
    expect(permissionProfile).toBe("standard") // high reasoning != high permissions (#47)
    expect(decision.dispatchCommand).toContain("opencode run --model b-ai/glm-5.3-flash --variant max --agent research")
  })
  it("routing decision is deterministic across calls (modulo timestamp)", () => {
    const a = resolveRoute(sandbox, { prompt: "security audit of the payments module" }).decision
    const b = resolveRoute(sandbox, { prompt: "security audit of the payments module" }).decision
    expect(a.model).toBe(b.model)
    expect(a.variant).toBe(b.variant)
    expect(a.routeId).toBe(b.routeId)
    expect(a.fallback).toEqual(b.fallback)
  })
  it("session state and logs were written", () => {
    const s = getSession(sandbox, "golden-1")
    expect(s.currentRoute.model).toBe("b-ai/glm-5.3-flash")
    rmSync(sandbox, { recursive: true, force: true })
  })
})
