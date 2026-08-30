// Smart Router V2.2 — TUI presentation adapter + format tests.
// Contract: UNKNOWN-safe rendering, honest evidence states, shadow never dispatches.
// Remediation: M1 session isolation, M3 authoritative evidence (EvaluationStore is SSOT).

import { describe, it, expect } from "vitest"
import { buildViewModel, parseCapabilities, parsePermissionTail, formatRoute, type AdapterInput } from "../../.opencode/smart-router/v22/tui/view-model.ts"
import { EvaluationStore } from "../../.opencode/smart-router/v22/evaluation-store.ts"
import type { EvaluationSignal, OptimizationClass } from "../../.opencode/smart-router/v22/types.ts"
import {
  footerLines,
  dashboardLines,
  evidenceLines,
  securityLines,
  fmtCost,
  fmtTokens,
  fmtMs,
  fmtFreshness,
  clip,
} from "../../.opencode/smart-router/v22/tui/format.ts"

const now = Date.parse("2026-08-30T12:00:00.000Z")

function input(overrides: Partial<AdapterInput> = {}): AdapterInput {
  return {
    flags: { mode: "SHADOW" },
    config: { mode: "advisory" },
    deltas: [
      {
        timestamp: "2026-08-30T11:59:00.000Z",
        sessionId: "ses-A",
        status: "SHADOW",
        taskClass: "ui-fix",
        v21: { providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high" },
        v22: {
          selected: "b-ai/glm-5.3-flash",
          selectedScore: 0.82,
          selectedTier: "KNOWN-EVIDENCED",
          topScores: [
            { candidateId: "b-ai/glm-5.3-flash", score: 0.82, tier: "KNOWN-EVIDENCED" },
            { candidateId: "b-ai/deepseek-v4-flash", score: 0.61, tier: "UNPROVEN" },
          ],
          stickinessApplied: true,
          degradedToV21: false,
          blocked: false,
          divergent: false,
          reason: "same-route",
        },
      },
    ],
    signals: [],
    t2: [],
    t3: [{ timestamp: "2026-08-30T11:59:30.000Z", ttfrMs: 420, completionMs: 2400 }],
    t4: [{ timestamp: "2026-08-30T11:59:30.000Z", inputUsage: 1500, outputUsage: 900, effectiveCost: 0.01234, unit: "usd", pricingSource: { status: "VERIFIED" } }],
    routing: [
      {
        timestamp: "2026-08-30T11:59:00.000Z",
        sessionId: "ses-A",
        taskType: "ui-fix",
        matched_task_class: "ui-fix",
        agent: "frontend",
        model: "b-ai/glm-5.3-flash",
        variant: "high",
        risk: "medium",
        permission: "ask",
        decision: "routed",
        reason: "policy",
        fallback: [{ model: "b-ai/deepseek-v4-flash", variant: "high", status: "VERIFIED" }],
      },
    ],
    permissions: [],
    permissionsStatus: "valid",
    routerLog: [
      { timestamp: "2026-08-30T11:00:00.000Z", kind: "effort-clamp" },
      { timestamp: "2026-08-30T11:05:00.000Z", kind: "advisory-mismatch" },
      { timestamp: "2026-08-30T11:06:00.000Z", kind: "advisory-mismatch" },
    ],
    breaker: { entries: { "b-ai/glm-5.3-flash": { state: "CLOSED", failures: 0 } } },
    hysteresis: [],
    storeStats: null,
    registry: null,
    nowMs: now,
    ...overrides,
  }
}

/** Authoritative store built with the REAL EvaluationStore implementation (M3 SSOT). */
function storeFrom(signals: Parameters<EvaluationStore["record"]>[0][]): EvaluationStore {
  const store = new EvaluationStore("unused-never-loaded-or-persisted")
  for (const s of signals) store.record(s, false)
  return store
}

function completeSignal(i: number, opts: {
  taskClass?: string
  providerId?: string
  modelId?: string
  variant?: string | null
  grade?: number
  timestamp?: string
  evaluationId?: string
  executionId?: string
}) {
  const executionId = opts.executionId ?? `exec-${i}`
  const taskClass = (opts.taskClass ?? "ui-fix") as EvaluationSignal["chain"]["taskClass"]
  return {
    signalId: `SIG-${executionId}-eval-${i}`,
    executionId,
    timestamp: opts.timestamp ?? "2026-08-30T11:50:00.000Z",
    chain: {
      sessionId: "ses-A",
      routeId: "route-1",
      executionId,
      candidate: { providerId: opts.providerId ?? "b-ai", modelId: opts.modelId ?? "glm-5.3-flash", variant: opts.variant === undefined ? "max" : opts.variant },
      taskClass,
      evaluationId: opts.evaluationId ?? `eval-${i}`,
    },
    attributionComplete: true,
    quality: opts.grade === undefined
      ? null
      : {
          sessionId: "ses-A",
          routeId: "route-1",
          executionId,
          providerId: opts.providerId ?? "b-ai",
          modelId: opts.modelId ?? "glm-5.3-flash",
          variant: opts.variant === undefined ? "max" : opts.variant,
          taskClass,
          optimizationClass: "routine-coding" as OptimizationClass,
          timestamp: opts.timestamp ?? "2026-08-30T11:50:00.000Z",
          provenance: ["test"],
          grade: opts.grade,
          confidence: 1,
          evaluatorId: "test",
          failureClass: null,
        },
    execution: null,
  }
}

describe("view model: UNKNOWN-safe semantics", () => {
  it("absent data stays UNKNOWN, never 0", () => {
    const vm = buildViewModel(input({ deltas: [], routing: [], t3: [], t4: [], breaker: null }))
    expect(vm.taskClass).toBeNull()
    expect(vm.actual).toBeNull()
    expect(vm.shadow).toBeNull()
    expect(vm.candidates).toHaveLength(0)
  })
  it("mode defaults to OFF when flags file absent", () => {
    const vm = buildViewModel(input({ flags: null }))
    expect(vm.mode).toBe("OFF")
    expect(vm.influence).toBe("ZERO")
  })
  it("shadow influence is always ZERO", () => {
    const vm = buildViewModel(input())
    expect(vm.mode).toBe("SHADOW")
    expect(vm.influence).toBe("ZERO")
    expect(vm.wouldDispatch).toBe(false)
  })
  it("cost UNKNOWN vs verified $0 are distinct", () => {
    expect(fmtCost(null, "usd", false)).toBe("UNKNOWN")
    expect(fmtCost(0, "usd", true)).toBe("$0.0000")
    expect(fmtCost(0.01234, "usd", true)).toBe("$0.0123")
  })
  it("token and time formatting", () => {
    expect(fmtTokens(null)).toBe("UNKNOWN")
    expect(fmtTokens(1500)).toBe("1.5k")
    expect(fmtMs(420)).toBe("420ms")
    expect(fmtMs(2400)).toBe("2.40s")
    expect(fmtFreshness(null)).toBe("—")
    expect(fmtFreshness(0.5)).toBe("12h")
  })
})

describe("view model: evaluation lifecycle honesty (T1 pending is not failure)", () => {
  it("T2 without T1 is PENDING DISPOSE, never failed", () => {
    const vm = buildViewModel(
      input({
        t2: [{ timestamp: "2026-08-30T11:59:10.000Z", executionId: "exec-1" }],
        signals: [
          { timestamp: "2026-08-30T11:59:10.000Z", executionId: "exec-1", execution: { outcome: "COMPLETED", timestamp: "2026-08-30T11:59:20.000Z" } },
        ],
      }),
    )
    expect(vm.evaluation.hasT2).toBe(true)
    expect(vm.evaluation.hasT1).toBe(false)
    expect(vm.evaluation.status).toBe("PENDING DISPOSE")
  })
  it("converged pair is RECEIVED", () => {
    const vm = buildViewModel(
      input({
        t2: [{ timestamp: "2026-08-30T11:59:10.000Z", executionId: "exec-1" }],
        signals: [
          {
            timestamp: "2026-08-30T11:59:40.000Z",
            executionId: "exec-1",
            attributionComplete: true,
            execution: { outcome: "COMPLETED", timestamp: "2026-08-30T11:59:20.000Z" },
            quality: { grade: 0.9, samples: 3 },
          },
        ],
      }),
    )
    expect(vm.evaluation.status).toBe("RECEIVED")
    expect(vm.evaluation.attributionComplete).toBe(true)
  })
  it("cancelled execution is CANCELLED - AUDIT ONLY, not failed", () => {
    const vm = buildViewModel(
      input({
        t2: [{ timestamp: "2026-08-30T11:59:10.000Z", executionId: "exec-2" }],
        signals: [
          { timestamp: "2026-08-30T11:59:10.000Z", executionId: "exec-2", execution: { outcome: "CANCELLED", timestamp: "2026-08-30T11:59:20.000Z" } },
        ],
      }),
    )
    expect(vm.evaluation.status).toBe("CANCELLED - AUDIT ONLY")
  })
})

describe("view model: routing + stability", () => {
  it("fallback chain from routing decisions is PLANNED, never EXECUTED", () => {
    const vm = buildViewModel(input())
    expect(vm.fallbackStatus).toBe("PLANNED")
    expect(vm.fallback[0]?.model).toBe("b-ai/deepseek-v4-flash")
  })
  it("hysteresis RETAIN when stickiness applied", () => {
    const vm = buildViewModel(input())
    expect(vm.hysteresis.decision).toBe("RETAIN CURRENT")
    expect(vm.hysteresis.margin).toBeCloseTo(0.21)
  })
  it("breaker states surfaced with OPEN highlighted", () => {
    const vm = buildViewModel(
      input({ breaker: { entries: { "b-ai/glm-5.3-flash": { state: "CLOSED" }, "b-ai/hy3": { state: "OPEN", failures: 5 } } } }),
    )
    expect(vm.breaker.map((b) => b.state)).toContain("OPEN")
  })
  it("security counts clamps/advisories and hard denies", () => {
    const vm = buildViewModel(
      input({
        permissions: [{ timestamp: "2026-08-30T11:50:00.000Z", decision: "deny", rule: "vision-never-promoted" }],
        permissionsStatus: "valid",
      }),
    )
    expect(vm.security.clamps).toBe(1)
    expect(vm.security.advisories).toBe(2)
    expect(vm.security.hardDeny).toBe(true)
  })
})

describe("capabilities from real SSOT registry", () => {
  it("vision never promoted", () => {
    const rows = parseCapabilities(
      {
        effortRankOrder: [],
        generatedFrom: [],
        models: [
          {
            id: "b-ai/glm-5.3-flash",
            provider: "b-ai",
            available: true,
            supportsVision: false,
            maxVerifiedEffort: "max",
            rejectedEfforts: ["xhigh"],
            variants: [{ name: "max", effort: "max", status: "VERIFIED" }],
          },
        ],
      },
      "b-ai/glm-5.3-flash",
    )
    expect(rows?.find((r) => r.name === "vision")?.status).toBe("BLOCKED")
    expect(rows?.find((r) => r.name === "max verified effort")?.status).toBe("max")
    expect(rows?.find((r) => r.name === "max (max)")?.status).toBe("VERIFIED")
  })
  it("unavailable registry -> null (UNKNOWN rendering)", () => {
    expect(parseCapabilities(null, "b-ai/glm-5.3-flash")).toBeNull()
  })
})

describe("format: responsive footer + dashboard", () => {
  const vm = buildViewModel(input())
  it("narrow footer clips and stays one line", () => {
    const lines = footerLines(vm, 40)
    for (const l of lines) expect(l.text.length).toBeLessThanOrEqual(40)
  })
  it("wide footer includes actual + shadow", () => {
    const lines = footerLines(vm, 120)
    expect(lines[0]?.text).toContain("Actual")
    expect(lines[0]?.text).toContain("Shadow")
  })
  it("OFF mode footer is inert", () => {
    const off = buildViewModel(input({ flags: { mode: "OFF" } }))
    expect(footerLines(off, 120)[0]?.text).toBe("Smart Router · OFF")
  })
  it("dashboard never renders a fabricated zero-cost", () => {
    const text = dashboardLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("NOT AUTHORIZED")
    expect(text).not.toContain("Effective    $0.0000")
  })
  it("clip keeps ellipsis inside width", () => {
    expect(clip("abcdefgh", 5)).toHaveLength(5)
    expect(clip("ab", 5)).toBe("ab")
  })
})

describe("route naming", () => {
  it("strips provider, keeps variant", () => {
    expect(formatRoute("b-ai/glm-5.3-flash", "max")).toBe("glm-5.3-flash · max")
    expect(formatRoute(null, "max")).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// MEDIUM-1 remediation: session isolation (host-supplied sessionId, no fallback)
// ---------------------------------------------------------------------------

describe("M1: session isolation", () => {
  const routingA = {
    timestamp: "2026-08-30T11:59:00.000Z", // A has the latest GLOBAL timestamp
    sessionId: "ses-A",
    matched_task_class: "ui-fix",
    agent: "frontend",
    model: "b-ai/glm-5.3-flash",
    variant: "high",
    risk: "medium",
    decision: "routed",
  }
  const routingB = {
    timestamp: "2026-08-30T10:00:00.000Z", // B is EARLIER globally, but IS the active session
    sessionId: "ses-B",
    matched_task_class: "docs",
    agent: "build",
    model: "b-ai/deepseek-v4-flash",
    variant: "high",
    risk: "low",
    decision: "routed",
  }

  it("session route isolation: B UI shows B, never A's global-latest route", () => {
    const inp = input({ routing: [routingB, routingA] })
    expect(buildViewModel(inp, "ses-B").actual).toBe("deepseek-v4-flash · high")
    expect(buildViewModel(inp, "ses-B").taskClass).toBe("docs")
    expect(buildViewModel(inp, "ses-A").actual).toBe("glm-5.3-flash · high")
    // global view (no session) keeps old semantics: latest appended row
    expect(buildViewModel(inp).actual).toBe("glm-5.3-flash · high")
  })

  it("session shadow isolation", () => {
    const deltaA = { timestamp: "2026-08-30T11:59:00.000Z", sessionId: "ses-A", status: "SHADOW", taskClass: "ui-fix", v22: { selected: "b-ai/glm-5.3-flash#max", topScores: [], divergent: false } }
    const deltaB = { timestamp: "2026-08-30T10:00:00.000Z", sessionId: "ses-B", status: "SHADOW", taskClass: "docs", v22: { selected: "b-ai/qwen3.8-flash#high", topScores: [], divergent: true } }
    const inp = input({ deltas: [deltaB, deltaA] })
    // shadowSelected is a full candidate id (provider/model#variant) → variantLabel applies
    expect(buildViewModel(inp, "ses-B").shadow).toBe("qwen3.8-flash · high")
    expect(buildViewModel(inp, "ses-B").divergent).toBe(true)
    expect(buildViewModel(inp, "ses-A").shadow).toBe("glm-5.3-flash · max")
    expect(buildViewModel(inp, "ses-A").divergent).toBe(false)
  })

  it("session evaluation isolation", () => {
    const inp = input({
      t2: [
        { timestamp: "2026-08-30T11:59:10.000Z", sessionId: "ses-A", executionId: "exec-A" },
        { timestamp: "2026-08-30T10:00:10.000Z", sessionId: "ses-B", executionId: "exec-B" },
      ],
    })
    expect(buildViewModel(inp, "ses-B").evaluation.executionId).toBe("exec-B")
    expect(buildViewModel(inp, "ses-A").evaluation.executionId).toBe("exec-A")
  })

  it("session hysteresis isolation (keyed sessionId::taskClass::risk)", () => {
    const inp = input({
      hysteresis: [
        { key: "ses-B::docs::low", state: { segment: { taskClass: "docs", risk: "low" }, currentRoute: { providerId: "b-ai", modelId: "deepseek-v4-flash", variant: "high" } } },
        { key: "ses-A::ui-fix::medium", state: { segment: { taskClass: "ui-fix", risk: "medium" }, currentRoute: { providerId: "b-ai", modelId: "glm-5.3-flash", variant: "high" } } },
      ],
    })
    const b = buildViewModel(inp, "ses-B")
    expect(b.hysteresis.current).toBe("deepseek-v4-flash · high")
    const a = buildViewModel(inp, "ses-A")
    expect(a.hysteresis.current).toBe("glm-5.3-flash · high")
  })

  it("global state (breaker, cost/latency) is unaffected by session filtering", () => {
    const inp = input({
      routing: [routingA, routingB],
      breaker: { entries: { "b-ai/hy3": { state: "OPEN", failures: 5 } } },
    })
    const a = buildViewModel(inp, "ses-A")
    const b = buildViewModel(inp, "ses-B")
    // breaker rows are derived from the GLOBAL breaker file + each view's relevant models,
    // but the underlying state set is identical (same file, same OPEN entries)
    expect(a.breaker.filter((x) => x.state === "OPEN")).toEqual(b.breaker.filter((x) => x.state === "OPEN"))
    expect(a.breaker.find((x) => x.state === "OPEN")?.failures).toBe(5)
    expect(a.latency.ttfrMs).toBe(b.latency.ttfrMs)
    expect(a.cost.effective).toBe(b.cost.effective)
  })

  it("session with no records degrades to UNKNOWN — never falls back to another session", () => {
    const inp = input({ routing: [routingA], deltas: [], t2: [] })
    const c = buildViewModel(inp, "ses-C")
    expect(c.actual).toBeNull()
    expect(c.taskClass).toBeNull()
    expect(c.shadow).toBeNull()
    expect(c.evaluation.status).toBe("NO EXECUTION YET")
  })

  it("empty sessionId keeps the global workspace view", () => {
    const inp = input({ routing: [routingB, routingA] })
    expect(buildViewModel(inp, "").actual).toBe("glm-5.3-flash · high")
  })
})

// ---------------------------------------------------------------------------
// MEDIUM-3 remediation: authoritative evidence (EvaluationStore is the only aggregator)
// ---------------------------------------------------------------------------

describe("M3: authoritative evidence", () => {
  it("copies store aggregates verbatim — quality/confidence/samples are never recomputed", () => {
    const signals = [
      // 2 OLD low grades (40 days stale) + 3 FRESH high grades
      completeSignal(1, { grade: 0.4, timestamp: "2026-07-21T12:00:00.000Z" }),
      completeSignal(2, { grade: 0.4, timestamp: "2026-07-21T12:00:00.000Z" }),
      completeSignal(3, { grade: 1.0 }),
      completeSignal(4, { grade: 1.0 }),
      completeSignal(5, { grade: 1.0 }),
    ]
    const store = storeFrom(signals)
    const stats = store.stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    const row = vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")
    expect(row).toBeDefined()
    const authoritative = stats.qualityBySegment.get("ui-fix|b-ai/glm-5.3-flash#max")
    expect(authoritative).toBeDefined()
    expect(row!.quality).toBe(authoritative!.mean)
    expect(row!.confidence).toBe(authoritative!.confidence)
    expect(row!.samples).toBe(authoritative!.n)
    expect(row!.freshnessDays).not.toBeNull()
    expect(row!.status).toBe("KNOWN-EVIDENCED")
    expect(row!.source).toBe("VARIANT")
    // naive UI formula (n/(n+10)) would ignore staleness/cap entirely; the copied
    // value carries the store's shrinkage+decay semantics (decay proven in the
    // dedicated staleness test below)
  })

  it("respects the variant threshold (n<5) — honest UNPROVEN, no fabricated aggregate", () => {
    const signals = [completeSignal(1, { grade: 0.9 }), completeSignal(2, { grade: 0.95 })]
    const stats = storeFrom(signals).stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    // #max has no authoritative aggregate and is not route-relevant → absent entirely
    expect(vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")).toBeUndefined()
    // the routed variant (#high) is route-relevant → honest UNPROVEN with null values
    const routed = vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#high")
    expect(routed?.status).toBe("UNPROVEN")
    expect(routed?.samples).toBeNull()
    expect(routed?.quality).toBeNull()
  })

  it("task-class segmentation: only the routed class's aggregates are shown", () => {
    const ui = [1, 2, 3, 4, 5].map((i) => completeSignal(i, { taskClass: "ui-fix", grade: 0.9 }))
    const sec = [6, 7, 8, 9, 10].map((i) => completeSignal(i, { taskClass: "security-review", grade: 0.2 }))
    const signals = [...ui, ...sec]
    const stats = storeFrom(signals).stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    expect(vm.evidenceScope).toBe("ui-fix")
    expect(vm.evidence.every((e) => !e.candidateKey.includes("qwen"))).toBe(true)
    // the security-review aggregate exists in the store but is NOT pooled into the ui-fix view
    expect(stats.qualityBySegment.has("security-review|b-ai/glm-5.3-flash#max")).toBe(true)
    expect(vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")?.quality).toBe(
      stats.qualityBySegment.get("ui-fix|b-ai/glm-5.3-flash#max")!.mean,
    )
  })

  it("variant isolation: variants are never pooled", () => {
    const max = [1, 2, 3, 4, 5].map((i) => completeSignal(i, { variant: "max", grade: 1.0 }))
    const high = [6, 7, 8].map((i) => completeSignal(i, { variant: "high", grade: 0.1 }))
    const signals = [...max, ...high]
    const stats = storeFrom(signals).stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    const maxRow = vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")
    expect(maxRow?.samples).toBe(5)
    expect(maxRow?.quality).toBeCloseTo(1.0, 5)
    // high has n=3 < 5 → no authoritative variant aggregate → surfaced as UNPROVEN
    // (route-relevant), never pooled with max's samples (n would be 8)
    const highRow = vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#high")
    expect(highRow?.status).toBe("UNPROVEN")
    expect(highRow?.samples).toBeNull()
  })

  it("model-level fallback with the ×0.5 inheritance cap", () => {
    // 20 model signals across 5 variants (4 each — below the variant threshold)
    const variants = ["v1", "v2", "v3", "v4", "v5"]
    const signals = variants.flatMap((v, vi) =>
      [1, 2, 3, 4].map((i) => completeSignal(vi * 10 + i, { variant: v, grade: 0.9 })),
    )
    const stats = storeFrom(signals).stats(now)
    expect(stats.qualityByModel.has("ui-fix|b-ai/glm-5.3-flash")).toBe(true)
    const vm = buildViewModel(input({
      signals,
      storeStats: stats,
      routing: [{ timestamp: "2026-08-30T11:59:00.000Z", sessionId: "ses-A", matched_task_class: "ui-fix", model: "b-ai/glm-5.3-flash", variant: "v1", decision: "routed" }],
    }), "ses-A")
    const row = vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#v1")
    expect(row?.source).toBe("MODEL (inherited, ×0.5 cap)")
    const modelStats = stats.qualityByModel.get("ui-fix|b-ai/glm-5.3-flash")!
    // authoritative inheritance rule (evidence-snapshot): confidence capped at ×0.5, not multiplied
    expect(row!.confidence).toBe(Math.min(modelStats.confidence, 0.5))
  })

  it("confidence semantics: shrinkage + staleness decay + cap, straight from the store", () => {
    // 95 fresh samples → shrinkage n/(n+10) = 0.905 → capped at 0.9
    const many = Array.from({ length: 95 }, (_, i) => completeSignal(i + 1, { grade: 1.0, executionId: `exec-${i + 1}` }))
    const statsCapped = storeFrom(many).stats(now)
    const vmCapped = buildViewModel(input({ signals: many, storeStats: statsCapped }), "ses-A")
    expect(vmCapped.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")?.confidence).toBe(0.9)

    // 5 samples, 40 days old → shrinkage 0.333 × freshness 0.5^(40/14) ≈ 0.046 (NOT 0.333)
    const stale = [1, 2, 3, 4, 5].map((i) => completeSignal(i, { grade: 1.0, timestamp: "2026-07-21T12:00:00.000Z" }))
    const statsStale = storeFrom(stale).stats(now)
    const vmStale = buildViewModel(input({ signals: stale, storeStats: statsStale }), "ses-A")
    const row = vmStale.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")
    expect(row!.confidence).toBeCloseTo(statsStale.qualityBySegment.get("ui-fix|b-ai/glm-5.3-flash#max")!.confidence, 10)
    expect(row!.confidence).toBeLessThan(0.1)
    expect(row!.confidence).not.toBeCloseTo(5 / 15, 2) // naive n/(n+10) would be 0.333
  })

  it("merged execution + duplicate suppression come from the store, not the UI", () => {
    const base = completeSignal(1, { grade: 0.8 })
    const dup = { ...base }
    const store = storeFrom([base, dup])
    const stats = store.stats(now)
    // duplicate signalId ignored → still exactly 1 quality entry (n=1 < 5 → no aggregate)
    expect(stats.qualityBySegment.has("ui-fix|b-ai/glm-5.3-flash#max")).toBe(false)
    const vm = buildViewModel(input({ signals: [base, dup], storeStats: stats }), "ses-A")
    // routed variant (#high) surfaces as honest UNPROVEN — no fabricated aggregate anywhere
    expect(vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#high")?.status).toBe("UNPROVEN")
    expect(vm.evidence.find((e) => e.candidateKey === "b-ai/glm-5.3-flash#max")).toBeUndefined()
  })

  it("store unavailable → evidence stays UNKNOWN-safe (empty, no fabricated rows)", () => {
    const vm = buildViewModel(input({ storeStats: null }), "ses-A")
    expect(vm.evidence).toEqual([])
    // scope still reflects the routed task class — absence of aggregates is honest, not "no class"
    expect(vm.evidenceScope).toBe("ui-fix")
    const lines = evidenceLines(vm)
    expect(lines[0]?.text).toContain("none yet")
    expect(lines[0]?.text).toContain("ui-fix")
  })

  it("evidence panel labels the task-class scope and renders variant notation", () => {
    const signals = [1, 2, 3, 4, 5].map((i) => completeSignal(i, { grade: 0.9 }))
    const stats = storeFrom(signals).stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    const text = evidenceLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("scope: ui-fix")
    expect(text).toContain("glm-5.3-flash · max") // LOW-6: `#` renders as `·`
  })
})

// ---------------------------------------------------------------------------
// MEDIUM-2 supporting semantics: allow is never a violation (data-driven, not event-driven)
// ---------------------------------------------------------------------------

describe("M2: security semantics stay data-driven", () => {
  it("allowed tools and permission events never appear as hard denies", () => {
    const vm = buildViewModel(input({
      permissions: [
        { timestamp: "2026-08-30T11:50:00.000Z", sessionId: "ses-A", decision: "allow", rule: "bash" },
        { timestamp: "2026-08-30T11:51:00.000Z", sessionId: "ses-A", observed: "permission.updated", permissionType: "ask" },
      ],
      permissionsStatus: "valid",
    }))
    expect(vm.security.hardDeny).toBe(false)
    expect(vm.security.denies).toHaveLength(0)
  })
  it("tool.execute.before hard-deny rows surface with rule identity, no command payload", () => {
    const vm = buildViewModel(input({
      permissions: [
        { timestamp: "2026-08-30T11:52:00.000Z", sessionId: "ses-A", guard: "tool.execute.before", decision: "deny", rule: "vision-never-promoted", operationPreview: "cmd --redacted" },
      ],
      permissionsStatus: "valid",
    }))
    expect(vm.security.hardDeny).toBe(true)
    expect(vm.security.denies[0]?.rule).toBe("vision-never-promoted")
    expect(vm.security.denies[0]?.preview).toBe("cmd --redacted")
  })
})

// ---------------------------------------------------------------------------
// R2-MED-01: security source provenance — an unavailable/corrupt deny source
// must degrade to UNKNOWN, never fabricate a false non-deny ("ARMED") state.
// R2-LOW-02: invalid freshness input must never render NaN.
// ---------------------------------------------------------------------------

describe("R2-MED-01: security source provenance is honest", () => {
  it("corrupt-permissions-file-degrades-to-unknown", () => {
    const tail = parsePermissionTail('{"timestamp":"t","decision":"allow"}\n{corrupt\n', 120)
    expect(tail.status).toBe("invalid")
    const vm = buildViewModel(input({ permissions: tail.rows, permissionsStatus: tail.status }))
    expect(vm.security.source).toBe("invalid")
    const text = securityLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("UNKNOWN")
    expect(text).not.toContain("ARMED")
    expect(text).toContain("CORRUPT")
  })

  it("permissions-file-missing-never-fabricates-armed", () => {
    const tail = parsePermissionTail(null, 120)
    expect(tail.status).toBe("unavailable")
    const vm = buildViewModel(input({ permissions: [], permissionsStatus: tail.status }))
    expect(vm.security.source).toBe("unavailable")
    expect(vm.security.hardDeny).toBe(false)
    const text = securityLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("UNKNOWN")
    expect(text).not.toContain("ARMED")
    expect(text).toContain("UNAVAILABLE")
  })

  it("mixed-valid-invalid-permission-tail keeps observed denies but degrades headline", () => {
    const deny = JSON.stringify({ timestamp: "2026-08-30T11:52:00.000Z", sessionId: "ses-A", decision: "deny", rule: "vision-never-promoted" })
    const tail = parsePermissionTail(`${deny}\n{partial-write\n`, 120)
    expect(tail.status).toBe("invalid")
    const vm = buildViewModel(input({ permissions: tail.rows, permissionsStatus: tail.status }))
    // observed evidence is preserved, but the guarantee level is capped at UNKNOWN
    expect(vm.security.denies).toHaveLength(1)
    expect(vm.security.hardDeny).toBe(true)
    const text = securityLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("ACTIVE") // deny observed is real evidence
    expect(text).toContain("CORRUPT") // …but the source no longer supports ARMED/ACTIVE certainty
    expect(text).toContain("unknown")
  })

  it("partial-line-permission-write-degrades (transient write burst)", () => {
    const ok = JSON.stringify({ timestamp: "2026-08-30T11:52:00.000Z", decision: "allow" })
    const tail = parsePermissionTail(`${ok}\n{"timestamp":"2026-08-30T11:`, 120)
    expect(tail.status).toBe("invalid")
  })

  it("valid-empty-permissions-source-remains-armed (no overcorrection)", () => {
    const tail = parsePermissionTail("\n", 120)
    expect(tail.status).toBe("valid")
    expect(tail.rows).toHaveLength(0)
    const vm = buildViewModel(input({ permissions: [], permissionsStatus: tail.status }))
    expect(vm.security.source).toBe("valid")
    expect(vm.security.hardDeny).toBe(false)
    const text = securityLines(vm).map((l) => l.text).join("\n")
    expect(text).toContain("ARMED")
    expect(text).not.toContain("UNKNOWN")
  })

  it("parsePermissionTail bounds the tail and skips blank lines", () => {
    const rows = [1, 2, 3].map((i) => JSON.stringify({ i }))
    const tail = parsePermissionTail(`\n${rows.join("\n\n")}\n`, 2)
    expect(tail.status).toBe("valid")
    expect(tail.rows).toHaveLength(2)
    expect(tail.rows[0]).toEqual({ i: 2 })
  })
})

describe("R2-LOW-02: freshness presentation rejects NaN", () => {
  it("freshness-invalid-timestamp-never-renders-nan", () => {
    const signals = [completeSignal(1, { grade: 0.9, timestamp: "not-a-date" })]
    const stats = storeFrom(signals).stats(now)
    const vm = buildViewModel(input({ signals, storeStats: stats }), "ses-A")
    expect(vm.evidence.length).toBeGreaterThan(0)
    for (const e of vm.evidence) {
      // guard emits null for unparseable timestamps — never NaN
      expect(e.freshnessDays).not.toBeNaN()
      expect(e.freshnessDays === null || Number.isFinite(e.freshnessDays)).toBe(true)
    }
    // fmtFreshness renders the canonical unknown dash, never "NaNd"
    expect(fmtFreshness(null)).toBe("—")
    expect(fmtFreshness(Number.NaN)).not.toContain("NaN")
  })
})
