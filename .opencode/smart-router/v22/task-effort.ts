// Smart Router V2.2 — task-effort matrix (confirm-era additive).
// Reasoning effort dipetakan dari task class hasil classifier. Downgrade-only:
// task rutin diturunkan ke 'high' (hemat token + lebih cepat); task berat memakai
// effort session (variant max). null = JANGAN menyentuh effort (fail-open).
//
// Kenapa downgrade-only: menaikkan effort melebihi session di sini akan melanggar
// verified ceiling secara halus dan menduplikasi kerja clamp chat.params. Matrix ini
// hanya menurunkan — clamp registry tetap SSOT ceiling.
//
// Dipakai plugin di chat.params (measured: hook dapat memutasi output.options
// reasoningEffort — event effort-clamp). Perubahan effort TIDAK mengubah session
// model/variant => tidak memicu ISR consent (sameModel variant-sensitive tetap tenang).

const ROUTINE_CLASSES = new Set([
  "crud-simple",
  "documentation",
  "testing",
  "tooling",
  "latency-sensitive",
  "routine-review",
])

/**
 * Effort override untuk task class. 'high' = downgrade eksplisit untuk task rutin;
 * null = biarkan effort session (max) — termasuk semua task berat/risiko tinggi.
 */
export function effortForTaskClass(taskClass: string | null | undefined): "high" | null {
  if (!taskClass) return null
  return ROUTINE_CLASSES.has(taskClass) ? "high" : null
}
