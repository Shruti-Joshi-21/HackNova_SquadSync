import type { GraphScene, ProjectPlan } from "@/lib/types";

// Checks the page runs on any plan it shows, so the "checked by code" line is
// true even for an AI plan. The server (B7) validates too; this is what we show.

export interface PlanCheck {
  label: string;
  ok: boolean;
  detail?: string;
}

export const slotName = (slot: number) => `Member ${String.fromCharCode(65 + slot)}`;

export function checkPlanShape(plan: ProjectPlan): PlanCheck[] {
  const ids = new Set(plan.modules.map((m) => m.id));
  const inRange = (s: number) => Number.isInteger(s) && s >= 0 && s < plan.teamSize;

  const badOwner = plan.modules.filter((m) => !inRange(m.ownerSlot)).map((m) => m.name);

  const folderOwner = new Map<string, string>();
  const doubleFolders: string[] = [];
  for (const m of plan.modules) {
    for (const f of m.folders) {
      if (folderOwner.has(f) && folderOwner.get(f) !== m.id) doubleFolders.push(f);
      folderOwner.set(f, m.id);
    }
  }

  const seenShared = new Set<string>();
  const badShared = plan.sharedFiles
    .filter((s) => {
      const dup = seenShared.has(s.path);
      seenShared.add(s.path);
      return dup || !inRange(s.ownerSlot);
    })
    .map((s) => s.path);

  const pos = new Map(plan.mergeOrder.map((id, i) => [id, i]));
  const missingFromOrder = plan.modules.filter((m) => !pos.has(m.id)).map((m) => m.name);
  const orderBreaks = plan.modules.flatMap((m) =>
    m.dependsOn
      .filter((d) => ids.has(d) && pos.has(d) && pos.has(m.id) && pos.get(d)! > pos.get(m.id)!)
      .map((d) => `${m.name} before ${d}`),
  );

  const used = new Set(plan.modules.map((m) => m.ownerSlot));
  const idle = Array.from({ length: plan.teamSize }, (_, s) => s).filter((s) => !used.has(s));

  return [
    { label: "Every module has one owner", ok: badOwner.length === 0, detail: badOwner.join(", ") },
    { label: "No folder is owned by two modules", ok: doubleFolders.length === 0, detail: doubleFolders.join(", ") },
    { label: "Each shared file has a single owner", ok: badShared.length === 0, detail: badShared.join(", ") },
    {
      label: "Merge order includes every module and respects dependencies",
      ok: missingFromOrder.length === 0 && orderBreaks.length === 0,
      detail: [...missingFromOrder.map((n) => `${n} missing`), ...orderBreaks].join(", "),
    },
    {
      label: "Everyone owns at least one module",
      ok: idle.length === 0,
      detail: idle.length ? `${idle.map(slotName).join(", ")} own nothing; there are fewer modules than people` : "",
    },
  ];
}

/** Merge order as a GitGraph scene: one lane per owner, each module merges into main in turn. */
export function mergeOrderScene(plan: ProjectPlan): GraphScene {
  const byId = new Map(plan.modules.map((m) => [m.id, m]));
  const order = plan.mergeOrder.filter((id) => byId.has(id));
  const owners = [...new Set(order.map((id) => byId.get(id)!.ownerSlot))].sort((a, b) => a - b);

  const scene: GraphScene = {
    lanes: [
      ...owners.map((s) => ({ id: `slot-${s}`, label: slotName(s), kind: "branch" as const, personId: `slot-${s}` })),
      { id: "main", label: "main", kind: "main" },
    ],
    nodes: [{ id: "start", lane: "main", slot: 0, state: "commit", step: 1 }],
    edges: [],
    steps: order.length + 1,
    caption: `Merge order: ${order.map((id) => byId.get(id)!.name).join(", then ")}.`,
  };

  let prevMain = "start";
  order.forEach((id, i) => {
    const m = byId.get(id)!;
    const step = i + 2;
    scene.nodes.push({ id: `mod-${id}`, lane: `slot-${m.ownerSlot}`, slot: 2 * i + 1, state: "commit", label: m.name, step });
    scene.nodes.push({ id: `merge-${id}`, lane: "main", slot: 2 * i + 2, state: "merge", step });
    scene.edges.push({ from: prevMain, to: `mod-${id}`, state: "normal", step });
    scene.edges.push({ from: `mod-${id}`, to: `merge-${id}`, state: "normal", step });
    scene.edges.push({ from: prevMain, to: `merge-${id}`, state: "normal", step });
    prevMain = `merge-${id}`;
  });

  return scene;
}
