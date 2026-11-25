// @ts-check
// One structured error log for the whole app: reason + file + line.
//
// Visitors keep the safe copy from nara-copy.js / ContactSection COPY; the
// developer detail (message, source file, line, stack) lands in the console so
// a broken endpoint or a crashed section is diagnosable without guesswork.
// Never log request bodies, keys, or provider responses through this helper.

/** @typedef {{ scope: string, reason: string, at: string, status?: number, extra?: Record<string, unknown> }} ErrorReport */

const SELF = /[\\/]lib[\\/]errors\.js/;

/**
 * First non-helper frame of a stack: `components/x.jsx:42:7` -> `components/x.jsx:42`.
 * @param {unknown} error
 * @returns {string}
 */
function sourceOf(error) {
  const stack = /** @type {{ stack?: string }} */ (error)?.stack;
  if (typeof stack !== 'string') return 'unknown (no stack)';
  for (const raw of stack.split('\n').slice(1)) {
    const m = raw.match(/\(?((?:[a-zA-Z]:)?[^\s()]+):(\d+):(\d+)\)?\s*$/);
    if (!m || SELF.test(m[1])) continue;
    return `${m[1].split(/[\\/]/).slice(-3).join('/')}:${m[2]}`;
  }
  return 'unknown (no stack)';
}

/**
 * Build a report without logging it — for callers that need the detail value.
 * @param {string} scope
 * @param {unknown} error
 * @param {{ status?: number, extra?: Record<string, unknown> }} [opts]
 * @returns {ErrorReport}
 */
export function describeError(scope, error, opts = {}) {
  const reason =
    typeof error === 'string'
      ? error
      : (error instanceof Error ? error.message : JSON.stringify(error ?? null)) || 'unknown error';
  /** @type {ErrorReport} */
  const report = { scope, reason, at: sourceOf(error) };
  if (typeof opts.status === 'number') report.status = opts.status;
  if (opts.extra) report.extra = opts.extra;
  return report;
}

/**
 * Log a structured report and return it.
 * @param {string} scope
 * @param {unknown} error
 * @param {{ status?: number, extra?: Record<string, unknown> }} [opts]
 * @returns {ErrorReport}
 */
export function logError(scope, error, opts = {}) {
  const report = describeError(scope, error, opts);
  const status = report.status ? ` status=${report.status}` : '';
  console.error(`[${scope}] ${report.reason} (at ${report.at}${status})`, report.extra ?? '');
  return report;
}
