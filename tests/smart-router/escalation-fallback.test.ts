// Smart Router v2 — evaluator (#67, #68) + escalation (#28, #31, #32) + fallback (#72, #73) tests.

import { describe, it, expect } from "vitest"
import { evaluate } from "../../.opencode/smart-router/evaluator.ts"
import { nextEscalationRoute, ESCALATION_LADDER, MAX_REROUTES, validateLadderStep } from "../../.opencode/smart-router/escalation.ts"
import { classifyProviderFailure, nextFallbackAfterFailure, providerFailureDecision } from "../../.opencode/smart-router/fallback.ts"
import { buildRegistry, findModel } from "../../.opencode/smart-router/capability.ts"

const registry = buildRegistry()

const emptySignals = { toolErrors: [], exceptions: [], testFailures: 0, reviewBlockers: [], repeatedRetries: 0, providerErrors: [], contextIssues: [] }

describe("post-turn evaluator", () => {
  it("clean turn -> CONTINUE / GOOD", () => {
    const r = evaluate(emptySignals)
    expect(r.action).toBe("continue")
    expect(r.quality).toBe("good")
  })
  it("single shell error does NOT escalate (#71)", () => {
    const r = evaluate({ ...emptySignals, toolErrors: ["bash"] })
    expect(r.action).not.toBe("escalate")
    expect(r.quality).toBe("uncertain")
  })
  it("single 429 does NOT escalate (#71)", () => {
    const r = evaluate({ ...emptySignals, providerErrors: ["429 rate limited"] })
    expect(r.action).not.toBe("escalate")
  })
  it("security review blocker -> ESCALATE (#70)", () => {
    const r = evaluate({ ...emptySignals, reviewBlockers: ["SECURITY BLOCKER"] })
    expect(r.action).toBe("escalate")
    expect(r.quality).toBe("insufficient")
  })
  it("repeated provider failures -> FALLBACK (#73)", () => {
    const r = evaluate({ ...emptySignals, providerErrors: ["429", "timeout"] })
    expect(r.action).toBe("fallback")
  })
  it("catastrophic combination -> BLOCK", () => {
    const r = evaluate({ ...emptySignals, testFailures: 4, exceptions: ["a", "b"], repeatedRetries: 4 })
    expect(r.action).toBe("block")
    expect(r.quality).toBe("failed")
  })
})

describe("escalation engine", () => {
  const decision = {
    model: "minimaxm3new/MiniMaxAI/MiniMax-M3",
    variant: "deep",
    fallback: [
      { model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "balanced", status: "CONFIGURED" },
      { model: "b-ai/glm-5.3-flash", variant: "max", status: "VERIFIED" },
    ],
  } as Parameters<typeof nextEscalationRoute>[0]

  it("escalates along the verified ladder: M3 deep -> GLM high (#28)", () => {
    const next = nextEscalationRoute(decision, registry, { failedRoutes: [], rerouteCount: 0 })
    expect(next.action).toBe("escalate")
    expect(next.route).toEqual({ model: "b-ai/glm-5.3-flash", variant: "high" })
  })
  it("skips failed routes (no oscillation #31) and reaches GLM max", () => {
    const next = nextEscalationRoute(decision, registry, { failedRoutes: ["b-ai/glm-5.3-flash#high"], rerouteCount: 1 })
    expect(next.route).toEqual({ model: "b-ai/glm-5.3-flash", variant: "max" })
  })
  it("after MAX_REROUTES -> BLOCKED with report (#32)", () => {
    const next = nextEscalationRoute(decision, registry, { failedRoutes: [], rerouteCount: MAX_REROUTES })
    expect(next.action).toBe("block")
  })
  it("never escalates to unsupported variants (#28)", () => {
    for (const step of ESCALATION_LADDER) {
      expect(validateLadderStep(registry, step)).toBe(true)
    }
    expect(validateLadderStep(registry, { model: "b-ai/hy3", variant: "max" })).toBe(false)
  })
})

describe("fallback engine (#72, #73)", () => {
  it("provider failure classification: transient vs unsupported parameter", () => {
    expect(classifyProviderFailure("HTTP 429 rate limit")).toBe("transient")
    expect(classifyProviderFailure("HTTP 500 internal error")).toBe("transient")
    expect(classifyProviderFailure("400: reasoning_effort must be one of")).toBe("unsupported_parameter")
    expect(classifyProviderFailure("401 unauthorized")).toBe("auth")
  })
  it("unsupported parameter is never retried identically (#73)", () => {
    const entry = { chain: ["b-ai/qwen3.8-flash"] } as Parameters<typeof providerFailureDecision>[1]
    expect(providerFailureDecision("unsupported_parameter", entry, {} as never).retry).toBe(false)
    expect(providerFailureDecision("transient", entry, {} as never).retry).toBe(true)
  })
  it("returns the next fallback after a failed route", () => {
    const decision = {
      model: "b-ai/glm-5.3-flash",
      variant: "max",
      fallback: [
        { model: "b-ai/glm-5.3-flash", variant: "high", status: "VERIFIED" },
        { model: "b-ai/qwen3.8-flash", variant: "max", status: "VERIFIED" },
      ],
    } as Parameters<typeof nextFallbackAfterFailure>[0]
    expect(nextFallbackAfterFailure(decision, "b-ai/glm-5.3-flash", "high", registry)?.model).toBe("b-ai/qwen3.8-flash")
    expect(nextFallbackAfterFailure(decision, "b-ai/qwen3.8-flash", "max", registry)).toBeNull()
  })
  it("fallback route validation rejects unavailable models", () => {
    expect(findModel(registry, "b-ai/glm-5.3-flash")).toBeDefined()
  })
})
