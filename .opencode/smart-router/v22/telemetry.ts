// Smart Router V2.2 — observational instrumentation emitters T1–T5 (Phase K).
// INSTRUMENTATION_SPEC: OBSERVATIONAL ONLY · FAIL-OPEN · NON-BLOCKING (I-021).
// Emitter failure → swallowed + degraded counter; routing/permission/breaker/security unaffected.

import { appendFileSync, existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs"
import { join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { TELEMETRY_DIR, type T1EvaluationAttributed, type T2ExecutionOutcomeEvent, type T3LatencyWindow, type T4CostUsage, type T5CapabilityProbe, type TelemetryEnvelope } from "./types.ts"

export const RETENTION_DAYS = 30

export interface TelemetryDiagnostics {
  degradedCount: number
  written: number
}

const diagnostics: TelemetryDiagnostics = { degradedCount: 0, written: 0 }

export function telemetryDiagnostics(): TelemetryDiagnostics {
  return { ...diagnostics }
}

export function bumpDegraded(n = 1): void {
  diagnostics.degradedCount += n
}

export function telemetryDir(root: string = process.cwd()): string {
  return resolve(root, TELEMETRY_DIR)
}

function emit(root: string, record: TelemetryEnvelope): void {
  try {
    const dir = telemetryDir(root)
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true })
    const file = join(dir, `${record.event.toLowerCase()}.jsonl`)
    appendFileSync(file, JSON.stringify(record) + "\n", "utf8")
    diagnostics.written++
  } catch {
    diagnostics.degradedCount++ // fail-open: counting is the only effect
  }
}

function envelope(event: TelemetryEnvelope["event"]): TelemetryEnvelope {
  return { schemaVersion: 1, event, timestamp: new Date().toISOString(), eventId: `EVT-${randomUUID()}`, provenance: ["smart-router/v22"] }
}

export type T1Input = Omit<T1EvaluationAttributed, keyof TelemetryEnvelope>
export type T2Input = Omit<T2ExecutionOutcomeEvent, keyof TelemetryEnvelope>
export type T3Input = Omit<T3LatencyWindow, keyof TelemetryEnvelope>
export type T4Input = Omit<T4CostUsage, keyof TelemetryEnvelope>
export type T5Input = Omit<T5CapabilityProbe, keyof TelemetryEnvelope>

export function emitT1(root: string, input: T1Input): void {
  emit(root, { ...envelope("T1"), ...input })
}
export function emitT2(root: string, input: T2Input): void {
  emit(root, { ...envelope("T2"), ...input })
}
export function emitT3(root: string, input: T3Input): void {
  emit(root, { ...envelope("T3"), ...input })
}
export function emitT4(root: string, input: T4Input): void {
  emit(root, { ...envelope("T4"), ...input })
}
export function emitT5(root: string, input: T5Input): void {
  emit(root, { ...envelope("T5"), ...input })
}

/** Retention sweep: delete telemetry files older than 30 days. Observational too — never throws. */
export function sweepRetention(root: string, now: number = Date.now()): number {
  let removed = 0
  try {
    const dir = telemetryDir(root)
    if (!existsSync(dir)) return 0
    const cutoff = now - RETENTION_DAYS * 24 * 3_600_000
    for (const f of readdirSync(dir)) {
      const p = join(dir, f)
      try {
        if (statSync(p).mtimeMs < cutoff) {
          unlinkSync(p)
          removed++
        }
      } catch {
        // single-file failure never blocks the sweep
      }
    }
  } catch {
    diagnostics.degradedCount++
  }
  return removed
}
