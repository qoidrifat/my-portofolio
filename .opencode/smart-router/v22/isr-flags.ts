// Smart Router V2.2 — ISR (Abort → Switch → Replay) flags.
// SEPARATE from v22-flags.json: V2.2 shadow semantics are untouched by ISR.
// Default OFF (fail-safe). This feature is RESTART-ON-SWITCH, never true
// in-flight model mutation (verified against OpenCode 1.18.25: switchModel
// affects "subsequent provider turns"; interrupted generation is terminated).

import { existsSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"

export const ISR_FLAGS_FILE = ".opencode/smart-router/v22-isr-flags.json"

export type IsrMode = "off" | "advisory" | "confirm"

const MODES: IsrMode[] = ["off", "advisory", "confirm"]

export interface IsrFlags {
  mode: IsrMode
}

export function loadIsrFlags(root: string = process.cwd()): IsrFlags {
  try {
    const p = resolve(root, ISR_FLAGS_FILE)
    if (!existsSync(p)) return { mode: "off" }
    const raw = JSON.parse(readFileSync(p, "utf8")) as { mode?: string }
    return { mode: MODES.includes(raw.mode as IsrMode) ? (raw.mode as IsrMode) : "off" }
  } catch {
    return { mode: "off" }
  }
}

export function isrFlagsPath(root: string = process.cwd()): string {
  return join(root, ISR_FLAGS_FILE)
}
