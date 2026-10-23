// The "Plan" half of Plan, Watch, Warn.
//
// planFrom(): AI proposes a split of the PRD; code parses it, repairs what it
// safely can, and checks it with the same rules the /plan page shows. If it
// still fails, a deterministic template plan is returned instead.
// checkPlan(): plan versus reality, "Member C edited Member A's folder".

import type { Branch, PlanInterface, PlanModule, ProjectPlan, RepoSnapshot, Risk, SharedFileRule } from "../lib/types";
import type { Complete } from "../lib/llm";
import * as scene from "./scenes";
import { DAY, iso, ms } from "./util";

/* ------------------------------------------------------------------ */
/* Folders                                                             */
/* ------------------------------------------------------------------ */

/** "src/auth/**" -> "src/auth". Anything after the first wildcard is ignored. */
export function folderPrefix(glob: string): string {
  const cut = glob.search(/[*?[]/);
  return (cut === -1 ? glob : glob.slice(0, cut)).replace(/^\.?\//, "").replace(/\/+$/, "");
}

export function inFolder(path: string, glob: string): boolean {
  const prefix = folderPrefix(glob);
  return prefix === "" ? false : path === prefix || path.startsWith(`${prefix}/`);
}

/** True when one folder sits inside the other (or they are the same). */
function nested(a: string, b: string): boolean {
  const pa = folderPrefix(a);
  const pb = folderPrefix(b);
  return pa === pb || pa.startsWith(`${pb}/`) || pb.startsWith(`${pa}/`);
}

/* ------------------------------------------------------------------ */
/* Validation (same five rules as the /plan page, plus a few)         */
/* ------------------------------------------------------------------ */

export function validatePlan(plan: ProjectPlan): string[] {
  const problems: string[] = [];
  const ids = new Set(plan.modules.map((m) => m.id));
  const inRange = (s: number) => Number.isInteger(s) && s >= 0 && s < plan.teamSize;

  if (plan.modules.length === 0) problems.push("The plan has no modules.");
  if (ids.size !== plan.modules.length) problems.push("Two modules share an id.");
  for (const m of plan.modules) {
    if (!inRange(m.ownerSlot)) problems.push(`${m.name} has no valid owner.`);
    if (m.folders.length === 0) problems.push(`${m.name} owns no folder.`);
    for (const d of m.dependsOn) if (!ids.has(d)) problems.push(`${m.name} depends on unknown module ${d}.`);
  }
  for (let i = 0; i < plan.modules.length; i++) {
    for (let j = i + 1; j < plan.modules.length; j++) {
      const a = plan.modules[i];
      const b = plan.modules[j];
      for (const fa of a.folders) for (const fb of b.folders) {
        if (nested(fa, fb)) problems.push(`${fa} (${a.name}) and ${fb} (${b.name}) overlap.`);
      }
    }
  }
  const shared = new Set<string>();
  for (const s of plan.sharedFiles) {
    if (shared.has(s.path)) problems.push(`${s.path} is listed twice as a shared file.`);
    shared.add(s.path);
    if (!inRange(s.ownerSlot)) problems.push(`${s.path} has no valid owner.`);
  }
  const pos = new Map(plan.mergeOrder.map((id, i) => [id, i]));
  if (pos.size !== plan.mergeOrder.length) problems.push("A module appears twice in the merge order.");
  for (const m of plan.modules) {
    if (!pos.has(m.id)) problems.push(`${m.name} is missing from the merge order.`);
    for (const d of m.dependsOn) {
      if (pos.has(d) && pos.has(m.id) && pos.get(d)! > pos.get(m.id)!) problems.push(`${m.name} merges before ${d}, which it needs.`);
    }
  }
  for (const id of plan.mergeOrder) if (!ids.has(id)) problems.push(`Merge order has unknown module ${id}.`);
  const used = new Set(plan.modules.map((m) => m.ownerSlot));
  if (plan.modules.length >= plan.teamSize && used.size < plan.teamSize) problems.push("Someone owns no module.");
  return problems;
}

/** Dependencies first, otherwise keep the given order. Null on a cycle. */
function topoOrder(modules: PlanModule[], preferred: string[]): string[] | null {
  const rank = new Map(preferred.map((id, i) => [id, i]));
  const byRank = [...modules].sort((a, b) => (rank.get(a.id) ?? 999) - (rank.get(b.id) ?? 999));
  const done = new Set<string>();
  const out: string[] = [];
  while (out.length < modules.length) {
    const next = byRank.find((m) => !done.has(m.id) && m.dependsOn.every((d) => done.has(d)));
    if (!next) return null;
    done.add(next.id);
    out.push(next.id);
  }
  return out;
}

/**
 * Safe fixes only: wrap owners into range, drop unknown dependencies and
 * overlapping folders, de-duplicate shared files, rebuild the merge order,
 * and give an idle person the busiest owner's last module.
 */
export function repairPlan(plan: ProjectPlan): ProjectPlan {
  const n = plan.teamSize;
  const wrap = (s: number) => (Number.isInteger(s) ? ((s % n) + n) % n : 0);
  const ids = new Set(plan.modules.map((m) => m.id));

  const taken: string[] = [];
  let modules: PlanModule[] = plan.modules.map((m) => {
    const folders = m.folders.filter((f) => folderPrefix(f) !== "" && !taken.some((t) => nested(t, f)));
    taken.push(...folders);
    return { ...m, ownerSlot: wrap(m.ownerSlot), folders, dependsOn: [...new Set(m.dependsOn.filter((d) => ids.has(d) && d !== m.id))] };
  });
  modules = modules.filter((m) => m.folders.length > 0);
  const kept = new Set(modules.map((m) => m.id));
  modules = modules.map((m) => ({ ...m, dependsOn: m.dependsOn.filter((d) => kept.has(d)) }));

  if (modules.length >= n) {
    for (let guard = 0; guard < n; guard++) {
      const counts = Array.from({ length: n }, (_, s) => modules.filter((m) => m.ownerSlot === s).length);
      const idle = counts.indexOf(0);
      if (idle === -1) break;
      const busiest = counts.indexOf(Math.max(...counts));
      const last = [...modules].reverse().find((m) => m.ownerSlot === busiest)!;
      modules = modules.map((m) => (m.id === last.id ? { ...m, ownerSlot: idle } : m));
    }
  }

  const seen = new Set<string>();
  const sharedFiles = plan.sharedFiles
    .filter((s) => s.path && !seen.has(s.path) && seen.add(s.path))
    .map((s) => ({ ...s, ownerSlot: wrap(s.ownerSlot) }));
  const interfaces = plan.interfaces.filter((i) => kept.has(i.between[0]) && kept.has(i.between[1]) && i.between[0] !== i.between[1]);
  const mergeOrder = topoOrder(modules, plan.mergeOrder) ?? plan.mergeOrder.filter((id) => kept.has(id));
  return { ...plan, modules, sharedFiles, interfaces, mergeOrder };
}

/* ------------------------------------------------------------------ */
/* Template plan: deterministic, built from words in the PRD           */
/* ------------------------------------------------------------------ */

interface Block {
  id: string;
  name: string;
  words: RegExp;
  folders: string[];
  tasks: string[];
  dependsOn: string[];
}

const BLOCKS: Block[] = [
  { id: "auth", name: "Sign-in and accounts", words: /log ?in|sign ?(in|up)|account|auth|user|profile|password/i, folders: ["src/auth/**"], tasks: ["Sign-up and login", "Sessions", "Profile page"], dependsOn: [] },
  { id: "api", name: "Data and API", words: /./, folders: ["src/api/**", "src/db/**"], tasks: ["Database schema", "API routes", "Input checks"], dependsOn: [] },
  { id: "screens", name: "Main screens", words: /./, folders: ["src/pages/**", "src/components/**"], tasks: ["Home screen", "List and detail views", "Empty and error states"], dependsOn: ["api"] },
  { id: "search", name: "Search and filters", words: /search|filter|sort|find/i, folders: ["src/search/**"], tasks: ["Search box", "Filters", "Result ranking"], dependsOn: ["api"] },
  { id: "payments", name: "Payments", words: /pay|checkout|cart|order|subscription|billing/i, folders: ["src/payments/**"], tasks: ["Checkout flow", "Payment provider", "Receipts"], dependsOn: ["api"] },
  { id: "notify", name: "Notifications", words: /notif|email|alert|remind|message|chat/i, folders: ["src/notify/**"], tasks: ["In-app alerts", "Email or push", "Settings for alerts"], dependsOn: ["api"] },
  { id: "maps", name: "Maps and location", words: /map|location|gps|route|nearby/i, folders: ["src/maps/**"], tasks: ["Map view", "Location lookup", "Markers"], dependsOn: ["api"] },
  { id: "admin", name: "Admin and reports", words: /admin|dashboard|report|analytics|moderat/i, folders: ["src/admin/**"], tasks: ["Admin screen", "Reports", "Roles"], dependsOn: ["api"] },
  { id: "upload", name: "Files and media", words: /upload|image|photo|video|file|media/i, folders: ["src/media/**"], tasks: ["Upload", "Storage", "Previews"], dependsOn: ["api"] },
  { id: "docs", name: "Docs and design", words: /./, folders: ["docs/**", "design/**"], tasks: ["Wireframes", "README and setup", "Demo script"], dependsOn: [] },
];

export function templatePlan(prd: string, teamSize: number): ProjectPlan {
  const picked = BLOCKS.filter((b) => b.words.test(prd));
  // api depends on auth only when the PRD has accounts.
  const hasAuth = picked.some((b) => b.id === "auth");
  const modules: PlanModule[] = picked.slice(0, 8).map((b, i) => ({
    id: b.id,
    name: b.name,
    ownerSlot: i % teamSize,
    folders: b.folders,
    tasks: b.tasks,
    dependsOn: b.id === "api" && hasAuth ? ["auth"] : b.dependsOn,
  }));
  const ids = new Set(modules.map((m) => m.id));
  const interfaces: PlanInterface[] = modules
    .filter((m) => m.dependsOn.length > 0)
    .flatMap((m) => m.dependsOn.filter((d) => ids.has(d)).map((d) => ({
      between: [d, m.id] as [string, string],
      agreeFirst: d === "auth" ? "Shape of the user object and the session" : `JSON shape of the ${m.name.toLowerCase()} API responses`,
    })));
  const sharedFiles: SharedFileRule[] = [
    { path: "package.json", ownerSlot: 0, rule: "Others ask in a PR comment; the owner adds the package." },
    { path: "package-lock.json", ownerSlot: 0, rule: "Never edit by hand; the owner regenerates it after merging." },
    { path: "src/routes.js", ownerSlot: 1 % teamSize, rule: "Each person adds routes in one small PR; the owner merges." },
    { path: "README.md", ownerSlot: (teamSize - 1) % teamSize, rule: "Send changes as notes; the owner edits." },
  ];
  const plan: ProjectPlan = { teamSize, modules, sharedFiles, interfaces, mergeOrder: modules.map((m) => m.id), source: "template" };
  return repairPlan(plan);
}

/* ------------------------------------------------------------------ */
/* AI plan                                                             */
/* ------------------------------------------------------------------ */

const PLAN_RULES = (n: number) => `You split a product requirements document (PRD) into a work plan for a student team of ${n} people, so that they get as few merge conflicts as possible.
Rules:
- 3 to 8 modules. Each module has exactly one owner: ownerSlot is a number from 0 to ${n - 1}. Everyone owns at least one module.
- Each module owns its own folders as globs like "src/auth/**". No folder may be owned by two modules, and no folder may sit inside another module's folder (so never "src/**").
- 2 to 5 short task titles per module, in plain words.
- dependsOn lists module ids that must exist first.
- sharedFiles: files everyone touches (package.json, package-lock.json, route lists, config, README). Each has exactly one owner and a one-line rule for how others change it.
- interfaces: pairs of module ids and what the two owners must agree on first.
- mergeOrder: every module id once, dependencies first.
- Module names and text in sentence case, plain words, no emojis.
Answer with JSON only:
{"modules":[{"id":"auth","name":"Sign-in and accounts","ownerSlot":0,"folders":["src/auth/**"],"tasks":["..."],"dependsOn":[]}],
 "sharedFiles":[{"path":"package.json","ownerSlot":0,"rule":"..."}],
 "interfaces":[{"between":["auth","api"],"agreeFirst":"..."}],
 "mergeOrder":["auth","api"]}`;

const str = (v: unknown, max = 120): string | null => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);
const strs = (v: unknown, max = 120): string[] => (Array.isArray(v) ? v.map((x) => str(x, max)).filter((x): x is string => x !== null) : []);
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 32);

