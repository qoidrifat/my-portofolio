// consistency-scan.mjs — cross-document consistency for the V2.2 design revision
// Run: node .opencode/ai/verification/v22-design/consistency-scan.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import assert from "node:assert/strict";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..", "..", "..");
const docs = (f) => readFileSync(join(root, "docs", "smart-router", f), "utf8");
const D = {
  rm: docs("SMART_ROUTER_V2_2_ROUTING_MODEL.md"),
  dm: docs("SMART_ROUTER_V2_2_DECISION_MATRIX.md"),
  ar: docs("SMART_ROUTER_V2_2_ARCHITECTURE.md"),
  ed: docs("SMART_ROUTER_V2_2_EVALUATION_DESIGN.md"),
  ob: docs("SMART_ROUTER_V2_2_OBSERVABILITY_DESIGN.md"),
  sb: docs("SMART_ROUTER_V2_2_SECURITY_BOUNDARY.md"),
  adr: docs("SMART_ROUTER_V2_2_ADR.md"),
  ig: docs("SMART_ROUTER_V2_2_IMPLEMENTATION_GATE.md"),
  ec: docs("SMART_ROUTER_V2_2_EVIDENCE_CONTRACT.md"),
  ins: docs("SMART_ROUTER_V2_2_V2_1_INSTRUMENTATION_SPEC.md"),
  rc: docs("SMART_ROUTER_V2_2_REPLAY_CONTRACT.md"),
  rr: docs("SMART_ROUTER_V2_2_DESIGN_REVISION_REPORT.md"),
};

// C2 — retired profile appears ONLY inside the SUPERSEDED context of ROUTING_MODEL
{
  const retired = ".40,.20,.20,.05,.05,.08,.02";
  let idx = -1, hits = [];
  while ((idx = D.rm.indexOf(retired, idx + 1)) !== -1) hits.push(idx);
  assert.equal(hits.length, 1, `retired profile appears exactly once, got ${hits.length}`);
  const ctx = D.rm.slice(Math.max(0, hits[0] - 200), hits[0]);
  assert.ok(ctx.includes("SUPERSEDED"), "retired profile only inside SUPERSEDED note");
  assert.ok(D.dm.includes(".40,.20,.15,.02,.03,.15,.05"), "matrix normative deep-research profile present");
  assert.ok(!D.dm.includes(retired), "matrix never uses retired profile");
}

// C1 — taxonomy canonical, matrix Ex.3 defers to it, fallback-not-block semantics aligned
{
  assert.ok(D.rm.includes("MANDATORY") && D.rm.includes("REQUIRED-FLOOR") && D.rm.includes("OPTIONAL"), "3-tier taxonomy");
  assert.ok(D.rm.includes("single canonical rule"), "§4.4 declared canonical");
  assert.ok(D.dm.includes("canonical C1"), "Ex.3 references canonical C1");
  const ex3 = D.dm.slice(D.dm.indexOf("Example 3"), D.dm.indexOf("Example 4"));
  assert.ok(ex3.includes("never BLOCK") && ex3.includes("V2.1 route"), "Ex.3: no-floor-verified -> V2.1 fallback, not BLOCK");
  const m1 = [0.85, 0.90, 0.95, 0.55, 0.45, 0.80, 0.85];
  const secProfile = [0.40, 0.15, 0.25, 0.05, 0.05, 0.05, 0.05];
  assert.ok(Math.abs(secProfile.reduce((a, b) => a + b, 0) - 1) < 1e-12, "security-review profile sums to 1");
  const m1sum = m1.reduce((s, v, i) => s + v * secProfile[i], 0);
  assert.equal(m1sum, 0.845, `Ex.3 M1 exact = .845, got ${m1sum}`);
  assert.ok(ex3.includes(".845"), "Ex.3 prints exact .845");
}

// C4 — matrix §1.1 mapping is total over the 21 policy classes
{
  const policyPath = join(root, ".opencode", "smart-router", "routing-policy.json");
  assert.ok(existsSync(policyPath), "routing-policy.json exists");
  const policy = JSON.parse(readFileSync(policyPath, "utf8"));
  const classes = policy.task_classes.map((c) => c.task_class);
  assert.ok(classes.length === 21, `21 source classes in policy, got ${classes.length}`);
  const mapStart = D.dm.indexOf("## 1.1");
  const mapEnd = D.dm.indexOf("## 2.", mapStart);
  assert.ok(mapStart > 0 && mapEnd > mapStart, "§1.1 mapping section found");
  const map = D.dm.slice(mapStart, mapEnd);
  const missing = classes.filter((c) => !map.includes(c));
  assert.deepEqual(missing, [], `§1.1 maps every policy class — missing: ${missing.join(", ")}`);
  assert.ok(map.includes("RESOLVED"), "adversarial validation verdict recorded");
}

