// Consent bridge unit tests — mode confirm (consent-gate model switch).
// Bridge = file protocol antara server plugin (proses server) dan TUI plugin
// (proses TUI): request file per operationId + append-only answers.jsonl +
// always.jsonl pasangan yang di-approve permanen. Fail-closed: timeout => null.
import { mkdirSync, mkdtempSync, rmSync, existsSync, readFileSync, appendFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, describe, expect, it } from "vitest"
import {
  writeConsentRequest,
  writeConsentAnswer,
  readLatestAnswer,
  waitForConsent,
  cleanupConsentRequest,
  listConsentRequests,
  createProductionAskConsent,
  CONSENT_DIR,
} from "../../.opencode/smart-router/v22/consent.ts"

const dirs: string[] = []
afterEach(() => {
  for (const d of dirs.splice(0)) rmSync(d, { recursive: true, force: true })
})
const tmp = (): string => {
  const d = mkdtempSync(join(tmpdir(), "consent-"))
  dirs.push(d)
  mkdirSync(join(d, CONSENT_DIR), { recursive: true })
  return d
}

const REQ = { operationId: "isr-x1", sessionId: "s1", from: "a/old", to: "b/new", variant: "max", reason: "test", createdAt: 1 }

describe("consent bridge", () => {
  it("write+read request roundtrip + list", () => {
    const root = tmp()
    writeConsentRequest(root, REQ)
    const raw = JSON.parse(readFileSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"), "utf8")) as { operationId: string; to: string }
    expect(raw.operationId).toBe("isr-x1")
    expect(raw.to).toBe("b/new")
    expect(listConsentRequests(root).map((r) => r.operationId)).toEqual(["isr-x1"])
  })

  it("readLatestAnswer: null tanpa jawaban; resolve jawaban terakhir per operationId", () => {
    const root = tmp()
    expect(readLatestAnswer(root, "isr-x1")).toBeNull()
    writeConsentAnswer(root, { operationId: "isr-other", answer: "deny" })
    writeConsentAnswer(root, { operationId: "isr-x1", answer: "approve" })
    expect(readLatestAnswer(root, "isr-x1")?.answer).toBe("approve")
  })

  it("waitForConsent: resolve saat jawaban muncul; request file di-cleanup", async () => {
    const root = tmp()
    writeConsentRequest(root, REQ)
    const p = waitForConsent(root, "isr-x1", 2000)
    setTimeout(() => writeConsentAnswer(root, { operationId: "isr-x1", answer: "deny" }), 80)
    expect((await p)?.answer).toBe("deny")
    expect(existsSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"))).toBe(false)
  })

  it("waitForConsent: null saat timeout (fail-closed)", async () => {
    const root = tmp()
    writeConsentRequest(root, REQ)
    expect(await waitForConsent(root, "isr-x1", 120)).toBeNull()
  })

  it("cleanupConsentRequest: menghapus request file", () => {
    const root = tmp()
    writeConsentRequest(root, REQ)
    cleanupConsentRequest(root, "isr-x1")
    expect(existsSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"))).toBe(false)
  })

  it("createProductionAskConsent: always-allow pair → approve langsung, tanpa request file", async () => {
    const root = tmp()
    appendFileSync(join(root, CONSENT_DIR, "always.jsonl"), "a/old>b/new\n")
    const ask = createProductionAskConsent(root, 200)
    expect(await ask(REQ)).toBe("approve")
    expect(existsSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"))).toBe(false)
  })

  it("createProductionAskConsent: tanpa always → request file dibuat; approve+always → pasangan terekam", async () => {
    const root = tmp()
    const ask = createProductionAskConsent(root, 2000)
    const p = ask(REQ)
    await new Promise((r) => setTimeout(r, 100))
    expect(existsSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"))).toBe(true)
    setTimeout(() => writeConsentAnswer(root, { operationId: "isr-x1", answer: "approve", always: true }), 80)
    expect(await p).toBe("approve")
    expect(readFileSync(join(root, CONSENT_DIR, "always.jsonl"), "utf8")).toContain("a/old>b/new")
  })

  it("createProductionAskConsent: timeout → 'timeout', request file ter-cleanup", async () => {
    const root = tmp()
    const ask = createProductionAskConsent(root, 120)
    expect(await ask(REQ)).toBe("timeout")
    expect(existsSync(join(root, CONSENT_DIR, "requests", "isr-x1.json"))).toBe(false)
  })
})
