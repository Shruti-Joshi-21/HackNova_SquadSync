// npx tsx src/lib/github/try.ts owner/name 2026-11-01 [projectStart]
// Pulls a repo with the token from .env.local and prints a short summary.
// Add --json to print the whole { snapshot, analysis }.

import { existsSync, readFileSync } from "node:fs";
import { analyze, buildSnapshot } from "../../engine";
import { createClient } from "./client";
import { fetchSnapshot } from "./ingest";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  const args = process.argv.slice(2).filter((a) => a !== "--json");
  const [repo, deadline, projectStart] = args;
  if (!repo || !deadline) {
    console.error("Usage: npx tsx src/lib/github/try.ts owner/name 2026-11-01 [projectStart] [--json]");
    process.exit(1);
  }
  const gh = createClient();
  const t0 = Date.now();
  const snapshot = buildSnapshot(await fetchSnapshot({ repo, deadline, projectStart }, gh), "github");
  const analysis = analyze(snapshot);
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify({ snapshot, analysis }, null, 2));
    return;
  }
  console.log(`${snapshot.team.name}: ${gh.count()} requests in ${((Date.now() - t0) / 1000).toFixed(1)} s, token ${process.env.GITHUB_TOKEN ? "yes" : "no"}`);
  console.log(`  ${snapshot.team.people.length} people, ${snapshot.commits.length} commits, ${snapshot.pullRequests.length} PRs, ${snapshot.branches.length} open branches, ${snapshot.tasks.length} tasks`);
  console.log(`  verdict ${analysis.verdict}: ${analysis.verdictReason}`);
  for (const r of analysis.risks) console.log(`  - ${r.severity} ${r.id}: ${r.title}`);
  for (const n of analysis.notFlagged) console.log(`  not flagged ${n.personId}: ${n.reason}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
