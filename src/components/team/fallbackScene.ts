import type { Analysis, GraphEdge, GraphLane, GraphNode, GraphScene, Risk } from "@/lib/types";
import { pct, shortDate } from "@/components/ui";

// The engine draws scenes for branch-shaped risks. For the others (schedule,
// workload, a person's reviews, an old open PR) this builds a picture from the
// risk's own numbers, so every risk opens with one. Nothing here is invented:
// each node stands for a number already in the risk or the analysis.

export function sceneFor(risk: Risk, a: Analysis): GraphScene | undefined {
  if (risk.scene) return risk.scene;
  switch (risk.kind) {
    case "deadline_slip":
      return deadline(a);
    case "workload_imbalance":
      return workload(a);
    case "review_gap":
      return risk.people.length === 1 ? reviews(risk.people[0], a) : undefined;
    case "late_integration":
      return openPr(risk, a);
    default:
      return undefined;
  }
}

const MAIN: GraphLane = { id: "main", label: "main", kind: "main" };
const name = (a: Analysis, id: string) => a.team.people.find((p) => p.id === id)?.displayName ?? id;
const chain = (ids: string[], state: GraphEdge["state"], step: number): GraphEdge[] =>
  ids.slice(1).map((id, i) => ({ from: ids[i], to: id, state, step }));

// Work done up to today, the work left at this pace, the deadline it misses.
function deadline(a: Analysis): GraphScene | undefined {
  const s = a.schedule;
  if (!s.projectedFinish) return undefined;
  const nodes: GraphNode[] = [
    { id: "d0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "d1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "d2", lane: "main", slot: 2, state: "commit", label: "today", step: 1 },
    { id: "f1", lane: "main", slot: 3, state: "future", step: 2 },
    { id: "dl", lane: "main", slot: 4, state: "warning", label: `deadline ${shortDate(a.team.deadline)}`, step: 3 },
    { id: "f2", lane: "main", slot: 5, state: "future", step: 3 },
    { id: "pf", lane: "main", slot: 6, state: "conflict", label: `done ${shortDate(s.projectedFinish)}`, step: 4 },
  ];
  return {
    lanes: [MAIN],
    nodes,
    edges: [...chain(["d0", "d1", "d2"], "normal", 1), ...chain(["d2", "f1", "dl"], "dashed", 2), ...chain(["dl", "f2", "pf"], "danger", 4)],
    steps: 4,
    caption: `${s.tasksTotal - s.tasksDone} tasks left. At this pace they finish after the deadline.`,
  };
}

// One lane per person; the dots on a lane follow their combined share of the work.
function workload(a: Analysis): GraphScene | undefined {
  if (a.shares.length === 0) return undefined;
  const lanes: GraphLane[] = a.shares.map((s) => ({
    id: s.personId,
    label: name(a, s.personId),
    kind: "branch",
    personId: s.personId,
  }));
  const nodes: GraphNode[] = [{ id: "m0", lane: "main", slot: 0, state: "commit", step: 1 }];
  const edges: GraphEdge[] = [];
  a.shares.forEach((s, i) => {
    const dots = Math.max(1, Math.round(s.composite * 12));
    const ids = Array.from({ length: dots }, (_, k) => `w${i}-${k}`);
    ids.forEach((id, k) =>
      nodes.push({
        id,
        lane: s.personId,
        slot: k + 1,
        state: k === dots - 1 && s.flagged ? "warning" : "commit",
        label: k === dots - 1 ? pct(s.composite) : undefined,
        step: 2,
      }),
    );
    edges.push({ from: "m0", to: ids[0], state: "normal", step: 2 }, ...chain(ids, "normal", 2));
  });
  return {
    lanes: [...lanes, MAIN],
    nodes,
    edges,
    steps: 2,
    caption: "Each dot is about 8% of the team's combined work: tasks, code, reviews and docs.",
  };
}

// Teammates' work merging into main, with nobody from this person reviewing it.
function reviews(personId: string, a: Analysis): GraphScene | undefined {
  const mates = a.team.people.filter((p) => p.id !== personId).slice(0, 3);
  if (mates.length === 0) return undefined;
  const who = name(a, personId);
  const nodes: GraphNode[] = [{ id: "m0", lane: "main", slot: 0, state: "commit", step: 1 }];
  const edges: GraphEdge[] = [];
  let prev = "m0";
  mates.forEach((p, i) => {
    const c = `c${i}`;
    const m = `m${i + 1}`;
    nodes.push({ id: c, lane: p.id, slot: 1 + i * 2, state: "commit", step: 2 + i });
    nodes.push({ id: m, lane: "main", slot: 2 + i * 2, state: "warning", label: i === 0 ? `no review by ${who.replace("Member ", "")}` : undefined, step: 2 + i });
    edges.push({ from: prev, to: c, state: "normal", step: 2 + i }, { from: c, to: m, state: "normal", step: 2 + i }, { from: prev, to: m, state: "normal", step: 2 + i });
    prev = m;
  });
  return {
    lanes: [...mates.map<GraphLane>((p) => ({ id: p.id, label: p.displayName, kind: "branch", personId: p.id })), MAIN],
    nodes,
    edges,
    steps: 1 + mates.length,
    caption: `Teammates' work is merged into main, and ${who} reads none of it first.`,
  };
}

// An open PR that keeps growing and has not reached main.
function openPr(risk: Risk, a: Analysis): GraphScene | undefined {
  const pr = risk.evidence.find((e) => e.ref?.type === "pr");
  const author = risk.people[0];
  if (!pr || !author) return undefined;
  const lines = risk.evidence.find((e) => e.label === "Changed lines")?.value;
  const lane: GraphLane = { id: "pr", label: `PR #${pr.ref!.id}`, kind: "branch", personId: author };
  const nodes: GraphNode[] = [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 3, state: "commit", step: 1 },
    { id: "p0", lane: "pr", slot: 1, state: "commit", label: "opened", step: 2 },
    { id: "p1", lane: "pr", slot: 2, state: "commit", step: 2 },
    { id: "p2", lane: "pr", slot: 3, state: "commit", step: 2 },
    { id: "p3", lane: "pr", slot: 4, state: "warning", label: lines ? `${lines} lines` : "still open", step: 3 },
    { id: "mf", lane: "main", slot: 5, state: "future", label: "not merged", step: 4 },
  ];
  return {
    lanes: [lane, MAIN],
    nodes,
    edges: [
      ...chain(["m0", "m1", "mf"], "normal", 1),
      { from: "m0", to: "p0", state: "normal", step: 2 },
      ...chain(["p0", "p1", "p2"], "normal", 2),
      { from: "p2", to: "p3", state: "normal", step: 3 },
      { from: "p3", to: "mf", state: "dashed", step: 4 },
    ],
    steps: 4,
    caption: `${name(a, author)}'s pull request keeps growing and has not reached main.`,
  };
}
