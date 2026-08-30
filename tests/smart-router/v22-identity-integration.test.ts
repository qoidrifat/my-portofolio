// Smart Router V2.2 — CRITICAL-1 identity integration (adversarial review remediation).
// Real-host identity contract: host attribution carries the provider-qualified model
// ("b-ai/glm-5.3-flash", host.ts attributionFromRoute format); the evaluation store records
// the canonical UNQUALIFIED modelId so candidateKey(store) === engine candidateId. Regression
// guard for the "b-ai/b-ai/..." double prefix that made store evidence invisible to the engine
// (all tiers UNPROVEN). Telemetry (T1/T2) keeps the provider-qualified identity (observability
// contract pinned by v22-host-integration.test.ts).
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { noopProviders, runEngine } from "../../.opencode/smart-router/v22/engine.ts"
import {
  parseCandidateId,
  providersFromEvidenceStore,
  resolveObservedQuality,
} from "../../.opencode/smart-router/v22/evidence-snapshot.ts"
import {
  EVALUATION_STORE_DEFAULT,
  EvaluationStore,
  joinStorePath,
  parseQualifiedModel,
} from "../../.opencode/smart-router/v22/evaluation-store.ts"
import { emitEvaluation, emitExecutionOutcome } from "../../.opencode/smart-router/v22/wire.ts"
import { telemetryDir } from "../../.opencode/smart-router/v22/telemetry.ts"
import { runReplay } from "../../.opencode/smart-router/v22/replay.ts"
import { buildRequirement } from "../../.opencode/smart-router/v22/requirement.ts"
import type { ReplayRecord, TaskRequirement } from "../../.opencode/smart-router/v22/types.ts"

const NOW = Date.parse("2026-08-30T12:00:00.000Z")
const QUALIFIED_X = "b-ai/glm-5.3-flash"
const QUALIFIED_Y = "b-ai/deepseek-v4-flash"

beforeEach(() => {
  // wire stamps execution timestamps with the wall clock — freeze for deterministic stats
  vi.useFakeTimers()
  vi.setSystemTime(new Date(NOW))
})
afterEach(() => {
  vi.useRealTimers()
})

function tmpRoot(): string {
  return mkdtempSync(join(tmpdir(), "v22-identity-"))
}

function storeIn(root: string): EvaluationStore {
  const store = new EvaluationStore(joinStorePath(root, EVALUATION_STORE_DEFAULT))
  store.load()
  return store
}

function readJsonl(path: string): Record<string, unknown>[] {
  return readFileSync(path, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l) as Record<string, unknown>)
}

// Real-host wire flow: T2 execution + T1 evaluation with the QUALIFIED model string — exactly
// what host.ts attributionFromRoute passes into the wire emitters.
function wireFlow(
  root: string,
  store: EvaluationStore,
  opts: { executionId: string; model: string; variant: string; outcome: "COMPLETED" | "FAILED"; errorClass?: string | null; quality: "good" | "insufficient" },
): void {
  const attribution = {
    sessionId: `S-${opts.executionId}`,
    routeId: `R-${opts.executionId}`,
    executionId: opts.executionId,
    providerId: opts.model.split("/")[0] ?? "unknown",
    model: opts.model,
    variant: opts.variant,
    taskClass: "routine-review",
    optimizationClass: "routine-review",
  }
  emitExecutionOutcome(root, attribution, opts.outcome, opts.errorClass ?? null, undefined, store)
  emitEvaluation(root, attribution, { quality: opts.quality, action: "continue", reasons: [] }, { t0: null, t3: null }, store)
}

