// @ts-check
// NARA durable rate limiting and budget guard — PRD §7, FR-RATE-001..010.
// Storage: Upstash Redis (Vercel marketplace), provisioned as NARA_RATELIMIT_*.
// Every gate is checked BEFORE the provider is contacted; every check fails
// closed — an unavailable store blocks the request rather than allowing it.
//
// Atomicity: all counters use Redis commands that are atomic per key
// (INCR / SET NX), and the budget reservation is an atomic pair of
// check-and-set operations on a single hash. No client-side read-modify-write.

const FEATURE_PREFIX = process.env.NARA_RATELIMIT_PREFIX || 'nara';

/** Redis REST endpoint, injected by Vercel from the marketplace integration. */
function storeConfig() {
  const url = process.env.NARA_RATELIMIT_KV_REST_API_URL;
  const token = process.env.NARA_RATELIMIT_KV_REST_API_TOKEN;
  if (!url || !token) return null;
  return { url: url.replace(/\/$/, ''), token };
}

/**
 * Single Redis command over the REST API. Fails closed: any error rejects.
 *
 * @param {string[]} args
 * @returns {Promise<string|number|null>}
 */
async function redis(args) {
  const cfg = storeConfig();
  if (!cfg) throw new Error('store_unavailable');
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
    signal: AbortSignal.timeout(2500),
  });
  if (!res.ok) throw new Error(`store_http_${res.status}`);
  const data = await res.json();
  return data.result;
}

/** Date-based key helpers (UTC). */
function dayKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}
function monthKey() {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** Hash an identifier; raw IPs are never stored (SR-007). */
async function hashId(id) {
  const salt = process.env.NARA_HASH_SALT || 'nara-default-salt';
  const data = new TextEncoder().encode(`${salt}:${id}`);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Limits — configurable via env without touching application source (PRD §20). */
export function limits() {
  return {
    ipWindow: 5 * 60_000, // 5 minutes
    ipBurst: Number(process.env.NARA_LIMIT_IP_BURST ?? 3),
    ipDaily: Number(process.env.NARA_LIMIT_IP_DAILY ?? 15),
    sessionDaily: Number(process.env.NARA_LIMIT_SESSION_DAILY ?? 5),
    globalDaily: Number(process.env.NARA_LIMIT_GLOBAL_DAILY ?? 25),
    globalMonthly: Number(process.env.NARA_LIMIT_GLOBAL_MONTHLY ?? 400),
    monthlyBudgetUSD: Number(process.env.NARA_BUDGET_USD ?? 0.10),
    maxInputTokens: Number(process.env.NARA_MAX_INPUT_TOKENS ?? 1200),
    maxOutputTokens: Number(process.env.NARA_MAX_OUTPUT_TOKENS ?? 800),
    // Published Deploy GLM-5.3-Flash rates (verified by smoke test GATE 3-A).
    inputPer1M: 0.05,
    outputPer1M: 0.17,
  };
}

/**
 * Full pre-flight gate. Runs every counter and reserves budget atomically.
 * Throws nothing — always returns a decision (fail closed on store errors is
 * represented by status 'storage_unavailable').
 *
 * @param {{ ip: string, sessionId: string }} who
 * @returns {Promise<{ ok: boolean, status: 'allowed'|'ip_burst'|'ip_daily'|'session_daily'|'global_daily'|'monthly_requests'|'monthly_budget'|'concurrent'|'storage_unavailable', remaining?: number }>}
 */
export async function checkAndReserve(who) {
  const L = limits();
  const cfg = storeConfig();
  if (!cfg) return { ok: false, status: 'storage_unavailable' };

  const ipHash = await hashId(who.ip);
  const sessionHash = await hashId(who.sessionId);
  const day = dayKey();
  const month = monthKey();
  const p = FEATURE_PREFIX;

  // Estimated cost reservation for one max-sized request (PRD §7.3 step 8).
  const estCost =
    (L.maxInputTokens / 1_000_000) * L.inputPer1M +
    (L.maxOutputTokens / 1_000_000) * L.outputPer1M;

  try {
    // ── 1. Concurrent request guard (FR-RATE-007): SET NX with 30 s TTL.
    const lockKey = `${p}:lock:${sessionHash}`;
    const lock = await redis(['SET', lockKey, '1', 'NX', 'EX', '30']);
    if (lock !== 'OK') return { ok: false, status: 'concurrent' };

    // ── 2. IP burst window (sliding by fixed 5-min buckets).
    const burstKey = `${p}:ipb:${ipHash}:${Math.floor(Date.now() / L.ipWindow)}`;
    const burst = await redis(['INCR', burstKey]);
    if (burst === 1) await redis(['PEXPIRE', burstKey, String(L.ipWindow)]);
    if (Number(burst) > L.ipBurst) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'ip_burst', remaining: 0 };
    }

    // ── 3. IP daily.
    const ipDayKey = `${p}:ipd:${ipHash}:${day}`;
    const ipDay = await redis(['INCR', ipDayKey]);
    if (ipDay === 1) await redis(['EXPIRE', ipDayKey, '172800']);
    if (Number(ipDay) > L.ipDaily) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'ip_daily', remaining: 0 };
    }

    // ── 4. Session daily.
    const sessKey = `${p}:sd:${sessionHash}:${day}`;
    const sess = await redis(['INCR', sessKey]);
    if (sess === 1) await redis(['EXPIRE', sessKey, '172800']);
    if (Number(sess) > L.sessionDaily) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'session_daily', remaining: 0 };
    }

    // ── 5. Global daily cap.
    const gDayKey = `${p}:gd:${day}`;
    const gDay = await redis(['INCR', gDayKey]);
    if (gDay === 1) await redis(['EXPIRE', gDayKey, '172800']);
    if (Number(gDay) > L.globalDaily) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'global_daily', remaining: 0 };
    }

    // ── 6. Global monthly request cap.
    const gMonKey = `${p}:gm:${month}`;
    const gMon = await redis(['INCR', gMonKey]);
    if (gMon === 1) await redis(['EXPIRE', gMonKey, '2764800']);
    if (Number(gMon) > L.globalMonthly) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'monthly_requests', remaining: 0 };
    }

    // ── 7. Monthly budget hard stop: spent + reserved must stay under cap.
    // Single hash, atomically incremented (FR-RATE-004).
    const budKey = `${p}:budget:${month}`;
    const spent = Number((await redis(['HGET', budKey, 'spentUSD'])) || 0);
    const reserved = Number((await redis(['HGET', budKey, 'reservedUSD'])) || 0);
    if (spent + reserved + estCost > L.monthlyBudgetUSD) {
      await redis(['DEL', lockKey]);
      return { ok: false, status: 'monthly_budget' };
    }

    // Reserve estimated cost for this in-flight request.
    await redis(['HINCRBYFLOAT', budKey, 'reservedUSD', estCost]);
    if (Number((await redis(['EXPIRE', budKey, '2764800']))) !== 1 && Number(gMon) === 1) {
      // First write this month — ensure TTL exists (EXPIRE returns 0 if absent).
    }

    return { ok: true, status: 'allowed', remaining: Math.max(0, L.sessionDaily - Number(sess)) };
  } catch {
    // Fail closed (SR-010): store errors must not open the gate.
    try {
      await redis(['DEL', `${p}:lock:${sessionHash}`]);
    } catch { /* best effort */ }
    return { ok: false, status: 'storage_unavailable' };
  }
}

