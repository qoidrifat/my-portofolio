// ISR client F-06/F-5 tests — per-operation bounded timeout contract on the SDK path.
// Invariant under test: EVERY network-like ISR op must settle (success OR controlled
// failure) within timeoutMs. A hung transport must never leave the op pending forever,
// a stale timeout must never convert a settled result into a different outcome, and the
// AbortSignal must reach the underlying SDK request.
import { describe, expect, it, vi } from "vitest"
import { createIsrOps } from "../../.opencode/smart-router/v22/isr-client.ts"
import type { IsrSdkHttpClient } from "../../.opencode/smart-router/v22/isr-client.ts"

type SdkResult = { data: unknown; error: unknown; response: Response }

function okResponse(json: unknown, status = 200): Response {
  return new Response(JSON.stringify(json), { status, headers: { "content-type": "application/json" } })
}

/** Fake hey-api client recording opts; each verb can be configured to hang or settle. */
function makeSdkClient(handlers: {
  post?: (opts: Record<string, unknown>) => Promise<SdkResult>
  get?: (opts: Record<string, unknown>) => Promise<SdkResult>
}) {
  const calls: { verb: "post" | "get"; opts: Record<string, unknown> }[] = []
  const client = {
    _client: {
      post: vi.fn(async (opts: Record<string, unknown>) => {
        calls.push({ verb: "post", opts })
        if (handlers.post) return handlers.post(opts)
        return { data: {}, error: undefined, response: okResponse({}) }
      }),
      get: vi.fn(async (opts: Record<string, unknown>) => {
        calls.push({ verb: "get", opts })
        if (handlers.get) return handlers.get(opts)
        return { data: {}, error: undefined, response: okResponse({}) }
      }),
    },
  } as unknown as IsrSdkHttpClient
  return { client, calls }
}

/** A promise that never settles — the hung-transport simulation. */
function never(): Promise<never> {
  return new Promise(() => {})
}

const hangPost = { post: () => never() }
const hangGet = { get: () => never() }

describe("ISR client — SDK path bounded timeout (F-06)", () => {
  it("request completes before timeout: normal success", async () => {
    const rec = makeSdkClient({
      post: async (opts) => {
        expect(opts.signal).toBeInstanceOf(AbortSignal)
        return { data: {}, error: undefined, response: okResponse({}, 200) }
      },
    })
    const ops = createIsrOps({ client: rec.client, timeoutMs: 5_000 })
    await ops.abort("s1")
    expect(rec.calls[0].opts.url).toBe("/session/s1/abort")
    expect(rec.calls[0].opts.signal).toBeInstanceOf(AbortSignal)
  })

  it("hung request times out: controlled failure, not success", async () => {
    const { client } = makeSdkClient(hangPost)
    const ops = createIsrOps({ client, timeoutMs: 80 })
    const t0 = Date.now()
    await expect(ops.abort("s1")).rejects.toThrow(/timed out/)
    expect(Date.now() - t0).toBeLessThan(2_000)
  })

  it("hung GET (getSessionModel) times out and settles as null (fail-closed)", async () => {
    const { client } = makeSdkClient(hangGet)
    const ops = createIsrOps({ client, timeoutMs: 80 })
    const t0 = Date.now()
    const model = await ops.getSessionModel("s1")
    expect(model).toBeNull()
    expect(Date.now() - t0).toBeLessThan(2_000)
  })

  it("no leaked timer after a successful response (timer cleared on settle)", async () => {
    const { client } = makeSdkClient({
      post: async () => ({ data: {}, error: undefined, response: okResponse({}, 200) }),
    })
    const ops = createIsrOps({ client, timeoutMs: 60 })
    await ops.abort("s1") // settle fast, well before deadline
    // give any leaked timer a chance to fire: nothing may throw afterwards
    await new Promise((r) => setTimeout(r, 120))
  })

  it("no leaked timer after a timeout (deadline timer cleared)", async () => {
    const { client } = makeSdkClient(hangPost)
    const ops = createIsrOps({ client, timeoutMs: 60 })
    await expect(ops.abort("s1")).rejects.toThrow(/timed out/)
    // a second op on the same ops must not be poisoned by a leftover timer
    await expect(ops.abort("s2")).rejects.toThrow(/timed out/)
  })

  it("AbortSignal reaches the underlying SDK request", async () => {
    const rec = makeSdkClient({
      post: async (opts) => ({ data: {}, error: undefined, response: okResponse({}, 200) }),
    })
    const ops = createIsrOps({ client: rec.client, timeoutMs: 5_000 })
    await ops.prompt("s1", "hello", { providerID: "9router/b.ai", modelID: "glm-5.3-flash" })
    expect(rec.calls[0].opts.signal).toBeInstanceOf(AbortSignal)
    expect((rec.calls[0].opts.signal as AbortSignal).aborted).toBe(false)
  })

  it("stale timeout cannot alter an already-settled success", async () => {
    let resolve: (v: SdkResult) => void = () => {}
    const { client } = makeSdkClient({
      post: () =>
        new Promise<SdkResult>((r) => {
          resolve = r
        }),
    })
    const ops = createIsrOps({ client, timeoutMs: 50 })
    const p = ops.abort("s1")
    // settle the transport well before the deadline
    resolve({ data: {}, error: undefined, response: okResponse({}, 200) })
    await expect(p).resolves.toBeUndefined()
    // advance past deadline: any stale timeout fire must be a no-op (already settled)
    await new Promise((r) => setTimeout(r, 100))
  })

  it("non-OK response still fails closed with status (no fake success)", async () => {
    const { client } = makeSdkClient({
      post: async () => ({ data: undefined, error: "x", response: okResponse({}, 500) }),
    })
    const ops = createIsrOps({ client, timeoutMs: 5_000 })
    await expect(ops.abort("s1")).rejects.toThrow(/-> 500/)
  })

  it("legacy fetch path keeps its own bounded timeout (regression guard)", async () => {
    // simulate a real fetch that honors the AbortSignal: it hangs until aborted,
    // then rejects — exactly how Node/Bun fetch behaves with AbortSignal.timeout
    const hangFetch = vi.fn(
      (req: Request) =>
        new Promise<Response>((_, reject) => {
          req.signal.addEventListener("abort", () => reject(new Error("Aborted")))
        }),
    )
    const ops = createIsrOps({ baseUrl: "http://x", fetchImpl: hangFetch as never, timeoutMs: 80 })
    const t0 = Date.now()
    await expect(ops.abort("s1")).rejects.toThrow()
    expect(Date.now() - t0).toBeLessThan(2_000)
  })
})
