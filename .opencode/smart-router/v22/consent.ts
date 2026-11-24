// Smart Router V2.2 — consent bridge (mode confirm).
// Protokol file antara server plugin (proses server) dan TUI plugin (proses TUI):
//   request : requests/{operationId}.json  (satu file per operasi)
//   answer  : answers.jsonl                (append-only; pembaca scan mundur)
//   always  : always.jsonl                 ("from>to" per baris — pasangan yang di-approve permanen)
// Fail-closed: timeout/error => null/"timeout" => caller memperlakukan sebagai deny
// (turn lanjut model lama). Tidak ada prompt content yang ditulis ke file consent.

import { appendFileSync, existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { join } from "node:path"

export const CONSENT_DIR = ".opencode/ai/consent"

export interface ConsentRequest {
  operationId: string
  sessionId: string
  from: string
  to: string
  variant: string | null
  reason: string
  createdAt: number
}

export interface ConsentAnswer {
  operationId: string
  answer: "approve" | "deny"
  always?: boolean
}

const dir = (root: string): string => join(root, CONSENT_DIR)
const reqDir = (root: string): string => join(dir(root), "requests")
const ansFile = (root: string): string => join(dir(root), "answers.jsonl")
const alwaysFile = (root: string): string => join(dir(root), "always.jsonl")

export function writeConsentRequest(root: string, req: ConsentRequest): void {
  mkdirSync(reqDir(root), { recursive: true })
  writeFileSync(join(reqDir(root), `${req.operationId}.json`), JSON.stringify(req))
}

export function writeConsentAnswer(root: string, answer: ConsentAnswer): void {
  mkdirSync(dir(root), { recursive: true })
  appendFileSync(ansFile(root), JSON.stringify(answer) + "\n")
}

export function readLatestAnswer(root: string, operationId: string): ConsentAnswer | null {
  try {
    if (!existsSync(ansFile(root))) return null
    const lines = readFileSync(ansFile(root), "utf8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0)
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const a = JSON.parse(lines[i]) as ConsentAnswer
        if (a.operationId === operationId) return a
      } catch {
        // baris parsial (write bersamaan) — lewati
      }
    }
    return null
  } catch {
    return null
  }
}

export function cleanupConsentRequest(root: string, operationId: string): void {
  try {
    const p = join(reqDir(root), `${operationId}.json`)
    if (existsSync(p)) unlinkSync(p)
  } catch {
    // fail-open
  }
}

/** Resolve saat jawaban muncul; null saat timeout. Request file selalu di-cleanup. */
export function waitForConsent(root: string, operationId: string, timeoutMs: number): Promise<ConsentAnswer | null> {
  return new Promise((resolve) => {
    const started = Date.now()
    const tick = (): void => {
      const a = readLatestAnswer(root, operationId)
      if (a) {
        cleanupConsentRequest(root, operationId)
        resolve(a)
        return
      }
      if (Date.now() - started >= timeoutMs) {
        cleanupConsentRequest(root, operationId)
        resolve(null)
        return
      }
      setTimeout(tick, 150)
    }
    tick()
  })
}

export function listConsentRequests(root: string): ConsentRequest[] {
  try {
    const d = reqDir(root)
    if (!existsSync(d)) return []
    const out: ConsentRequest[] = []
    for (const f of readdirSync(d)) {
      if (!f.endsWith(".json")) continue
      try {
        out.push(JSON.parse(readFileSync(join(d, f), "utf8")) as ConsentRequest)
      } catch {
        // file parsial — lewati
      }
    }
    return out
  } catch {
    return []
  }
}

function readAlwaysPairs(root: string): Set<string> {
  try {
    const p = alwaysFile(root)
    if (!existsSync(p)) return new Set()
    // trim() strips \r from CRLF writes (Windows tooling) — otherwise the set never matches
    return new Set(readFileSync(p, "utf8").split("\n").map((l) => l.trim()).filter((l) => l.length > 0))
  } catch {
    return new Set()
  }
}

function rememberAlwaysPair(root: string, key: string): void {
  try {
    mkdirSync(dir(root), { recursive: true })
    appendFileSync(alwaysFile(root), key + "\n")
  } catch {
    // fail-open: kegagalan mengingat pasangan hanya berarti popup muncul lagi
  }
}

/**
 * Production askConsent (dipakai plugin server, mode confirm):
 *   1. pasangan from>to ada di always.jsonl → "approve" langsung (tanpa popup)
 *   2. selain itu: tulis request → tunggu jawaban TUI (timeoutMs) → map ke decision
 * Jawaban dengan always:true diingat permanen.
 */
export function createProductionAskConsent(
  root: string,
  timeoutMs = 120_000,
): (req: ConsentRequest) => Promise<"approve" | "deny" | "timeout"> {
  return async (req) => {
    const key = `${req.from}>${req.to}`
    if (readAlwaysPairs(root).has(key)) return "approve"
    try {
      writeConsentRequest(root, req)
    } catch {
      return "timeout" // tanpa channel consent, jangan pernah switch
    }
    const a = await waitForConsent(root, req.operationId, timeoutMs)
    if (a?.always) rememberAlwaysPair(root, key)
    return a?.answer ?? "timeout"
  }
}
