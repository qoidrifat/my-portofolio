// arith-check.mjs — recompute canonical worked examples + display rule (C3)
// Run: node .opencode/ai/verification/v22-design/arith-check.mjs
import assert from "node:assert/strict";

const round3 = (x) => Math.round(x * 1000 + Number.EPSILON * 1000) / 1000; // half-up at 3dp
const dot = (vals, weights) => vals.reduce((s, v, i) => s + v * weights[i], 0);

// Deep-research profile (DECISION_MATRIX, normative): quality .40, cap .20, rel .15, lat .02, cost .03, ctx .15, recent .05
const deep = [0.40, 0.20, 0.15, 0.02, 0.03, 0.15, 0.05];
assert.ok(Math.abs(deep.reduce((a, b) => a + b, 0) - 1) < 1e-12, "deep-research weights sum to 1");

// ROUTING_MODEL §10.4 candidate A
const A = dot([0.82, 0.90, 0.95, 0.60, 0.30, 0.95, 0.90], deep);
assert.equal(A, 0.859, `A exact = .859, got ${A}`);
// candidate B
const B = dot([0.74, 0.80, 0.70, 0.85, 0.85, 0.60, 0.70], deep);
assert.equal(B, 0.7285, `B exact = .7285, got ${B}`);
// retired-profile slip: old profile applied to A's values = .837
const oldProfile = [0.40, 0.20, 0.20, 0.05, 0.05, 0.08, 0.02];
assert.equal(dot([0.82, 0.90, 0.95, 0.60, 0.30, 0.95, 0.90], oldProfile), 0.837, "old-profile sum = .837 (CORRECTED CALCULATION)");
assert.ok(A > B, "A wins");

// DECISION_MATRIX Ex.1 (routine, LOW): profile q.15 cap.15 rel.15 lat.20 cost.20 ctx.10 recent.05
const routine = [0.15, 0.15, 0.15, 0.20, 0.20, 0.10, 0.05];
assert.ok(Math.abs(routine.reduce((a, b) => a + b, 0) - 1) < 1e-12, "routine weights sum to 1");
const M2 = dot([0.78, 0.75, 0.90, 0.80, 0.75, 1.0, 0.80], routine);
assert.equal(M2, 0.8145, `Ex.1 M2 exact = .8145, got ${M2}`);
assert.equal(round3(M2), 0.815, "display round-half-up: .8145 -> .815");

// C3 display rule sanity
assert.equal(round3(0.8145), 0.815);
assert.equal(round3(0.7285), 0.729);
assert.equal(round3(0.859), 0.859);

// Hysteresis margin evidence (SIMULATION_RESULTS): evidenced-peer margin .0058 < provisional H .02
assert.ok(0.0058 < 0.02, "provisional H > observed margin (guard engaged)");
assert.ok(0.02 > 3 * 0.0058, "H exceeds 3x evidence bound, flagged PROVISIONAL by design");

console.log("arith-check: PASS (A=.859, B=.7285, old-slip=.837, M2=.8145->.815, profiles sum 1, H vs margin)");
