// V2.2 flags (default OFF) + replay-2 classification tests.
import { describe, expect, it } from "vitest"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { loadFlags } from "../../.opencode/smart-router/v22/flags.ts"
import { runReplay, loadReplayRecords, type ReplayRowResult } from "../../.opencode/smart-router/v22/replay.ts"
import { noopProviders } from "../../.opencode/smart-router/v22/engine.ts"
import type { ReplayRecord } from "../../.opencode/smart-router/v22/types.ts"

describe("v22 flags", () => {
  it("defaults to OFF when flag file is absent", () => {
    const dir = mkdtempSync(join(tmpdir(), "v22flags-"))
    try {
      expect(loadFlags(dir)).toEqual({ mode: "OFF", shadowZeroInfluence: true })
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("falls back to OFF on corrupt flag file (fail-safe)", () => {
    const dir = mkdtempSync(join(tmpdir(), "v22flags-"))
    try {
      mkdirSync(join(dir, ".opencode", "smart-router"), { recursive: true })
      writeFileSync(join(dir, ".opencode/smart-router/v22-flags.json"), "{not json")
      expect(loadFlags(dir).mode).toBe("OFF")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("accepts valid modes, rejects unknown ones", () => {
    const dir = mkdtempSync(join(tmpdir(), "v22flags-"))
    try {
      mkdirSync(join(dir, ".opencode", "smart-router"), { recursive: true })
      const p = join(dir, ".opencode/smart-router/v22-flags.json")
      writeFileSync(p, JSON.stringify({ mode: "SHADOW" }))
      expect(loadFlags(dir).mode).toBe("SHADOW")
      writeFileSync(p, JSON.stringify({ mode: "TURBO" }))
      expect(loadFlags(dir).mode).toBe("OFF")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})

describe("v22 replay-2", () => {
  const record = (over: Partial<ReplayRecord> = {}): ReplayRecord =>
    ({
      schemaVersion: 1,
      recordId: "R-1",
      sessionId: "S1",
      routeId: "RT1",
      decisionId: "D-1",
      attempt: 1,
      timestamp: "2026-08-29T10:00:00.000Z",
      requirement: {
        sourceTaskClass: "deep-research", optimizationClass: "deep-research", riskClass: "medium",
        agent: "research", modality: "text", complexity: "high", contextDemand: "large",
        reasoningDemand: "high", contextTokens: 100000, capabilityRequirements: [],
        latencyPreference: "normal", qualityPreference: "max", costProfile: "quality",
      },
      v21Route: { providerId: "prov", modelId: "model0", variant: "high" },
      v21CandidateSet: [
        { candidateId: "prov/model0#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
        { candidateId: "prov/model1#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
      ],
      v21Exclusions: [],
      evidence: {
        capability: { missing: [] }, health: { missing: [{ field: "health", reason: "not recorded" }] },
        quality: { missing: [] }, latency: { missing: [{ field: "latency", reason: "not recorded" }] },
        cost: { missing: [{ field: "cost", reason: "not recorded" }] }, variantEvidence: { missing: [] },
      },
      outcomeRefs: [],
      missing: [],
      ...over,
    }) as ReplayRecord

  it("no evidence corpus: D-COLD ladder head == v21 route, driver no-divergence, outcome UNKNOWN", () => {
    const dir = mkdtempSync(join(tmpdir(), "v22replay-"))
    try {
      const p = join(dir, "replay.jsonl")
      writeFileSync(p, JSON.stringify(record()) + "\n")
      const s = runReplay(loadReplayRecords(p), { projectRoot: dir, providers: noopProviders })
      expect(s.total).toBe(1)
      expect(s.rows[0].v22Selected).toBe("prov/model0#high")
      expect(s.rows[0].driver).toBe("no-divergence")
      expect(s.rows[0].outcome.kind).toBe("UNKNOWN") // no outcomeRefs → never OBSERVED (G4)
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })

  it("v21 route with zero evidence entries ⇒ cold-start-artifact when v22 differs", () => {
    const dir = mkdtempSync(join(tmpdir(), "v22replay-"))
    try {
      const rec = record({
        v21Route: { providerId: "prov", modelId: "ghost", variant: "high" },
        v21CandidateSet: [
          { candidateId: "prov/ghost#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
          { candidateId: "prov/model1#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
        ],
        evidence: {
          capability: { missing: [{ field: "capability", reason: "none" }] }, health: { missing: [{ field: "health", reason: "none" }] },
          quality: { missing: [{ field: "quality", reason: "none" }] }, latency: { missing: [{ field: "latency", reason: "none" }] },
          cost: { missing: [{ field: "cost", reason: "none" }] }, variantEvidence: { missing: [{ field: "variant", reason: "none" }] },
        },
      })
      const p = join(dir, "replay.jsonl")
      writeFileSync(p, JSON.stringify(rec) + "\n")
      // model1 carries real (cost/latency) evidence ⇒ not a pure cold start; deep-research
      // declares a quality floor and no candidate is floor-verified ⇒ H2 C1 fallback fires
      // (V2.1 anchor kept, V2.2 selection withheld). Wave-1 designed behavior.
      const providers = {
        ...noopProviders,
        costDatum: (id: string) => (id === "prov/model1#high" ? { effectiveCost: 0.5, confidence: 0.9 } : { effectiveCost: null, confidence: 0 }),
        latencyDatum: (id: string) => (id === "prov/model1#high" ? { p50Ms: 200, confidence: 0.9, sampleSize: 10 } : { p50Ms: null, confidence: 0, sampleSize: 0 }),
      }
      const s = runReplay(loadReplayRecords(p), { projectRoot: dir, providers })
      expect(s.rows[0].v22Selected).toBeNull()
      expect(s.rows[0].driver).toBe("other")
    } finally {
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
