// Smart Router v2 — status writer (directive #108) + notifier (#35 file list).

import { writeJson, appendText } from "./logger.ts"
import { loadConfig, ROUTER_VERSION } from "./config.ts"
import { loadState } from "./session-state.ts"
import { loadBreaker } from "./circuit-breaker.ts"
import { buildRegistry } from "./capability.ts"

export function writeStatus(projectRoot: string, extra: Record<string, unknown> = {}): Record<string, unknown> {
  const cfg = loadConfig(projectRoot)
  const state = loadState(projectRoot)
  const breaker = loadBreaker(projectRoot)
  const registry = buildRegistry()
  const status = {
    enabled: cfg.mode !== "off",
    mode: cfg.mode.toUpperCase(),
    permissionMode: cfg.permissionMode.toUpperCase(),
    routerVersion: ROUTER_VERSION,
    opencodeVersion: process.env.OPENCODE_VERSION || "1.18.25",
    currentAgent: Object.values(state.sessions).at(-1)?.currentRoute.agent ?? null,
    currentModel: Object.values(state.sessions).at(-1)?.currentRoute.model ?? null,
    currentVariant: Object.values(state.sessions).at(-1)?.currentRoute.variant ?? null,
    lastDecision: Object.values(state.sessions).at(-1)?.lastDecision ?? {},
    health: {
      registryModels: registry.models.length,
      breakerKeys: Object.keys(breaker.entries).length,
      openBreakers: Object.entries(breaker.entries).filter(([, e]) => e.state === "open").map(([k]) => k),
      trackedSessions: Object.keys(state.sessions).length,
    },
    blockers: [],
    ...extra,
  }
  writeJson(projectRoot, "../smart-router/status.json", status)
  return status
}

export function notify(projectRoot: string, level: "info" | "warn" | "error", message: string): void {
  appendText(projectRoot, "logs/notifications.log", `${new Date().toISOString()} [${level.toUpperCase()}] ${message}`)
}
