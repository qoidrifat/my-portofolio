// Smart Router v2 — observability (directive #22, #65, #66, #107).
// JSONL appenders for routing + permission decisions. NEVER logs secret values (#22, #50):
// any key matching /secret|token|password|apikey|authorization|credential/i has its value redacted.

import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

const REDACT_KEY = /(secret|token|password|apikey|api_key|authorization|credential|private.?key)/i

export function redact(obj: unknown): unknown {
  if (Array.isArray(obj)) return obj.map(redact)
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
      out[k] = REDACT_KEY.test(k) ? "[REDACTED]" : redact(v)
    }
    return out
  }
  return obj
}

export function aiDir(projectRoot: string): string {
  return join(projectRoot, ".opencode", "ai")
}

export function ensureDirs(projectRoot: string): void {
  for (const d of ["logs", "routing", "permissions", "verification"]) {
    mkdirSync(join(aiDir(projectRoot), d), { recursive: true })
  }
}

export function appendJsonl(projectRoot: string, relPath: string, record: Record<string, unknown>): void {
  try {
    ensureDirs(projectRoot)
    const p = join(aiDir(projectRoot), relPath)
    mkdirSync(dirname(p), { recursive: true })
    appendFileSync(p, JSON.stringify(redact(record)) + "\n")
  } catch {
    // observability must never break the host runtime
  }
}

export function appendText(projectRoot: string, relPath: string, line: string): void {
  try {
    ensureDirs(projectRoot)
    const p = join(aiDir(projectRoot), relPath)
    mkdirSync(dirname(p), { recursive: true })
    appendFileSync(p, line + "\n")
  } catch {}
}

export function writeJson(projectRoot: string, relPath: string, obj: unknown): void {
  try {
    ensureDirs(projectRoot)
    const p = join(aiDir(projectRoot), relPath)
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, JSON.stringify(obj, null, 2) + "\n")
  } catch {}
}

export function readJsonlTail(projectRoot: string, relPath: string, n: number): Record<string, unknown>[] {
  try {
    const p = join(aiDir(projectRoot), relPath)
    if (!existsSync(p)) return []
    const lines = readFileSync(p, "utf8").trim().split("\n").filter(Boolean)
    return lines.slice(-n).map((l) => JSON.parse(l))
  } catch {
    return []
  }
}

// canonical log targets
export const LOG = {
  routing: "routing/routing-decisions.jsonl",
  permissions: "permissions/permission-decisions.jsonl",
  smartRouterLog: "logs/smart-router.jsonl",
  permissionLog: "logs/permission-router.jsonl",
  routerLog: "logs/smart-router.log",
  permissionTextLog: "logs/permission-router.log",
  health: "verification/smart-router-health.json",
}
