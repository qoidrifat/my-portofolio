// Smart Router v2 — session + router state persistence (directive #74, #75).
// Survives new turns, reroutes, and reconnects as far as the host platform allows:
// state is file-persisted under .opencode/ai/routing/ and keyed by session id.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export interface SessionRouteState {
  currentRoute: { model: string | null; variant: string | null; agent: string }
  previousRoute: { model: string | null; variant: string | null; agent: string } | null
  failedRoutes: string[]
  successfulRoutes: string[]
  escalationCount: number
  fallbackCount: number
  rerouteCount: number
  lastDecision: Record<string, unknown> | null
  updatedAt: string
}

export interface RouterState {
  updatedAt: string
  permissionMode: string
  routerMode: string
  sessions: Record<string, SessionRouteState>
}

export function statePath(projectRoot: string): string {
  return join(projectRoot, ".opencode", "ai", "routing", "session-state.json")
}

const EMPTY_SESSION: SessionRouteState = {
  currentRoute: { model: null, variant: null, agent: "build" },
  previousRoute: null,
  failedRoutes: [],
  successfulRoutes: [],
  escalationCount: 0,
  fallbackCount: 0,
  rerouteCount: 0,
  lastDecision: null,
  updatedAt: "",
}

export function loadState(projectRoot: string): RouterState {
  const p = statePath(projectRoot)
  if (!existsSync(p)) return { updatedAt: "", permissionMode: "standard", routerMode: "advisory", sessions: {} }
  try {
    return JSON.parse(readFileSync(p, "utf8"))
  } catch {
    return { updatedAt: "", permissionMode: "standard", routerMode: "advisory", sessions: {} }
  }
}

function save(projectRoot: string, state: RouterState) {
  state.updatedAt = new Date().toISOString()
  mkdirSync(dirname(statePath(projectRoot)), { recursive: true })
  // keep the file bounded: newest 50 sessions
  const entries = Object.entries(state.sessions)
  if (entries.length > 50) {
    entries.sort((a, b) => String(a[1].updatedAt).localeCompare(String(b[1].updatedAt)))
    for (const [k] of entries.slice(0, entries.length - 50)) delete state.sessions[k]
  }
  writeFileSync(statePath(projectRoot), JSON.stringify(state, null, 2) + "\n")
}

export function getSession(projectRoot: string, sessionId: string): SessionRouteState {
  const state = loadState(projectRoot)
  return state.sessions[sessionId] ?? { ...EMPTY_SESSION, currentRoute: { ...EMPTY_SESSION.currentRoute } }
}

export function updateSession(projectRoot: string, sessionId: string, patch: Partial<SessionRouteState>): SessionRouteState {
  const state = loadState(projectRoot)
  const cur = state.sessions[sessionId] ?? { ...EMPTY_SESSION, currentRoute: { ...EMPTY_SESSION.currentRoute } }
  const next: SessionRouteState = { ...cur, ...patch, updatedAt: new Date().toISOString() }
  state.sessions[sessionId] = next
  save(projectRoot, state)
  return next
}

export function recordRoute(projectRoot: string, sessionId: string, route: { model: string | null; variant: string | null; agent: string }, decision: Record<string, unknown>): SessionRouteState {
  const cur = getSession(projectRoot, sessionId)
  return updateSession(projectRoot, sessionId, {
    previousRoute: cur.currentRoute,
    currentRoute: route,
    lastDecision: decision,
  })
}

export function recordFailure(projectRoot: string, sessionId: string, routeKey: string): SessionRouteState {
  const cur = getSession(projectRoot, sessionId)
  if (!cur.failedRoutes.includes(routeKey)) cur.failedRoutes.push(routeKey)
  return updateSession(projectRoot, sessionId, { failedRoutes: cur.failedRoutes })
}

export function recordSuccess(projectRoot: string, sessionId: string, routeKey: string): SessionRouteState {
  const cur = getSession(projectRoot, sessionId)
  if (!cur.successfulRoutes.includes(routeKey)) cur.successfulRoutes.push(routeKey)
  return updateSession(projectRoot, sessionId, { successfulRoutes: cur.successfulRoutes })
}

export function recordReroute(projectRoot: string, sessionId: string, kind: "escalation" | "fallback"): SessionRouteState {
  const cur = getSession(projectRoot, sessionId)
  return updateSession(projectRoot, sessionId, {
    rerouteCount: cur.rerouteCount + 1,
    escalationCount: cur.escalationCount + (kind === "escalation" ? 1 : 0),
    fallbackCount: cur.fallbackCount + (kind === "fallback" ? 1 : 0),
  })
}