/** Turns the model's JSON into a ProjectPlan, dropping anything malformed. */
export function parsePlan(text: string | null, teamSize: number): ProjectPlan | null {
  if (!text) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(text.replace(/^```(?:json)?\s*|\s*```$/g, "")) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || !Array.isArray(raw.modules)) return null;
  const modules: PlanModule[] = (raw.modules as Record<string, unknown>[]).flatMap((m) => {
    const name = str(m?.name, 60);
    const id = slug(str(m?.id, 40) ?? name ?? "");
    if (!name || !id) return [];
    return [{
      id,
      name,
      ownerSlot: Number(m.ownerSlot),
      folders: strs(m.folders, 80).slice(0, 4),
      tasks: strs(m.tasks, 80).slice(0, 6),
      dependsOn: strs(m.dependsOn, 40).map(slug),
    }];
  });
  const sharedFiles: SharedFileRule[] = Array.isArray(raw.sharedFiles)
    ? (raw.sharedFiles as Record<string, unknown>[]).flatMap((s) => {
      const path = str(s?.path, 80);
      return path ? [{ path, ownerSlot: Number(s.ownerSlot), rule: str(s.rule, 160) ?? "Changes go through the owner." }] : [];
    })
    : [];
  const interfaces: PlanInterface[] = Array.isArray(raw.interfaces)
    ? (raw.interfaces as Record<string, unknown>[]).flatMap((i) => {
      const b = strs(i?.between, 40).map(slug);
      const agree = str(i?.agreeFirst, 160);
      return b.length === 2 && agree ? [{ between: [b[0], b[1]] as [string, string], agreeFirst: agree }] : [];
    })
    : [];
  return { teamSize, modules: modules.slice(0, 8), sharedFiles: sharedFiles.slice(0, 8), interfaces: interfaces.slice(0, 10), mergeOrder: strs(raw.mergeOrder, 40).map(slug), source: "ai" };
}

