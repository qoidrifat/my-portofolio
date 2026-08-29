// Smart Router v2 — capability registry tests (directive #25, #81): never select unsupported/unavailable variants.

import { describe, it, expect } from "vitest"
import { buildRegistry, findModel, effortRank } from "../../.opencode/smart-router/capability.ts"

const registry = buildRegistry()

describe("capability registry consumed from SSOT", () => {
  it("contains the verified b-ai models", () => {
    for (const id of ["b-ai/glm-5.3-flash", "b-ai/deepseek-v4-flash", "b-ai/qwen3.8-flash", "b-ai/hy3", "b-ai/mimo-v2.5"]) {
      expect(findModel(registry, id), id).toBeDefined()
    }
  })
  it("glm-5.3-flash max is VERIFIED and selectable", () => {
    const m = findModel(registry, "b-ai/glm-5.3-flash")!
    const max = m.variants.find((v) => v.name === "max")!
    expect(max.status).toBe("VERIFIED")
  })
  it("xhigh is rejected for b-ai models (never routed there)", () => {
    for (const m of registry.models.filter((x) => x.provider === "b-ai")) {
      expect(m.rejectedEfforts).toContain("xhigh")
    }
  })
  it("hy3 max is UNSUPPORTED -> never selectable (#81)", () => {
    const m = findModel(registry, "b-ai/hy3")!
    const max = m.variants.find((v) => v.name === "max")
    expect(!max || max.status === "UNSUPPORTED").toBe(true)
    expect(m.maxVerifiedEffort).toBe("high")
  })
  it("mimo-v2.5 max is BLOCKED_UPSTREAM (temporary), not UNSUPPORTED (#33)", () => {
    const m = findModel(registry, "b-ai/mimo-v2.5")!
    const max = m.variants.find((v) => v.name === "max")
    expect(max?.status).toBe("BLOCKED_UPSTREAM")
  })
  it("all models are treated text-only (b.ai rejects image input; others unverified)", () => {
    for (const m of registry.models) expect(m.supportsVision).toBe(false)
  })
  it("effort ranking: low < medium < high < max < xhigh", () => {
    const o = registry.effortRankOrder
    expect(effortRank("low", o)).toBeLessThan(effortRank("medium", o))
    expect(effortRank("medium", o)).toBeLessThan(effortRank("high", o))
    expect(effortRank("high", o)).toBeLessThan(effortRank("max", o))
    expect(effortRank("max", o)).toBeLessThan(effortRank("xhigh", o))
  })
})
