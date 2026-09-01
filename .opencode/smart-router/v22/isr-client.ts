// Smart Router V2.2 — ISR host client (OpenCode 1.18.25).
// Endpoints verified against the installed binary and live disposable E2E (2026-09-01):
//   POST /session/{id}/abort                    — legacy abort: stops the ENTIRE agent loop
//                                                 (measured). The v2 interrupt only kills the
//                                                 current provider call; the loop continues.
//   POST /api/session/{id}/model  {model}       — switch model for SUBSEQUENT provider turns
//   POST /api/session/{id}/prompt {prompt}      — durably admit input + schedule agent loop
//                                                 (no chat.message fired on this path — no
//                                                 ISR recursion)
//   GET  /api/session/{id}                      — authoritative session state (model)
// ModelRef on the wire: { providerID, id, variant }.

import type { IsrModelRef, IsrOps } from "./isr-coordinator.ts"

export interface IsrClientConfig {
  baseUrl: string
  fetchImpl?: typeof fetch
  /** Per-request timeout (F-06). A hung op must not poison the session's inflight state. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export function createIsrOps(config: IsrClientConfig): IsrOps {
  const doFetch = config.fetchImpl ?? fetch
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const call = async (path: string, method: "GET" | "POST", body?: unknown): Promise<Response> => {
    const res = await doFetch(config.baseUrl + path, {
      method,
      headers: body !== undefined ? { "content-type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(timeoutMs),
    })
    if (!res.ok) throw new Error(`isr-client ${method} ${path} -> ${res.status}`)
    return res
  }

  return {
    async abort(sessionId: string): Promise<void> {
      await call(`/session/${encodeURIComponent(sessionId)}/abort`, "POST")
    },
    async switchModel(sessionId: string, model: IsrModelRef): Promise<void> {
      await call(`/api/session/${encodeURIComponent(sessionId)}/model`, "POST", {
        model: { providerID: model.providerID, id: model.modelID, ...(model.variant ? { variant: model.variant } : {}) },
      })
    },
    async prompt(sessionId: string, text: string): Promise<void> {
      await call(`/api/session/${encodeURIComponent(sessionId)}/prompt`, "POST", { prompt: { text } })
    },
    async getSessionModel(sessionId: string): Promise<IsrModelRef | null> {
      try {
        const res = await call(`/api/session/${encodeURIComponent(sessionId)}`, "GET")
        const json = (await res.json()) as { data?: { model?: { providerID?: string; id?: string; variant?: string } } }
        const m = json?.data?.model
        if (!m?.providerID || !m?.id) return null
        return { providerID: m.providerID, modelID: m.id, variant: m.variant ?? null }
      } catch {
        return null
      }
    },
  }
}
