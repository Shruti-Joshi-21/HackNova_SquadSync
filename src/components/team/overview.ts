import type { Analysis, GraphEdge, GraphLane, GraphNode, GraphScene, NodeState, Risk, RiskKind, Severity } from "@/lib/types";

// The hero's overview picture, built only from the risks' own scenes: one lane
// per branch that any risk involves, ending in that branch's worst problem,
// all flowing into main at the deadline. Each risk keeps its own detailed scene.

const MAX_BRANCHES = 5;

const SHORT: Record<RiskKind, string> = {
  workload_imbalance: "one person carries most",
  review_gap: "no review",
  late_integration: "merged late",
  deadline_slip: "behind pace",
  same_file_overlap: "same file",
  same_line_overlap: "same lines",
  pr_conflicting: "conflict",
  modify_delete_conflict: "file deleted",
  add_add_conflict: "same new file",
  branch_drift: "behind main",
  direct_push_to_main: "no PR",
  stale_branch: "no pushes",
  lockfile_overlap: "lockfile",
  unpushed_work: "not pushed",
  task_code_mismatch: "off plan",
};

const STATE: Record<Severity, NodeState> = { high: "conflict", medium: "warning", low: "commit" };
const RANK: Record<Severity, number> = { high: 0, medium: 1, low: 2 };

export function overviewScene(a: Analysis): { scene: GraphScene; branches: number } | null {
  // Worst risk per branch. Risks are sorted most serious first, so the first one wins.
  const byBranch = new Map<string, { lane: GraphLane; risk: Risk }>();
  for (const r of a.risks) {
    for (const lane of r.scene?.lanes ?? []) {
      if (lane.kind === "branch" && !byBranch.has(lane.id)) byBranch.set(lane.id, { lane, risk: r });
    }
  }
  if (byBranch.size === 0) return null;

  const rows = [...byBranch.values()]
    .sort((x, y) => RANK[x.risk.severity] - RANK[y.risk.severity])
    .slice(0, MAX_BRANCHES);

  const lanes: GraphLane[] = [...rows.map((r) => r.lane), { id: "main", label: "main", kind: "main" }];
  const nodes: GraphNode[] = [{ id: "m0", lane: "main", slot: 0, state: "commit", step: 1 }];
  const edges: GraphEdge[] = [];

  const pushed = a.risks.find((r) => r.kind === "direct_push_to_main");
  if (pushed) {
    nodes.push({ id: "mp", lane: "main", slot: 3, state: STATE[pushed.severity], label: SHORT.direct_push_to_main, step: 3 });
    edges.push({ from: "m0", to: "mp", state: "normal", step: 3 });
  }

  const end: NodeState = a.verdict === "at_risk" ? "conflict" : a.verdict === "slipping" ? "warning" : "merge";
  nodes.push({ id: "end", lane: "main", slot: 6, state: end, label: `${a.schedule.daysLeft} days left`, step: 4 });
  edges.push({ from: pushed ? "mp" : "m0", to: "end", state: "normal", step: 4 });

  rows.forEach(({ lane, risk }, i) => {
    const first = `b${i}a`;
    const tip = `b${i}b`;
    nodes.push({ id: first, lane: lane.id, slot: 1, state: "commit", step: 2 });
    nodes.push({ id: tip, lane: lane.id, slot: 4, state: STATE[risk.severity], label: SHORT[risk.kind], step: 3 });
    edges.push({ from: "m0", to: first, state: "normal", step: 2 });
    edges.push({ from: first, to: tip, state: "normal", step: 2 });
    edges.push({ from: tip, to: "end", state: risk.severity === "high" ? "danger" : "dashed", step: 4 });
  });

  return {
    branches: rows.length,
    scene: {
      lanes,
      nodes,
      edges,
      steps: 4,
      caption: "Every branch with a risk, and its worst problem, on the way to the deadline.",
    },
  };
}
