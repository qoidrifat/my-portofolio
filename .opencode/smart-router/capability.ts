// Smart Router v2 — capability registry builder.
// SINGLE SOURCE OF TRUTH: %USERPROFILE%\.config\opencode\opencode-effort-capability-matrix.json (runtime-verified evidence)
// plus %USERPROFILE%\.config\opencode\opencode.jsonc (configured providers/variants).
// No duplicate capability data lives here — this module only NORMALIZES the existing registries (directive #36).

import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import type { ModelRegistry, ModelRegistryEntry, VariantInfo, VariantStatus } from "./types.ts"
import { globalOpencodeDir } from "./config.ts"

export const EFFORT_RANK_ORDER = ["low", "medium", "high", "max", "xhigh"]

export function effortRank(effort: string | null | undefined, order: string[] = EFFORT_RANK_ORDER): number {
  if (!effort) return Number.MAX_SAFE_INTEGER
  const i = order.indexOf(effort)
  return i < 0 ? Number.MAX_SAFE_INTEGER : i
}

interface ConfigVariant { textVerbosity?: string; reasoningEffort?: string }
interface ConfigModel { variants?: Record<string, ConfigVariant> }
interface ConfigProvider { models?: Record<string, ConfigModel> }

interface MatrixVariantResult { result?: string; error?: string | null }
interface MatrixModel {
  model: string
  provider: string
  variant_high?: MatrixVariantResult
  variant_max?: MatrixVariantResult
  variant_xhigh?: MatrixVariantResult
  max_verified?: string
  vision?: boolean
  native_reasoning?: string
}
interface CapabilityMatrix { models?: MatrixModel[] }

function variantStatusForBai(effort: string | null, matrix: MatrixModel): VariantStatus {
  if (effort === "high") return matrix.variant_high?.result === "PASS" ? "VERIFIED" : "UNSUPPORTED"
  if (effort === "max") {
    const r = matrix.variant_max?.result
    if (r === "PASS") return "VERIFIED"
    if (r === "BLOCKED") return "BLOCKED_UPSTREAM"
    return "UNSUPPORTED"
  }
  return "UNSUPPORTED" // xhigh or unknown efforts are rejected by the b.ai backend (verified)
}

export function buildRegistry(globalDir: string = globalOpencodeDir()): ModelRegistry {
  const sources: string[] = []
  const models: ModelRegistryEntry[] = []

  const cfgPath = join(globalDir, "opencode.jsonc")
  const matrixPath = join(globalDir, "opencode-effort-capability-matrix.json")

  let config: { provider?: Record<string, ConfigProvider> } = {}
  if (existsSync(cfgPath)) {
    config = JSON.parse(readFileSync(cfgPath, "utf8"))
    sources.push(cfgPath)
  }
  let matrix: CapabilityMatrix = {}
  if (existsSync(matrixPath)) {
    matrix = JSON.parse(readFileSync(matrixPath, "utf8"))
    sources.push(matrixPath)
  }
  const matrixByModel = new Map<string, MatrixModel>()
  for (const m of matrix.models ?? []) matrixByModel.set(`${m.provider}/${m.model}`, m)

  for (const [providerID, provider] of Object.entries(config.provider ?? {})) {
    for (const [modelID, cm] of Object.entries(provider.models ?? {})) {
      const id = `${providerID}/${modelID}`
      const m = matrixByModel.get(id)
      const variants: VariantInfo[] = Object.entries(cm.variants ?? {}).map(([name, v]) => {
        const effort = v?.reasoningEffort ?? null
        const status: VariantStatus = providerID === "b-ai"
          ? variantStatusForBai(effort, m as MatrixModel)
          : "CONFIGURED"
        return { name, effort, status }
      })
      const rejectedEfforts: string[] = []
      let maxVerified: string | null = null
      if (providerID === "b-ai" && m) {
        if (m.variant_xhigh?.result === "UNSUPPORTED") rejectedEfforts.push("xhigh")
        maxVerified = m.max_verified ?? null
        // SSOT evidence includes variant results (e.g. mimo-v2.5 max BLOCKED, hy3 max UNSUPPORTED)
        // that the config never defines — register them so clamping can distinguish
        // TEMPORARILY BLOCKED from UNSUPPORTED instead of silently ignoring the request.
        const hasMaxEffort = variants.some((v) => v.effort === "max")
        if (!hasMaxEffort && m.variant_max) {
          const status: VariantStatus =
            m.variant_max.result === "PASS" ? "VERIFIED" : m.variant_max.result === "BLOCKED" ? "BLOCKED_UPSTREAM" : "UNSUPPORTED"
          variants.push({ name: "max", effort: "max", status })
        }
      }
      models.push({
        id,
        provider: providerID,
        available: true,
        supportsVision: false, // runtime evidence: b.ai rejects image input; others unverified -> treat as text-only
        maxVerifiedEffort: maxVerified,
        rejectedEfforts,
        variants,
      })
    }
  }
  return { effortRankOrder: [...EFFORT_RANK_ORDER], models, generatedFrom: sources }
}

export function findModel(registry: ModelRegistry, id: string): ModelRegistryEntry | undefined {
  return registry.models.find((m) => m.id === id)
}