/** AI plan, checked and repaired by code; the template plan if that fails. */
export async function planFrom(prd: string, teamSize: number, complete: Complete): Promise<ProjectPlan> {
  const answer = await complete(prd.slice(0, 12_000), {
    system: PLAN_RULES(teamSize),
    json: true,
    temperature: 0.2,
    maxTokens: 4096,
    timeoutMs: 20_000,
  });
  const parsed = parsePlan(answer, teamSize);
  if (parsed) {
    if (validatePlan(parsed).length === 0) return parsed;
    const repaired = repairPlan(parsed);
    if (repaired.modules.length >= 2 && validatePlan(repaired).length === 0) return repaired;
  }
  return templatePlan(prd, teamSize);
}

/* ------------------------------------------------------------------ */
/* Plan versus reality                                                 */
/* ------------------------------------------------------------------ */

interface Change {
  path: string;
  author: string;
  where: string; // branch name, or "PR #12"
  branch: Branch | null;
  at: number;
  open: boolean;
}

/**
 * Compares what people changed with who owns it in the plan. Slot i is
 * team.people[i] unless `owners` (Person.id per slot) says otherwise.
 * Looks at open branches and PRs merged in the last 14 days.
 */
export function checkPlan(plan: ProjectPlan, s: RepoSnapshot, owners?: string[]): Risk[] {
  const personOf = (slot: number) => owners?.[slot] ?? s.team.people[slot]?.id;
  const name = (id: string | undefined) => s.team.people.find((p) => p.id === id)?.displayName ?? "someone";
  const asOf = ms(s.asOf);

  const changes: Change[] = [];
  for (const b of s.branches) {
    for (const f of b.filesTouched) {
      const first = s.commits.find((c) => c.branch === b.name && c.files.includes(f.path));
      changes.push({ path: f.path, author: b.owner, where: b.name, branch: b, at: ms(first?.date ?? b.createdAt), open: true });
    }
  }
  for (const p of s.pullRequests) {
    if (p.state !== "merged" || !p.mergedAt || ms(p.mergedAt) < asOf - 14 * DAY) continue;
    for (const f of p.files) changes.push({ path: f.path, author: p.author, where: `PR #${p.number}`, branch: null, at: ms(p.createdAt), open: false });
  }

  // Group by (who changed it, whose it is, what), one risk per group.
  const groups = new Map<string, { kind: "folder" | "shared"; owner: string; label: string; items: Change[] }>();
  for (const c of changes) {
    const shared = plan.sharedFiles.find((x) => c.path === x.path || c.path.endsWith(`/${x.path}`));
    const mod = shared ? undefined : plan.modules.find((m) => m.folders.some((f) => inFolder(c.path, f)));
    const ownerSlot = shared?.ownerSlot ?? mod?.ownerSlot;
    if (ownerSlot === undefined) continue;
    const owner = personOf(ownerSlot);
    if (!owner || owner === c.author) continue;
    const key = shared ? `shared:${shared.path}:${c.author}` : `folder:${mod!.id}:${c.author}`;
    const g = groups.get(key) ?? { kind: shared ? "shared" : "folder", owner, label: shared ? shared.path : mod!.name, items: [] };
    g.items.push(c);
    groups.set(key, g);
  }

  return [...groups.entries()].map(([key, g]) => {
    const editor = g.items[0].author;
    const open = g.items.some((c) => c.open);
    const files = [...new Set(g.items.map((c) => c.path))];
    const places = [...new Set(g.items.map((c) => c.where))];
    const branch = g.items.find((c) => c.branch)?.branch ?? null;
    const first = Math.min(...g.items.map((c) => c.at));
    const what = g.kind === "shared" ? scene.base(g.label) : `the ${g.label} folder`;
    const title = g.kind === "shared"
      ? `${name(editor)} changed ${scene.base(g.label)}, owned by ${name(g.owner)}`
      : `${name(editor)} edited ${name(g.owner)}'s folder`;
    return {
      id: `task_code_mismatch-${key.replace(/[^A-Za-z0-9]+/g, "-").toLowerCase()}`.slice(0, 64),
      kind: "task_code_mismatch" as const,
      severity: open ? ("medium" as const) : ("low" as const),
      title,
      summary: `${name(editor)} changed ${files.length === 1 ? files[0] : `${files.length} files`} in ${what}, which the plan gives to ${name(g.owner)}.`,
      summarySource: "template" as const,
      rule: g.kind === "shared"
        ? "The plan gives each shared file one owner; others ask the owner instead of editing it. Checked on open branches and PRs merged in the last 14 days."
        : "The plan gives each folder one owner, so two people do not edit the same code. Checked on open branches and PRs merged in the last 14 days.",
      evidence: [
        { label: "Changed by", value: name(editor), ref: { type: "person" as const, id: editor } },
        { label: "Owner in the plan", value: name(g.owner), ref: { type: "person" as const, id: g.owner } },
        ...files.slice(0, 4).map((f) => ({ label: "File", value: f, ref: { type: "file" as const, id: f } })),
        { label: open ? "Where (still open)" : "Where (merged)", value: places.join(", ") },
      ],
      people: [editor, g.owner],
      action: open
        ? `${name(editor)} asks ${name(g.owner)} to review these changes before merging, or moves them into their own folder.`
        : `${name(g.owner)} reviews the merged change; next time ${name(editor)} asks first.`,
      scene: scene.outsidePlan(branch?.name ?? places[0], editor, scene.base(files[0]), name(g.owner),
        `${name(editor)} changed ${scene.base(files[0])}, which the plan gives to ${name(g.owner)}.`),
      firstDetectableAt: iso(first),
    };
  }).sort((a, b) => (a.severity === b.severity ? a.firstDetectableAt.localeCompare(b.firstDetectableAt) : a.severity === "medium" ? -1 : 1));
}

