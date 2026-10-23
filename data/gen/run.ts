// Writes data/snapshots/{nexus,atlas,orbit,zenith}.json, then validates them.
// Run from the repo root: npx tsx data/gen/run.ts

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoSnapshot } from "../../src/lib/types";
import { plantedChecks } from "./planted";
import { atlas } from "./teams/atlas";
import { nexus } from "./teams/nexus";
import { orbit } from "./teams/orbit";
import { zenith } from "./teams/zenith";
import { validate } from "./validate";

const outDir = join(process.cwd(), "data", "snapshots");
mkdirSync(outDir, { recursive: true });

const snapshots: RepoSnapshot[] = [nexus(), atlas(), orbit(), zenith()];
let failed = false;

for (const s of snapshots) {
  writeFileSync(join(outDir, `${s.team.id}.json`), JSON.stringify(s, null, 2) + "\n");
  const errors = validate(s);
  const checks = plantedChecks(s);
  console.log(`\n${s.team.name}: ${s.commits.length} commits, ${s.pullRequests.length} PRs, ${s.branches.length} open branches, ${s.tasks.length} tasks`);
  for (const e of errors) console.log(`  INVALID ${e}`);
  for (const c of checks) console.log(`  [${c.ok ? "x" : " "}] ${c.label}: ${c.value}`);
  if (errors.length > 0 || checks.some((c) => !c.ok)) failed = true;
}

if (failed) {
  console.error("\nGeneration failed: fix the problems above.");
  process.exit(1);
}
console.log(`\nWrote ${snapshots.length} snapshots to data/snapshots.`);
