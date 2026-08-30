// Smart Router V2.2 — hysteresis state persistence (Wave 2, M11).
// Append-only JSONL keyed by `${sessionId}::${taskClass}::${risk}`; last entry per key wins on
// load. Fail-open: persistence errors never block routing (ADR-010) — in-memory state remains.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname } from "node:path"
import type { HysteresisState, SegmentKey } from "./types.ts"

export function hysteresisKey(sessionId: string, segment: SegmentKey): string {
  return `${sessionId}::${segment.taskClass}::${segment.risk}`
}

interface PersistedEntry {
  key: string
  state: HysteresisState
}

export class HysteresisStateStore {
  private states = new Map<string, HysteresisState>()
  private readonly filePath: string
  constructor(filePath: string) {
    this.filePath = filePath
  }

  /** Reconstruct state: last-wins per key; corrupted lines skipped (fail-open). */
  load(): void {
    this.states = new Map()
    if (!existsSync(this.filePath)) return
    const lines = readFileSync(this.filePath, "utf8").split("\n").filter(Boolean)
    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as PersistedEntry
        if (entry.key && entry.state?.segment) this.states.set(entry.key, entry.state)
      } catch {
        // corrupted line → skipped
      }
    }
  }

  get(key: string): HysteresisState | null {
    return this.states.get(key) ?? null
  }

  /** In-memory update + append-only persist. Persist failure is swallowed (fail-open). */
  set(key: string, state: HysteresisState): void {
    this.states.set(key, state)
    try {
      mkdirSync(dirname(this.filePath), { recursive: true })
      appendFileSync(this.filePath, JSON.stringify({ key, state } satisfies PersistedEntry) + "\n", "utf8")
    } catch {
      // fail-open: lost persistence degrades stickiness continuity, never safety
    }
  }

  all(): readonly [string, HysteresisState][] {
    return [...this.states.entries()]
  }
}
