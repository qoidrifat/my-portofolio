// Smart Router v2 — circuit breaker (directive #33, #34, #96).
// Per provider+model failure tracking; transient failures never permanently blacklist (#33).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

export interface BreakerEntry {
  state: "closed" | "open" | "half_open"
  failures: number
  lastFailureAt: string | null
  openedAt: string | null
  lastError: string | null
}

export interface BreakerState {
  updatedAt: string
  cooldownMs: number
  failureThreshold: number
  entries: Record<string, BreakerEntry>
}

export interface BreakerOptions {
  cooldownMs?: number
  failureThreshold?: number
}

export function breakerPath(projectRoot: string): string {
  return join(projectRoot, ".opencode", "ai", "routing", "circuit-breaker.json")
}

export function loadBreaker(projectRoot: string, opts: BreakerOptions = {}): BreakerState {
  const defaults: BreakerState = { updatedAt: new Date().toISOString(), cooldownMs: opts.cooldownMs ?? 5 * 60_000, failureThreshold: opts.failureThreshold ?? 3, entries: {} }
  const p = breakerPath(projectRoot)
  if (!existsSync(p)) return defaults
  try {
    const raw = JSON.parse(readFileSync(p, "utf8"))
    return { ...defaults, ...raw, entries: raw.entries ?? {} }
  } catch {
    return defaults
  }
}

function save(projectRoot: string, state: BreakerState) {
  state.updatedAt = new Date().toISOString()
  mkdirSync(dirname(breakerPath(projectRoot)), { recursive: true })
  writeFileSync(breakerPath(projectRoot), JSON.stringify(state, null, 2) + "\n")
}

function entryFor(state: BreakerState, key: string): BreakerEntry {
  return state.entries[key] ?? { state: "closed", failures: 0, lastFailureAt: null, openedAt: null, lastError: null }
}

export function recordFailure(projectRoot: string, key: string, error: string, opts: BreakerOptions = {}): BreakerState {
  const state = loadBreaker(projectRoot, opts)
  const e = entryFor(state, key)
  e.failures += 1
  e.lastFailureAt = new Date().toISOString()
  e.lastError = String(error ?? "").slice(0, 300)
  if (e.failures >= state.failureThreshold) {
    e.state = "open"
    e.openedAt = e.lastFailureAt
  }
  state.entries[key] = e
  save(projectRoot, state)
  return state
}

export function recordSuccess(projectRoot: string, key: string, opts: BreakerOptions = {}): BreakerState {
  const state = loadBreaker(projectRoot, opts)
  state.entries[key] = { state: "closed", failures: 0, lastFailureAt: null, openedAt: null, lastError: null }
  save(projectRoot, state)
  return state
}

export function breakerStatus(projectRoot: string, key: string, opts: BreakerOptions = {}): BreakerEntry {
  const state = loadBreaker(projectRoot, opts)
  const e = entryFor(state, key)
  if (e.state === "open" && e.openedAt) {
    if (Date.now() - new Date(e.openedAt).getTime() >= state.cooldownMs) {
      // cooldown elapsed -> probe
      return { ...e, state: "half_open" }
    }
  }
  return e
}

export function isAvailable(projectRoot: string, key: string, opts: BreakerOptions = {}): boolean {
  const s = breakerStatus(projectRoot, key, opts)
  return s.state !== "open"
}

export function resetBreaker(projectRoot: string, key: string | null = null, opts: BreakerOptions = {}): BreakerState {
  const state = loadBreaker(projectRoot, opts)
  if (key) delete state.entries[key]
  else state.entries = {}
  save(projectRoot, state)
  return state
}
