// npx tsx src/engine/try-ai.ts [teamId]
// Live test of the AI wording with the key in .env.local. Prints each risk's
// template next to the AI sentence, or says why the template was kept.

import { existsSync, readFileSync } from "node:fs";
import { DEFAULT_MODEL, complete, llmAvailable } from "../lib/llm";
import { analyzeWithAi } from "./ai";
import { loadSnapshot } from "./cli";

function loadEnvLocal(): void {
  if (!existsSync(".env.local")) return;
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  loadEnvLocal();
  if (!llmAvailable()) {
    console.log("No AI key: add LLM_PROVIDER=gemini and LLM_API_KEY=... to .env.local. Templates are used.");
  }
  const teamId = process.argv[2] ?? "nexus";
  const t0 = Date.now();
  const { analysis } = await analyzeWithAi(loadSnapshot(teamId), complete, { words: true });
  console.log(`${teamId}: ${((Date.now() - t0) / 1000).toFixed(1)} s, model ${process.env.LLM_MODEL || DEFAULT_MODEL}`);
  for (const r of analysis.risks) {
    console.log(`\n[${r.summarySource}] ${r.id}\n  ${r.summary}`);
  }
  const ai = analysis.risks.filter((r) => r.summarySource === "ai").length;
  console.log(`\n${ai} of ${analysis.risks.length} sentences written by AI and accepted by code.`);
}

main();
