// Smart Router v2 — runtime configuration (mode + permission mode + profiles).
// Persisted at .opencode/smart-router/config.json; /router and /router permissions commands mutate it via the CLI.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export type RouterMode = "auto" | "advisory" | "off"
export type PermissionMode = "safe" | "standard" | "elevated" | "yolo"
export type CostProfile = "economy" | "balanced" | "quality"
export type LatencyProfile = "interactive" | "balanced" | "deep"

export interface RouterConfig {
  mode: RouterMode
  permissionMode: PermissionMode
  costProfile: CostProfile
  latencyProfile: LatencyProfile
  qualityProfile: "standard" | "high"
  updatedAt: string
}

export const DEFAULT_CONFIG: RouterConfig = {
  mode: "advisory",
  permissionMode: "standard",
  costProfile: "balanced",
  latencyProfile: "balanced",
  qualityProfile: "standard",
  updatedAt: "",
}

export const ROUTER_VERSION = "2.1.0"

export function smartRouterDir(projectRoot: string): string {
  return join(projectRoot, ".opencode", "smart-router")
}

export function configPath(projectRoot: string): string {
  return join(smartRouterDir(projectRoot), "config.json")
}

export function loadConfig(projectRoot: string): RouterConfig {
  const p = configPath(projectRoot)
  if (!existsSync(p)) return { ...DEFAULT_CONFIG }
  try {
    const raw = JSON.parse(readFileSync(p, "utf8"))
    return { ...DEFAULT_CONFIG, ...raw }
  } catch {
    return { ...DEFAULT_CONFIG }
  }
}

export function saveConfig(projectRoot: string, patch: Partial<RouterConfig>): RouterConfig {
  const next: RouterConfig = { ...loadConfig(projectRoot), ...patch, updatedAt: new Date().toISOString() }
  mkdirSync(smartRouterDir(projectRoot), { recursive: true })
  writeFileSync(configPath(projectRoot), JSON.stringify(next, null, 2) + "\n")
  return next
}

export function projectRootFromEnv(): string {
  // Plugin runs with cwd = OpenCode server cwd; CLI runs from project root.
  return process.env.SMART_ROUTER_PROJECT_ROOT || process.cwd()
}

export function globalOpencodeDir(): string {
  return process.env.OPENCODE_CONFIG_DIR || join(process.env.USERPROFILE || process.env.HOME || "", ".config", "opencode")
}
