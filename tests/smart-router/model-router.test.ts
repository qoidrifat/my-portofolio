// Smart Router v2 — model routing baseline tests.
// Ports the Phase-7 baseline suite (17/17) from .opencode-backups/smart-router-v2-2026-08-28/test-model-router.ps1
// to vitest, asserting identical decision semantics against the same verified capability registry.

import { describe, it, expect } from "vitest"
import { resolve, dirname } from "node:path"
import { fileURLToPath } from "node:url"
import { readFileSync } from "node:fs"
import { buildRegistry } from "../../.opencode/smart-router/capability.ts"
import { resolveModelRoute } from "../../.opencode/smart-router/model-router.ts"
import type { Complexity, Modality } from "../../.opencode/smart-router/types.ts"

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..")
const registry = buildRegistry()
const policy = JSON.parse(readFileSync(resolve(ROOT, ".opencode/smart-router/routing-policy.json"), "utf8"))

function run(t: {
  TaskType: string
  Complexity?: Complexity
  Modality?: Modality
  LatencyPreference?: "normal" | "speed"
  ModelOverride?: string
  VariantOverride?: string
}) {
  return resolveModelRoute(registry, policy, {
    matchedTaskClass: t.TaskType,
    complexity: t.Complexity ?? "medium",
    modality: t.Modality ?? "text",
    latencyPreference: t.LatencyPreference ?? "normal",
    qualityPreference: "normal",
    modelOverride: t.ModelOverride ?? null,
    variantOverride: t.VariantOverride ?? null,
  })
}

interface Case {
  name: string
  args: Record<string, string>
  expect: Record<string, string>
}

const cases: Case[] = [
  { name: "crud-simple routes to build/M3/balanced, fb M3 fast",
    args: { TaskType: "crud-simple" },
    expect: { status: "RESOLVED", agent: "build", model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "balanced", fallback0_model: "minimaxm3new/MiniMaxAI/MiniMax-M3", fallback0_variant: "fast" } },
  { name: "normal coding -> OpenRouter M3 free deep (fb native GMI M3 deep via chain)",
    args: { TaskType: "standard-coding" },
    expect: { status: "RESOLVED", agent: "build", model: "open-router/minimax/minimax-m3:free", variant: "deep" } },
  { name: "security-review -> reviewer GLM max (benchmark-led), fb GLM high then DeepSeek max then qwen max",
    args: { TaskType: "security-review" },
    expect: { status: "RESOLVED", agent: "reviewer", model: "b-ai/glm-5.3-flash", variant: "max", fallback0_model: "b-ai/glm-5.3-flash", fallback0_variant: "high", fallback1_model: "b-ai/deepseek-v4-flash", fallback1_variant: "max", fallback2_model: "b-ai/qwen3.8-flash", fallback2_variant: "max" } },
  { name: "repo-research -> research GLM max (benchmark-led)",
    args: { TaskType: "repo-research" },
    expect: { status: "RESOLVED", agent: "research", model: "b-ai/glm-5.3-flash", variant: "max" } },
  { name: "architecture-analysis -> research GLM max",
    args: { TaskType: "architecture-analysis" },
    expect: { status: "RESOLVED", agent: "research", model: "b-ai/glm-5.3-flash", variant: "max" } },
  { name: "ui-implementation -> frontend M3 deep",
    args: { TaskType: "ui-implementation" },
    expect: { status: "RESOLVED", agent: "frontend", model: "minimaxm3new/MiniMaxAI/MiniMax-M3", variant: "deep" } },
  { name: "react-next-architecture -> frontend GLM max",
    args: { TaskType: "react-next-architecture" },
    expect: { status: "RESOLVED", agent: "frontend", model: "b-ai/glm-5.3-flash", variant: "max" } },
  { name: "routine-review -> reviewer GLM high (low-effort tier)",
    args: { TaskType: "routine-review" },
    expect: { status: "RESOLVED", agent: "reviewer", model: "b-ai/glm-5.3-flash", variant: "high" } },
  { name: "complex-debugging -> reviewer GLM max (benchmark-led)",
    args: { TaskType: "complex-debugging" },
    expect: { status: "RESOLVED", agent: "reviewer", model: "b-ai/glm-5.3-flash", variant: "max" } },
  { name: "explicit latency-sensitive class -> build M3 fast",
    args: { TaskType: "latency-sensitive" },
    expect: { status: "RESOLVED", agent: "build", variant: "fast" } },
  { name: "latency preference downgrades standard-coding deep -> balanced",
    args: { TaskType: "standard-coding", LatencyPreference: "speed" },
    expect: { status: "RESOLVED", agent: "build", variant: "balanced", warning_contains: "latency=speed" } },
  { name: "unknown task type degrades to standard-coding",
    args: { TaskType: "totally-unknown-class" },
    expect: { status: "RESOLVED", agent: "build", matched_task_class: "standard-coding", warning_contains: "defaulted" } },
  { name: "complexity=high escalates crud-simple -> standard-coding (deep)",
    args: { TaskType: "crud-simple", Complexity: "high" },
    expect: { status: "RESOLVED", agent: "build", variant: "deep", warning_contains: "escalated" } },
  { name: "PROTECTION: mimo-v2.5 max request clamps to high with TEMPORARILY BLOCKED warning (not UNSUPPORTED)",
    args: { TaskType: "deep-review", ModelOverride: "b-ai/mimo-v2.5", VariantOverride: "max" },
    expect: { status: "RESOLVED", model: "b-ai/mimo-v2.5", variant: "high", warning_contains: "TEMPORARILY BLOCKED" } },
  { name: "PROTECTION: hy3 max rejected by backend -> clamp to high",
    args: { TaskType: "deep-research", ModelOverride: "b-ai/hy3", VariantOverride: "max" },
    expect: { status: "RESOLVED", model: "b-ai/hy3", variant: "high", warning_contains: "clamped" } },
  { name: "vision-task -> BLOCKED, never silent text-only fallback",
    args: { TaskType: "vision-task", Modality: "vision" },
    expect: { status: "BLOCKED", agent: "reviewer" } },
]

describe("model routing baseline (17 cases)", () => {
  for (const c of cases) {
    it(c.name, () => {
      const r = run(c.args as Parameters<typeof run>[0])
      const warnings = r.warnings.join(" | ")
      for (const [k, want] of Object.entries(c.expect)) {
        const m = /^(fallback)(\d+)_(model|variant)$/.exec(k)
        if (m) {
          const got = r.fallback[Number(m[2])]?.[m[3] === "model" ? "model" : "variant"]
          expect(got, `${k}`).toBe(want)
        } else if (k === "warning_contains") {
          expect(warnings).toContain(want)
        } else if (k === "matched_task_class") {
          expect(r.matchedTaskClass).toBe(want)
        } else if (k === "status") {
          expect(r.status).toBe(want)
        } else {
          expect(String((r as unknown as Record<string, unknown>)[k]), k).toBe(want)
        }
      }
    })
  }

  it("determinism: same input twice produces identical decision (byte-identical fields)", () => {
    const d1 = run({ TaskType: "security-review" })
    const d2 = run({ TaskType: "security-review" })
    expect(JSON.stringify(d1)).toBe(JSON.stringify(d2))
  })
})