// ------------------------------------------------- canonical parse units ---
describe("parseQualifiedModel (canonical identity parse)", () => {
  it("splits at the first '/' only (qualified host model → unqualified modelId)", () => {
    expect(parseQualifiedModel("b-ai/glm-5.3-flash")).toEqual({ providerId: "b-ai", modelId: "glm-5.3-flash" })
    expect(parseQualifiedModel("openrouter/qwen/qwq")).toEqual({ providerId: "openrouter", modelId: "qwen/qwq" })
  })

  it("absent or malformed provider ⇒ providerId null, modelId preserved verbatim", () => {
    expect(parseQualifiedModel("glm-5.3-flash")).toEqual({ providerId: null, modelId: "glm-5.3-flash" })
    expect(parseQualifiedModel("")).toEqual({ providerId: null, modelId: "" })
    expect(parseQualifiedModel("/leading")).toEqual({ providerId: null, modelId: "/leading" })
    expect(parseQualifiedModel("trailing/")).toEqual({ providerId: null, modelId: "trailing/" })
    expect(parseQualifiedModel(null)).toEqual({ providerId: null, modelId: "" })
    expect(parseQualifiedModel(undefined)).toEqual({ providerId: null, modelId: "" })
  })
})

describe("parseCandidateId delegates to the canonical parse", () => {
  it("engine candidate ids parse to unqualified identity (unchanged pre-fix behavior)", () => {
    expect(parseCandidateId("b-ai/glm-5.3-flash#high")).toEqual({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high" })
    expect(parseCandidateId("b-ai/glm-5.3-flash")).toEqual({ providerId: "b-ai", modelId: "glm-5.3-flash", variant: null })
    expect(parseCandidateId("a/b/c#v")).toEqual({ providerId: "a", modelId: "b/c", variant: "v" })
  })

  it("malformed candidate ids stay null", () => {
    expect(parseCandidateId("no-slash")).toBeNull()
    expect(parseCandidateId("b-ai/")).toBeNull()
    expect(parseCandidateId("#high")).toBeNull()
    expect(parseCandidateId("b-ai/glm#")).toBeNull()
  })
})

// --------------------------------------- real-host closed-loop integration ---
describe("CRITICAL-1: wire(qualified model) → store → snapshot → engine", () => {
  const X = { candidateId: "b-ai/glm-5.3-flash#high", provider: "b-ai", model: "glm-5.3-flash", variant: "high", variantStatus: "VERIFIED" as const, policyStatus: "ALLOWED" as const, maxContextTokens: 0, ladderRank: 0 }
  const Y = { candidateId: "b-ai/deepseek-v4-flash#high", provider: "b-ai", model: "deepseek-v4-flash", variant: "high", variantStatus: "VERIFIED" as const, policyStatus: "ALLOWED" as const, maxContextTokens: 0, ladderRank: 1 }

  function makeRequirement(): TaskRequirement {
    const r = buildRequirement({
      sourceTaskClass: "routine-review", riskClass: "medium", agent: "reviewer", modality: "text",
      complexity: "low", contextDemand: "medium", reasoningDemand: "low",
      latencyPreference: "normal", qualityPreference: "normal", costProfile: "balanced",
      sessionId: "S-id", routeId: "R-id",
    })
    if (r.kind !== "ok") throw new Error("requirement blocked")
    return r.requirement
  }
  const requirement = makeRequirement()

  function seedStore(root: string): EvaluationStore {
    const store = storeIn(root)
    for (let i = 0; i < 20; i++) {
      wireFlow(root, store, { executionId: `EX-${i}`, model: QUALIFIED_X, variant: "high", outcome: "FAILED", errorClass: "model-reasoning", quality: "insufficient" })
      wireFlow(root, store, { executionId: `EY-${i}`, model: QUALIFIED_Y, variant: "high", outcome: "COMPLETED", quality: "good" })
    }
    return store
  }

  function engineWith(store: EvaluationStore) {
    return runEngine({
      mode: "SHADOW",
      requirement,
      candidates: [X, Y],
      providers: {
        ...noopProviders,
        capabilityLevel: () => "INTEGRATED",
        ...providersFromEvidenceStore(store, "routine-review", NOW),
      },
      budgets: { costBudget: null, latencyBudgetP95Ms: null },
      hysteresis: { segment: { taskClass: "routine-review", risk: "medium" }, currentRoute: null, stickSince: null, exceedCount: 0, exceedStrongCount: 0, exceedStrongSince: null, environmentOutcomeStreak: 0 },
      stickyRouteBroken: false,
      now: new Date(NOW).toISOString(),
      sessionId: "S-id",
      routeId: "R-id",
      attempt: 1,
    })
  }

  it("store keys use the canonical identity — no b-ai/b-ai double prefix (THE regression)", () => {
    const root = tmpRoot()
    const store = seedStore(root)
    const stats = store.stats(NOW)
    expect(stats.recentSuccessBySegment.get(`routine-review|${QUALIFIED_X}#high`)).toBeDefined()
    expect(stats.recentSuccessBySegment.get(`routine-review|${QUALIFIED_Y}#high`)).toBeDefined()
    expect(stats.qualityBySegment.get(`routine-review|${QUALIFIED_X}#high`)?.mean).toBeCloseTo(0.2, 12)
    for (const key of [...stats.recentSuccessBySegment.keys(), ...stats.qualityBySegment.keys()]) {
      expect(key.includes("b-ai/b-ai")).toBe(false)
    }
  })

  it("snapshot resolves evidence for the engine candidate id (pre-fix: null everywhere)", () => {
    const root = tmpRoot()
    const store = seedStore(root)
    const providers = providersFromEvidenceStore(store, "routine-review", NOW)
    const qx = providers.quality("b-ai/glm-5.3-flash#high")
    expect(qx).not.toBeNull()
    expect(qx?.observed).toBeCloseTo(0.2, 12)
    const segY = providers.segment("b-ai/deepseek-v4-flash#high", "routine-review")
    expect(segY?.sampleSize).toBe(20)
    expect(segY?.successRate).toBe(1)
    const rx = resolveObservedQuality(store.stats(NOW), "routine-review", "b-ai", "glm-5.3-flash", "high")
    expect(rx?.sourceLevel).toBe("VARIANT")
  })

  it("engine sees wire-recorded evidence: X and Y KNOWN_EVIDENCED, good model selected", () => {
    const root = tmpRoot()
    const store = seedStore(root)
    const r = engineWith(store)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    const tiers = new Map(r.decision.scores.map((s) => [s.candidateId, s.tier]))
    expect(tiers.get(X.candidateId)).toBe("KNOWN_EVIDENCED")
    expect(tiers.get(Y.candidateId)).toBe("KNOWN_EVIDENCED")
    expect(r.decision.selected).toBe(Y.candidateId)
    expect(r.decision.excluded.length).toBe(0)
  })

  it("cold-start control: empty store ⇒ all UNPROVEN, D-COLD ladder head selected", () => {
    const root = tmpRoot()
    const store = storeIn(root)
    const r = engineWith(store)
    expect(r.kind).toBe("ok")
    if (r.kind !== "ok") return
    for (const s of r.decision.scores) expect(s.tier).toBe("UNPROVEN")
    expect(r.decision.selected).toBe(X.candidateId)
  })

  it("determinism ×5: identical wire-seeded store → identical engine result", () => {
    const run = (): string => {
      const root = tmpRoot()
      const result = JSON.stringify(engineWith(seedStore(root)))
      rmSync(root, { recursive: true, force: true })
      return result
    }
    const first = run()
    for (let i = 0; i < 5; i++) expect(run()).toBe(first)
  })

  it("variant isolation through the real wire path (#high vs #max stay separate)", () => {
    const root = tmpRoot()
    const store = storeIn(root)
    for (let i = 0; i < 5; i++) {
      wireFlow(root, store, { executionId: `VH-${i}`, model: QUALIFIED_X, variant: "high", outcome: "COMPLETED", quality: "good" })
      wireFlow(root, store, { executionId: `VM-${i}`, model: QUALIFIED_X, variant: "max", outcome: "FAILED", errorClass: "model-reasoning", quality: "insufficient" })
    }
    const stats = store.stats(NOW)
    expect(stats.qualityBySegment.get(`routine-review|${QUALIFIED_X}#high`)?.mean).toBeCloseTo(1.0, 12)
    expect(stats.qualityBySegment.get(`routine-review|${QUALIFIED_X}#max`)?.mean).toBeCloseTo(0.2, 12)
    for (const key of [...stats.recentSuccessBySegment.keys()]) expect(key.includes("b-ai/b-ai")).toBe(false)
  })

  it("telemetry keeps the provider-qualified identity (observability contract unchanged)", () => {
    const root = tmpRoot()
    const store = storeIn(root)
    wireFlow(root, store, { executionId: "ET-1", model: QUALIFIED_X, variant: "high", outcome: "COMPLETED", quality: "good" })
    const t2 = readJsonl(join(telemetryDir(root), "t2.jsonl"))
    expect(t2[0].modelId).toBe(QUALIFIED_X)
    const t1 = readJsonl(join(telemetryDir(root), "t1.jsonl"))
    const chain = t1[0].chain as Record<string, unknown>
    expect((chain.candidate as Record<string, unknown>).modelId).toBe(QUALIFIED_X)
  })

  it("unknown placeholders stay telemetry-only (I-016 preserved post-fix)", () => {
    const root = tmpRoot()
    const store = storeIn(root)
    emitExecutionOutcome(root, { model: QUALIFIED_X }, "COMPLETED", null, undefined, store)
    emitEvaluation(root, { model: QUALIFIED_X }, { quality: "good", action: "continue", reasons: [] }, {}, store)
    expect(store.all().length).toBe(0)
  })

  it("replay resolves outcomes through the canonical identity (qualified v21Route, no double prefix)", () => {
    const root = tmpRoot()
    const store = storeIn(root)
    wireFlow(root, store, { executionId: "ER-1", model: QUALIFIED_X, variant: "high", outcome: "COMPLETED", quality: "good" })
    const rec = {
      schemaVersion: 1,
      recordId: "R-ID",
      sessionId: "S-ER-1",
      routeId: "R-ER-1",
      decisionId: "D-ID",
      attempt: 1,
      timestamp: new Date(NOW).toISOString(),
      requirement: {
        sourceTaskClass: "routine-review", optimizationClass: "routine-review", riskClass: "low",
        agent: "reviewer", modality: "text", complexity: "low", contextDemand: "medium",
        reasoningDemand: "low", contextTokens: 1000, capabilityRequirements: [],
        latencyPreference: "normal", qualityPreference: "normal", costProfile: "balanced",
      },
      v21Route: { providerId: "b-ai", modelId: QUALIFIED_X, variant: "high" },
      v21CandidateSet: [
        { candidateId: "b-ai/deepseek-v4-flash#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
        { candidateId: "b-ai/glm-5.3-flash#high", policyStatus: "ALLOWED", variantStatus: "VERIFIED" },
      ],
      v21Exclusions: [],
      evidence: {
        capability: { missing: [] }, health: { missing: [{ field: "health", reason: "not recorded" }] },
        quality: { missing: [] }, latency: { missing: [{ field: "latency", reason: "not recorded" }] },
        cost: { missing: [{ field: "cost", reason: "not recorded" }] }, variantEvidence: { missing: [] },
      },
      outcomeRefs: ["ER-1"],
      missing: [],
    } as ReplayRecord
    const summary = runReplay([rec], { projectRoot: root, providers: noopProviders })
    expect(summary.rows[0].v21CandidateId).toBe("b-ai/glm-5.3-flash#high")
    expect(summary.rows[0].v21CandidateId.includes("b-ai/b-ai")).toBe(false)
    expect(summary.rows[0].outcome.kind).toBe("OBSERVED")
    expect(summary.rows[0].v22Selected).not.toBeNull()
  })
})
