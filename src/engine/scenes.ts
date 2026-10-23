// Builds the node-and-edge picture (GraphScene) for a risk, from real data.
// Layout follows src/mocks/scenes.ts: branch lanes first, main last,
// nodes appear at step 1 and up, about 9 slots at most.

import type { Branch, Commit, GraphEdge, GraphLane, GraphNode, GraphScene, NodeState, PullRequest, Task } from "../lib/types";

class Scene {
  private lanes: GraphLane[] = [];
  private nodes: GraphNode[] = [];
  private edges: GraphEdge[] = [];

  lane(id: string, kind: "main" | "branch", personId?: string, label?: string): string {
    if (!this.lanes.some((l) => l.id === id)) {
      this.lanes.push({ id, label: label ?? laneLabel(id), kind, ...(personId ? { personId } : {}) });
    }
    return id;
  }

  node(id: string, lane: string, slot: number, state: NodeState, step: number, label?: string): string {
    this.nodes.push({ id, lane, slot, state, step, ...(label ? { label } : {}) });
    return id;
  }

  edge(from: string, to: string, step: number, state: GraphEdge["state"] = "normal"): void {
    this.edges.push({ from, to, state, step });
  }

  done(caption: string): GraphScene {
    // Main goes last so it is drawn at the bottom.
    const lanes = [...this.lanes.filter((l) => l.kind === "branch"), ...this.lanes.filter((l) => l.kind === "main")];
    const steps = Math.max(1, ...this.nodes.map((n) => n.step), ...this.edges.map((e) => e.step));
    return { lanes, nodes: this.nodes, edges: this.edges, steps, caption };
  }
}

/** Long branch names lose "feature/" so the pill fits a 360px side panel. */
function laneLabel(name: string): string {
  const short = name.length > 22 ? name.replace(/^(feature|fix|feat)\//, "") : name;
  return short.length > 24 ? `${short.slice(0, 23)}…` : short;
}

export function base(path: string): string {
  return path.split("/").pop() ?? path;
}

export function rangeText(ranges: [number, number][]): string {
  if (ranges.length === 0) return "whole file";
  return ranges.map(([a, b]) => (a === b ? `L${a}` : `L${a}-${b}`)).join(", ");
}

/** Two branches off main, both reach one merge point. Scenes 1, 2, 9, 10. */
export function twoBranches(
  a: Branch, b: Branch, labelA: string, labelB: string, end: "conflict" | "warning", endLabel: string, caption: string,
): GraphScene {
  const s = new Scene();
  const la = s.lane(a.name, "branch", a.owner);
  const lb = s.lane(b.name, "branch", b.owner);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("a1", la, 2, "commit", 2);
  s.node("b1", lb, 2, "commit", 2);
  s.edge("m1", "a1", 2);
  s.edge("m1", "b1", 2);
  s.node("a2", la, 3, "commit", 3, labelA);
  s.node("b2", lb, 4, "commit", 3, labelB);
  s.edge("a1", "a2", 3);
  s.edge("b1", "b2", 3);
  s.node("m2", main, 5, "merge", 4);
  s.edge("m1", "m2", 4);
  s.edge("a2", "m2", 4);
  s.node("m3", main, 6, end, 5, endLabel);
  s.edge("m2", "m3", 5);
  s.edge("b2", "m3", 5, end === "conflict" ? "danger" : "normal");
  return s.done(caption);
}

/** One branch deletes a file, the other edits it. Scene 6. */
export function modifyDelete(editor: Branch, remover: Branch, path: string, caption: string): GraphScene {
  const s = new Scene();
  const le = s.lane(editor.name, "branch", editor.owner);
  const lr = s.lane(remover.name, "branch", remover.owner);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("e1", le, 2, "commit", 2);
  s.node("e2", le, 4, "commit", 2, `edit ${base(path)}`);
  s.node("r1", lr, 2, "commit", 2, `rm ${base(path)}`);
  s.edge("m1", "e1", 2);
  s.edge("e1", "e2", 2);
  s.edge("m1", "r1", 2);
  s.node("m2", main, 3, "merge", 3);
  s.edge("m1", "m2", 3);
  s.edge("r1", "m2", 3);
  s.node("m3", main, 5, "conflict", 4, base(path));
  s.edge("m2", "m3", 4);
  s.edge("e2", "m3", 4, "danger");
  return s.done(caption);
}

/** A branch far behind main. Scene 3. */
export function drift(b: Branch, end: "warning" | "conflict", caption: string): GraphScene {
  const s = new Scene();
  const lb = s.lane(b.name, "branch", b.owner);
  const main = s.lane("main", "main");
  const shown = Math.min(6, Math.max(2, b.behindMain));
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("b1", lb, 2, "commit", 2);
  s.node("b2", lb, 3, "commit", 2);
  s.edge("m1", "b1", 2);
  s.edge("b1", "b2", 2);
  let prev = "m1";
  for (let i = 0; i < shown; i++) {
    const id = `d${i}`;
    s.node(id, main, 2 + i, "commit", 3);
    s.edge(prev, id, 3);
    prev = id;
  }
  s.node("end", main, 2 + shown, end, 4, `${b.behindMain} behind`);
  s.edge(prev, "end", 4);
  s.edge("b2", "end", 4, "dashed");
  return s.done(caption);
}

/** A commit lands on main with no PR while a branch is open. Scene 4. */
export function directPush(push: Commit, b: Branch | undefined, end: "warning" | "conflict", endLabel: string, caption: string): GraphScene {
  const s = new Scene();
  const lb = b ? s.lane(b.name, "branch", b.owner) : null;
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  if (lb) {
    s.node("b1", lb, 2, "commit", 2);
    s.node("b2", lb, 4, "commit", 2);
    s.edge("m1", "b1", 2);
    s.edge("b1", "b2", 2);
  }
  s.node("p", main, 3, "warning", 3, "no PR");
  s.edge("m1", "p", 3);
  if (lb) {
    s.node("m3", main, 5, end, 4, endLabel);
    s.edge("p", "m3", 4);
    s.edge("b2", "m3", 4, end === "conflict" ? "danger" : "normal");
  }
  return s.done(caption);
}

/** GitHub already says the PR conflicts. Scene 5. */
export function prConflicting(pr: PullRequest, owner: string, caption: string): GraphScene {
  const s = new Scene();
  const lb = s.lane(pr.branch, "branch", owner);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.node("m2", main, 3, "commit", 1);
  s.node("m3", main, 5, "conflict", 1, `PR #${pr.number}`);
  s.edge("m0", "m1", 1);
  s.edge("m1", "m2", 1);
  s.edge("m2", "m3", 1);
  s.node("b1", lb, 2, "commit", 2);
  s.node("b2", lb, 4, "commit", 2);
  s.edge("m1", "b1", 2);
  s.edge("b1", "b2", 2);
  s.edge("b2", "m3", 3, "danger");
  return s.done(caption);
}

/** Many branches pile into main at the end. Scene 7. */
export function lateMerge(prs: PullRequest[], end: "warning" | "conflict", endLabel: string, caption: string): GraphScene {
  const s = new Scene();
  const picked = prs.slice(0, 3);
  const lanes = picked.map((p) => s.lane(p.branch, "branch", p.author));
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 4, "commit", 1);
  s.edge("m0", "m1", 1);
  lanes.forEach((lane, i) => {
    s.node(`x${i}`, lane, 1 + (i % 2), "commit", 2);
    s.node(`y${i}`, lane, 3 + i, "commit", 2);
    s.edge("m0", `x${i}`, 2);
    s.edge(`x${i}`, `y${i}`, 2);
  });
  let prev = "m1";
  lanes.forEach((_, i) => {
    const last = i === lanes.length - 1;
    const id = `j${i}`;
    s.node(id, main, 6 + i, last ? end : "warning", 3 + i, last ? endLabel : undefined);
    s.edge(prev, id, 3 + i);
    s.edge(`y${i}`, id, 3 + i, last && end === "conflict" ? "danger" : "normal");
    prev = id;
  });
  return s.done(caption);
}