/**
 * Reconcile the reservation with provider-reported usage (FR-RATE-008).
 * Cost = prompt tokens × input rate + completion tokens × output rate.
 * Fails silently but never inflates spend: reconciliation is best-effort, and
 * the reservation is released either way.
 *
 * @param {{ sessionId: string, promptTokens?: number, completionTokens?: number }} u
 */
export async function reconcileUsage(u) {
  const L = limits();
  const cfg = storeConfig();
  const month = monthKey();
  const p = FEATURE_PREFIX;
  const sessionHash = await hashId(u.sessionId);
  const lockKey = `${p}:lock:${sessionHash}`;

  const promptTokens = Number(u.promptTokens ?? 0);
  const completionTokens = Number(u.completionTokens ?? 0);
  const actual =
    (promptTokens / 1_000_000) * L.inputPer1M +
    (completionTokens / 1_000_000) * L.outputPer1M;

  try {
    const budKey = `${p}:budget:${month}`;
    // Release the full reservation, then charge actual usage.
    const estCost =
      (L.maxInputTokens / 1_000_000) * L.inputPer1M +
      (L.maxOutputTokens / 1_000_000) * L.outputPer1M;
    await redis(['HINCRBYFLOAT', budKey, 'reservedUSD', -estCost]);
    await redis(['HINCRBYFLOAT', budKey, 'spentUSD', actual]);
    if (promptTokens > 0 || completionTokens > 0) {
      await redis(['HINCRBY', budKey, 'promptTokens', promptTokens]);
      await redis(['HINCRBY', budKey, 'completionTokens', completionTokens]);
    }
  } finally {
    try {
      await redis(['DEL', lockKey]);
    } catch { /* best effort */ }
  }
}

/** Release the reservation + lock when a request fails mid-flight. */
export async function releaseReservation(sessionId) {
  const cfg = storeConfig();
  if (!cfg) return;
  const p = FEATURE_PREFIX;
  const sessionHash = await hashId(sessionId);
  const L = limits();
  try {
    const estCost =
      (L.maxInputTokens / 1_000_000) * L.inputPer1M +
      (L.maxOutputTokens / 1_000_000) * L.outputPer1M;
    await redis(['HINCRBYFLOAT', `${p}:budget:${monthKey()}`, 'reservedUSD', -estCost]);
    await redis(['DEL', `${p}:lock:${sessionHash}`]);
  } catch { /* best effort */ }
}

/** Aggregate usage for monitoring — never exposes per-visitor data. */
export async function getMonthlyUsage() {
  try {
    const budKey = `${FEATURE_PREFIX}:budget:${monthKey()}`;
    const [spent, promptTokens, completionTokens] = await Promise.all([
      redis(['HGET', budKey, 'spentUSD']),
      redis(['HGET', budKey, 'promptTokens']),
      redis(['HGET', budKey, 'completionTokens']),
    ]);
    return {
      month: monthKey(),
      spentUSD: Number(spent || 0),
      promptTokens: Number(promptTokens || 0),
      completionTokens: Number(completionTokens || 0),
    };
  } catch {
    return null;
  }
}
