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
//
// RUNTIME CONTRACT (verified against opencode 1.18.26 source):
//   In TUI mode, the server runs in-process (no TCP listener). The plugin's `client`
//   (OpencodeClient from @opencode-ai/sdk) is created with a custom `fetch` that routes
//   HTTP requests to Server.Default().app.fetch — the in-process Hono router. The
//   `serverUrl` getter returns http://localhost:4096 (unreachable via TCP).
//   In serve mode, the server listens on a real port and the client uses real HTTP fetch.
//   Therefore ISR ops MUST use the SDK client's internal request machinery (client._client)
//   instead of raw fetch + serverUrl — the client works correctly in both modes.

import type { IsrModelRef, IsrOps } from "./isr-coordinator.ts"

/**
 * Minimal structural shape of the SDK's underlying hey-api Client we drive.
 * The real type (OpencodeClient from @opencode-ai/sdk) exposes `_client` as a
 * PROTECTED member, so a full narrow is impossible without an internal cast.
 * This interface pins the exact surface ISR uses and removes bare `any`.
 */
export interface IsrSdkHttpClient {
  _client: {
    post: (opts: Record<string, unknown>) => Promise<{ data: unknown; error: unknown; response: Response }>
    get: (opts: Record<string, unknown>) => Promise<{ data: unknown; error: unknown; response: Response }>
    delete: (opts: Record<string, unknown>) => Promise<{ data: unknown; error: unknown; response: Response }>
  }
}

export interface IsrClientConfig {
  baseUrl?: string
  /** SDK OpencodeClient from plugin input. When provided, ISR ops use the client's
   *  internal request machinery (works in TUI in-process and serve HTTP modes).
   *  When absent, ops use raw fetch with baseUrl (test harness only). */
  client?: unknown
  fetchImpl?: typeof fetch
  /** Per-request timeout (F-06). A hung op must not poison the session's inflight state. */
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export function createIsrOps(config: IsrClientConfig): IsrOps {
  const timeoutMs = config.timeoutMs ?? DEFAULT_TIMEOUT_MS

  // F-06 bounded-lifetime guard: settle the op no later than timeoutMs regardless
  // of whether the underlying transport honors the abort signal. Always fail-closed.
  const bounded = async <T>(what: string, run: (signal: AbortSignal) => Promise<T>): Promise<T> => {
    const signal = AbortSignal.timeout(timeoutMs)
    let timer: ReturnType<typeof setTimeout> | undefined
    const deadline = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`isr-client ${what} timed out after ${timeoutMs}ms (F-06)`)), timeoutMs)
    })
    try {
      return await Promise.race([run(signal), deadline])
    } finally {
      if (timer) clearTimeout(timer)
    }
  }

  // SDK client path — works in both TUI (in-process app.fetch) and serve (real HTTP).
  if (config.client) {
    const c = (config.client as unknown as IsrSdkHttpClient)._client

    const call = async (url: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Response> => {
      const opts: Record<string, unknown> = { url }
      if (body !== undefined) {
        opts.body = body
        opts.headers = { "content-type": "application/json" }
      }
      const fn = method === "GET" ? c.get : method === "DELETE" ? c.delete : c.post
      const result = await bounded(`${method} ${url}`, (signal) => fn({ ...opts, signal }))
      if (!result.response.ok) throw new Error(`isr-client ${method} ${url} -> ${result.response.status}`)
      return result.response
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
      async prompt(sessionId: string, text: string, model: IsrModelRef): Promise<void> {
        // 2026-09-03: POST /session/:id/prompt with the TARGET model in the body
        // (turn-level binding). The steer path /api/session/:id/prompt never persists
        // the replay turn, and POST /api/session/:id/model poisons later persistence.
        // Wire model format splits on the FIRST slash: "9router/b.ai/x" → provider
        // "9router" + model "b.ai/x" (matches host stream logs).
        const qualified = `${model.providerID}/${model.modelID}`
        const sep = qualified.indexOf("/")
        const wireModel = {
          providerID: qualified.slice(0, sep),
          modelID: qualified.slice(sep + 1),
          ...(model.variant ? { variant: model.variant } : {}),
        }
        await call(`/session/${encodeURIComponent(sessionId)}/prompt`, "POST", {
          model: wireModel,
          agent: "build",
          parts: [{ type: "text", text }],
        })
      },
      async deleteMessage(sessionId: string, messageId: string): Promise<void> {
        // SDK v2: DELETE /session/{sessionID}/message/{messageID} — permanent, no revert.
        await call(
          `/session/${encodeURIComponent(sessionId)}/message/${encodeURIComponent(messageId)}`,
          "DELETE",
        )
      },
      async getSessionModel(sessionId: string): Promise<IsrModelRef | null> {
        try {
          const result = await bounded(`GET /api/session/${sessionId}`, (signal) =>
            c.get({ url: `/api/session/${encodeURIComponent(sessionId)}`, signal }),
          )
          // the SDK client already parsed the body into result.data; response.json() is consumed
          const body = (result.data ?? (await result.response.json())) as {
            data?: { model?: { providerID?: string; id?: string; variant?: string } }
          }
          const m = body?.data?.model
          if (!m?.providerID || !m?.id) return null
          return { providerID: m.providerID, modelID: m.id, variant: m.variant ?? null }
        } catch {
          return null
        }
      },
    }
  }

  // Legacy raw-fetch path (for tests without a live server).
  const doFetch = config.fetchImpl ?? fetch
  const call = async (path: string, method: "GET" | "POST" | "DELETE", body?: unknown): Promise<Response> => {
    const res = await doFetch(config.baseUrl! + path, {
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
    async prompt(sessionId: string, text: string, model: IsrModelRef): Promise<void> {
      const qualified = `${model.providerID}/${model.modelID}`
      const sep = qualified.indexOf("/")
      const wireModel = {
        providerID: qualified.slice(0, sep),
        modelID: qualified.slice(sep + 1),
        ...(model.variant ? { variant: model.variant } : {}),
      }
      await call(`/session/${encodeURIComponent(sessionId)}/prompt`, "POST", {
        model: wireModel,
        agent: "build",
        parts: [{ type: "text", text }],
      })
    },
    async deleteMessage(sessionId: string, messageId: string): Promise<void> {
      await call(`/session/${encodeURIComponent(sessionId)}/message/${encodeURIComponent(messageId)}`, "DELETE")
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