// D-COLD — cold-start canon consistent across RM/ADR/REPORT
{
  const tierRe = /EXCLUDED[^<]*<[^<]*UNPROVEN[^<]*<[^<]*KNOWN-EVIDENCED/;
  for (const [n, t] of [["ROUTING_MODEL", D.rm], ["ADR-014", D.adr], ["REPORT", D.rr]])
    assert.ok(tierRe.test(t), `${n}: cold-start tiers`);
  assert.ok(D.rm.includes("ladder head"), "all-UNPROVEN -> V2.1 ladder head");
  assert.ok(D.rm.includes("final tie-break only") || D.adr.includes("final tie-break only"), "ASCII demoted to final tie-break");
}

// D-VAR — inheritance + caps + shrinkage consistent
{
  assert.ok(/n\s*\/\s*\(n\s*\+\s*10\)/.test(D.rm), "shrinkage rule");
  assert.ok(D.rm.includes("×0.5"), "inherited confidence cap");
  assert.ok(D.rm.includes("14"), "staleness half-life referenced");
  assert.ok(D.ed.includes("(provider, model, variant)"), "ED uses variant grain");
}

// Hysteresis — provisional value + evidence bound consistent
{
  assert.ok(D.rm.includes("0.02"), "H provisional 0.02");
  assert.ok(D.rr.includes("0.006"), "evidence lower bound 0.006 recorded");
  assert.ok(D.adr.includes("PROVISIONAL"), "ADR marks H provisional");
}

// Quality blend — clamp bounds consistent RM vs REPORT
{
  assert.ok(D.rm.includes("0.25") && D.rm.includes("0.75"), "blend clamp [0.25, 0.75]");
  assert.ok(D.rm.includes("PROVISIONAL"), "50/50 marked PROVISIONAL");
}

// Display rule — same example value in matrix + report
{
  assert.ok(D.dm.includes(".8145") && D.dm.includes(".815"), "matrix: .8145 -> .815");
  assert.ok(D.rr.includes(".8145"), "report: same example");
  assert.ok(D.rm.includes(".859") && D.rm.includes(".7285") && D.rm.includes(".729"), "RM: A/B + display");
}

// Authority hierarchy — gate + architecture list the same order
{
  const order = ["SECURITY_BOUNDARY", "ROUTING_MODEL", "DECISION_MATRIX", "EVIDENCE_CONTRACT", "OBSERVABILITY_DESIGN"];
  const arSeg = D.ar.slice(D.ar.indexOf("### 6.0"), D.ar.indexOf("### 6.1"));
  let last = -1;
  for (const d of order) {
    const p = arSeg.indexOf(d);
    assert.ok(p > last, `hierarchy order at ${d}`);
    last = p;
  }
  assert.ok(D.ig.includes("EVIDENCE_CONTRACT"), "gate references evidence contract");
}

// Invariants — I-016..I-021 names match between SECURITY_BOUNDARY and REPORT
{
  for (const tag of ["I-016", "I-017", "I-018", "I-019", "I-020", "I-021"]) {
    assert.ok(D.sb.includes(tag), `SB has ${tag}`);
    assert.ok(D.rr.includes(tag), `REPORT lists ${tag}`);
  }
}

// T1–T5 — spec, observability, evidence contract agree on event set
{
  for (const e of ["T1", "T2", "T3", "T4", "T5"]) {
    assert.ok(D.ins.includes(`### ${e} —`), `spec defines ${e}`);
    assert.ok(D.ob.includes(e), `observability refs ${e}`);
  }
  assert.ok(D.ec.includes("T1–T5"), "evidence contract references event set");
  assert.ok(D.rc.includes("T1/T2") || D.rc.includes("T2/T1"), "replay contract references outcome events");
}

// No harness-latency regression — evaluation design must not reintroduce duration proxies
{
  assert.ok(!D.ed.includes("duration_ms as latency"), "ED does not reintroduce duration_ms as latency");
  assert.ok(D.ob.includes("EXCLUDED from latencyFit"), "OB excludes harness duration");
}

// REPORT documents all canonical decisions + adversarial coverage
{
  for (const k of ["C1", "C2", "C3", "C4", "D-VAR", "D-COLD", "18/18", "ADR-015"]) assert.ok(D.rr.includes(k), `report: ${k}`);
}

console.log("consistency-scan: PASS (C1-C4, D-VAR, D-COLD, hysteresis, blend, display, hierarchy, I-016..021, T1-T5, no-latency-regression, 21-class mapping total)");
