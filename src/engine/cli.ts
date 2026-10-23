// npx tsx src/engine/cli.ts nexus [asOf]
// Prints the Analysis for a synthetic team as JSON.

import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { RepoSnapshot } from "../lib/types";
import { analyze } from "./index";

export function loadSnapshot(teamId: string): RepoSnapshot {
  const file = join(process.cwd(), "data", "snapshots", `${teamId}.json`);
  return JSON.parse(readFileSync(file, "utf8")) as RepoSnapshot;
}

if (process.argv[1]?.replace(/\\/g, "/").endsWith("src/engine/cli.ts")) {
  const [teamId, asOf] = process.argv.slice(2);
  if (!teamId) {
    console.error("Usage: npx tsx src/engine/cli.ts <teamId> [asOf]");
    process.exit(1);
  }
  console.log(JSON.stringify(analyze(loadSnapshot(teamId), { asOf }), null, 2));
}
