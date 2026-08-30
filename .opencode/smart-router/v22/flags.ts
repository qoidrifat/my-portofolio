// Smart Router V2.2 — feature flags (Phase W).
// Default OFF (byte-identical v2.1.0 behavior). Ladder: OFF → SHADOW → ADVISORY → OPTIMIZED.
// Flag file: .opencode/smart-router/v22-flags.json (absent/corrupt ⇒ OFF — fail-safe default).

import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import type { RouterMode } from "./types.ts"

export const FLAGS_FILE = ".opencode/smart-router/v22-flags.json"

export interface V22Flags {
  mode: RouterMode
  /** Shadow writes telemetry but selection stays V2.1 (always true unless mode OPTIMIZED). */
  shadowZeroInfluence: true
}

const MODES: RouterMode[] = ["OFF", "SHADOW", "ADVISORY", "OPTIMIZED"]

export function loadFlags(root: string = process.cwd()): V22Flags {
  try {
    const p = resolve(root, FLAGS_FILE)
    if (!existsSync(p)) return { mode: "OFF", shadowZeroInfluence: true }
    const raw = JSON.parse(readFileSync(p, "utf8")) as { mode?: string }
    const mode = MODES.includes(raw.mode as RouterMode) ? (raw.mode as RouterMode) : "OFF"
    return { mode, shadowZeroInfluence: true }
  } catch {
    return { mode: "OFF", shadowZeroInfluence: true }
  }
}

export function flagsPath(root: string = process.cwd()): string {
  return join(root, FLAGS_FILE)
}
