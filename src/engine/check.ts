// npx tsx src/engine/check.ts
// Asserts that the engine finds the planted story in each synthetic team.

import type { Analysis } from "../lib/types";
import { loadSnapshot } from "./cli";
import { analyze } from "./index";

let failures = 0;
function expect(ok: boolean, label: string): void {
  console.log(`  [${ok ? "x" : " "}] ${label}`);
  if (!ok) failures++;
}

const has = (a: Analysis, kind: string, personId?: string) =>
  a.risks.some((r) => r.kind === kind && (!personId || r.people.includes(personId)));

const teams = Object.fromEntries(
  ["nexus", "atlas", "orbit", "zenith"].map((id) => [id, analyze(loadSnapshot(id))]),
) as Record<string, Analysis>;

for (const a of Object.values(teams)) {
  console.log(`\n${a.team.name}: ${a.verdict}, ${a.risks.length} risks`);
  for (const r of a.risks) {
    const words = r.title.split(/\s+/).length;
    if (!r.rule || r.evidence.length === 0 || !r.action || !r.summary || words > 8 || !r.firstDetectableAt) {
      expect(false, `risk ${r.id} has rule, evidence, action, summary and a title of 8 words or fewer`);
    }
    if (/commit count/i.test(r.summary) || /commits?\b/i.test(r.title)) {
      expect(false, `risk ${r.id} does not compare people by commits`);
    }
  }
  const total = a.shares.reduce((s, x) => s + x.composite, 0);
  expect(Math.abs(total - 1) < 0.001, `combined shares add up to 100% (${(total * 100).toFixed(1)}%)`);
  const sorted = a.risks.every((r, i) => i === 0 || ["high", "medium", "low"].indexOf(a.risks[i - 1].severity) <= ["high", "medium", "low"].indexOf(r.severity));
  expect(sorted, "risks are sorted by severity");
}

const nexus = teams.nexus;
console.log("\nNexus");
expect(has(nexus, "workload_imbalance", "p1"), "workload risk on Member A");
expect(has(nexus, "review_gap", "p3"), "review gap on Member C");
expect(has(nexus, "late_integration"), "late-integration risk");
expect(nexus.verdict === "slipping" || nexus.verdict === "at_risk", `verdict slipping or at_risk (${nexus.verdict})`);
expect(nexus.notFlagged.some((n) => n.personId === "p4"), "Member D is in notFlagged");
expect(!has(nexus, "workload_imbalance", "p4") && !nexus.shares.find((s) => s.personId === "p4")!.flagged, "Member D is not flagged for workload");
expect(nexus.reviews.mergedWithoutReview.length === 3, "3 PRs merged without review");
expect(Math.abs(nexus.lateMergeShare - 0.58) < 0.01, "late merge share about 58%");
expect(nexus.risks.some((r) => r.id === "late_integration-pr-31"), "PR #31 flagged as old");

console.log("\nAtlas");
expect(teams.atlas.risks.every((r) => r.severity !== "high"), "no high risks");
expect(teams.atlas.verdict === "on_track", `verdict on_track (${teams.atlas.verdict})`);

console.log("\nOrbit");
expect(has(teams.orbit, "workload_imbalance"), "workload risk");
expect(has(teams.orbit, "workload_imbalance", "p1"), "workload risk on Member A");

console.log("\nZenith");
expect(has(teams.zenith, "late_integration"), "late-integration risk");

console.log("\nReplay");
const early = analyze(loadSnapshot("nexus"), { asOf: "2026-10-01T12:00:00Z" });
expect(early.asOf === "2026-10-01T12:00:00Z", "asOf is honoured");
expect(!has(early, "late_integration", undefined) || early.lateMergeShare < nexus.lateMergeShare, "the late burst is not there on 1 Oct");
expect(early.schedule.tasksDone < nexus.schedule.tasksDone, "fewer tasks done on 1 Oct");
const first = nexus.risks.find((r) => r.id === "workload_imbalance-p1")!;
expect(first.firstDetectableAt < nexus.asOf, `Member A's workload was detectable before today (${first.firstDetectableAt.slice(0, 10)})`);
const atFirst = analyze(loadSnapshot("nexus"), { asOf: first.firstDetectableAt });
expect(has(atFirst, "workload_imbalance", "p1"), "replay on that date shows the same risk");

if (failures > 0) {
  console.error(`\n${failures} check(s) failed.`);
  process.exit(1);
}
console.log("\nAll engine checks pass.");
