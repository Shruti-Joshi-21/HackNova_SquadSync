// npx tsx src/engine/check-plan.ts [--live]
// Checks the PRD splitter with a fake model, and plan versus reality on Nexus.
// --live also asks the real model (key from .env.local).

import { existsSync, readFileSync } from "node:fs";
import type { ProjectPlan } from "../lib/types";
import type { Complete } from "../lib/llm";
import { checkPlanShape } from "../components/plan/checks";
import { loadSnapshot } from "./cli";
import { normalize } from "./normalize";
import { checkPlan, planFrom, templatePlan, validatePlan } from "./plan";

let failures = 0;
function expect(ok: boolean, label: string): void {
  console.log(`  [${ok ? "x" : " "}] ${label}`);
  if (!ok) failures++;
}
const pageOk = (p: ProjectPlan) => checkPlanShape(p).every((c) => c.ok);

const PRD = `Campus marketplace. Students sign up with their college email and log in.
They list items for sale with photos, search and filter listings, chat with sellers,
and pay through a checkout page. Sellers get an email when an item sells.
An admin dashboard shows reports and removes bad listings.`;

const good = {
  modules: [
    { id: "auth", name: "Sign-in", ownerSlot: 0, folders: ["src/auth/**"], tasks: ["Login"], dependsOn: [] },
    { id: "listings", name: "Listings", ownerSlot: 1, folders: ["src/listings/**"], tasks: ["List item"], dependsOn: ["auth"] },
    { id: "pay", name: "Payments", ownerSlot: 2, folders: ["src/pay/**"], tasks: ["Checkout"], dependsOn: ["listings"] },
  ],
  sharedFiles: [{ path: "package.json", ownerSlot: 0, rule: "Ask the owner." }],
  interfaces: [{ between: ["auth", "listings"], agreeFirst: "User object" }],
  mergeOrder: ["auth", "listings", "pay"],
};

async function main() {
  console.log("\nTemplate plan");
  for (let n = 2; n <= 6; n++) {
    const t = templatePlan(PRD, n);
    expect(validatePlan(t).length === 0 && pageOk(t) && t.source === "template", `team of ${n}: valid, passes the page's checks (${t.modules.length} modules)`);
  }
  expect(templatePlan(PRD, 3).modules.some((m) => m.id === "payments") && templatePlan(PRD, 3).modules.some((m) => m.id === "search"), "picks modules from words in the PRD");
  expect(!templatePlan("A simple notes app where people write notes.", 3).modules.some((m) => m.id === "payments"), "leaves out modules the PRD does not mention");

  console.log("\nAI plan with a fake model");
  const say = (v: unknown): Complete => async () => (typeof v === "string" ? v : JSON.stringify(v));
  const p1 = await planFrom(PRD, 3, say(good));
  expect(p1.source === "ai" && p1.modules.length === 3 && pageOk(p1), "a good AI plan is used as it is");

  const messy = {
    ...good,
    modules: [
      { ...good.modules[0], ownerSlot: 7 },
      { ...good.modules[1], folders: ["src/listings/**", "src/auth/forms/**"], dependsOn: ["auth", "ghost"] },
      good.modules[2],
    ],
    sharedFiles: [...good.sharedFiles, { path: "package.json", ownerSlot: 1, rule: "dup" }],
    mergeOrder: ["pay", "auth"],
  };
  const p2 = await planFrom(PRD, 3, say(messy));
  expect(p2.source === "ai" && validatePlan(p2).length === 0 && pageOk(p2), "a fixable AI plan is repaired by code and kept");
  expect(p2.mergeOrder.join() === "auth,listings,pay", `merge order rebuilt with dependencies first (${p2.mergeOrder.join(" > ")})`);

  const cycle = { ...good, modules: [{ ...good.modules[0], dependsOn: ["pay"] }, good.modules[1], good.modules[2]] };
  expect((await planFrom(PRD, 3, say(cycle))).source === "template", "a plan with a dependency loop falls back to the template");
  expect((await planFrom(PRD, 3, say("sorry, I cannot help"))).source === "template", "an answer that is not JSON falls back to the template");
  expect((await planFrom(PRD, 3, async () => null)).source === "template", "no answer (no key, timeout) falls back to the template");
  const oneSlot = { ...good, modules: good.modules.map((m) => ({ ...m, ownerSlot: 0 })) };
  const p3 = await planFrom(PRD, 3, say(oneSlot));
  expect(new Set(p3.modules.map((m) => m.ownerSlot)).size === 3 && pageOk(p3), "if one person owns everything, code spreads modules so everyone owns one");

  console.log("\nPlan versus reality on Nexus");
  const nexusPlan: ProjectPlan = {
    teamSize: 4,
    modules: [
      { id: "catalog", name: "Catalog and search", ownerSlot: 0, folders: ["src/catalog/**", "src/search/**", "src/server/**"], tasks: [], dependsOn: [] },
      { id: "cart", name: "Cart and payments", ownerSlot: 1, folders: ["src/cart/**", "src/payments/**", "src/settings/**"], tasks: [], dependsOn: [] },
      { id: "auth", name: "Accounts and notifications", ownerSlot: 2, folders: ["src/auth/**", "src/notify/**", "src/email/**", "src/lib/**"], tasks: [], dependsOn: [] },
      { id: "design", name: "Design", ownerSlot: 3, folders: ["design/**", "docs/**", "src/styles/**"], tasks: [], dependsOn: [] },
    ],
    sharedFiles: [{ path: "package-lock.json", ownerSlot: 0, rule: "Owner regenerates it." }],
    interfaces: [],
    mergeOrder: ["design", "auth", "catalog", "cart"],
    source: "template",
  };
  expect(validatePlan(nexusPlan).length === 0, "the Nexus test plan is valid");
  const risks = checkPlan(nexusPlan, normalize(loadSnapshot("nexus")));
  for (const r of risks) console.log(`      ${r.severity} ${r.id}: ${r.title}`);
  const cOnA = risks.find((r) => r.people[0] === "p3" && r.people[1] === "p1" && r.evidence.some((e) => e.value.includes("routes.js")));
  expect(!!cOnA && cOnA.title === "Member C edited Member A's folder", "Member C edited Member A's folder (routes.js)");
  expect(risks.some((r) => r.title.includes("package-lock.json") && r.people[0] === "p3"), "Member C changed package-lock.json, owned by Member A");
  expect(risks.some((r) => r.people[0] === "p2" && r.evidence.some((e) => e.value.includes("apiClient.js"))), "Member B removed apiClient.js in Member C's folder");
  expect(risks.every((r) => r.evidence.length > 0 && r.action && r.rule && r.scene && r.title.split(" ").length <= 8), "every plan risk has evidence, rule, action, scene, short title");
  expect(!risks.some((r) => r.people[0] === r.people[1]), "nobody is flagged for their own folder");

  if (process.argv.includes("--live")) {
    if (existsSync(".env.local")) {
      for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
        const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
        if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
      }
    }
    const { complete } = await import("../lib/llm");
    console.log("\nLive model");
    const t0 = Date.now();
    const live = await planFrom(PRD, 4, complete);
    console.log(`      source ${live.source}, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    for (const m of live.modules) console.log(`      ${m.name} -> Member ${String.fromCharCode(65 + m.ownerSlot)}: ${m.folders.join(", ")}`);
    console.log(`      shared: ${live.sharedFiles.map((s) => s.path).join(", ")}; merge: ${live.mergeOrder.join(" > ")}`);
    expect(pageOk(live), "the live plan passes the page's checks");
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll plan checks pass.");
}

main();