/** A PR merged with nobody reviewing. Scene 8. */
export function noReview(pr: PullRequest, caption: string): GraphScene {
  const s = new Scene();
  const review = s.lane("review", "branch", undefined, "no reviewer");
  const lb = s.lane(pr.branch, "branch", pr.author);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("b1", lb, 2, "commit", 2);
  s.node("b2", lb, 3, "commit", 2);
  s.edge("m1", "b1", 2);
  s.edge("b1", "b2", 2);
  s.node("r1", review, 4, "future", 3, "review");
  s.edge("b2", "r1", 3, "dashed");
  s.node("m2", main, 5, "warning", 4, `PR #${pr.number}`);
  s.edge("r1", "m2", 3, "dashed");
  s.edge("m1", "m2", 4);
  s.edge("b2", "m2", 4);
  return s.done(caption);
}

/** A branch that stopped: its lane ends in a dashed future. Scene 11. */
export function stale(b: Branch, days: number, caption: string): GraphScene {
  const s = new Scene();
  const lb = s.lane(b.name, "branch", b.owner);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("b1", lb, 2, "commit", 2);
  s.node("b2", lb, 3, "commit", 2, "last push");
  s.edge("m1", "b1", 2);
  s.edge("b1", "b2", 2);
  s.node("m2", main, 4, "commit", 3);
  s.node("m3", main, 6, "commit", 3);
  s.edge("m1", "m2", 3);
  s.edge("m2", "m3", 3);
  s.node("f", lb, 6, "future", 4, `${days} days`);
  s.edge("b2", "f", 4, "dashed");
  return s.done(caption);
}

/** Work that may exist only on a laptop. Scene 12. */
export function unpushed(task: Task, personId: string, days: number, caption: string): GraphScene {
  const s = new Scene();
  const local = s.lane("local", "branch", personId, "not pushed");
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.node("m2", main, 3, "commit", 1);
  s.node("m3", main, 5, "commit", 1);
  s.edge("m0", "m1", 1);
  s.edge("m1", "m2", 1);
  s.edge("m2", "m3", 1);
  s.node("q", local, 3, "unknown", 2, `${days} days`);
  s.edge("m1", "q", 2, "dashed");
  s.node("f", main, 6, "future", 3, task.id);
  s.edge("m3", "f", 3, "dashed");
  s.edge("q", "f", 3, "dashed");
  return s.done(caption);
}

/** Someone changes a file the plan gives to someone else. Plan versus reality. */
export function outsidePlan(branch: string, editorId: string, file: string, ownerName: string, caption: string): GraphScene {
  const s = new Scene();
  const lb = s.lane(branch, "branch", editorId);
  const main = s.lane("main", "main");
  s.node("m0", main, 0, "commit", 1);
  s.node("m1", main, 1, "commit", 1);
  s.edge("m0", "m1", 1);
  s.node("b1", lb, 2, "commit", 2);
  s.edge("m1", "b1", 2);
  s.node("b2", lb, 3, "warning", 3, file);
  s.edge("b1", "b2", 3);
  s.node("r", main, 5, "future", 4, `${ownerName} reviews`);
  s.edge("m1", "r", 4);
  s.edge("b2", "r", 4, "dashed");
  return s.done(caption);
}
