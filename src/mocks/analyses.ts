import type { Analysis, GraphScene, Risk, TeamListItem } from "@/lib/types";
import { mockScenes } from "./scenes";
import nexus from "./analyses/nexus.json";
import atlas from "./analyses/atlas.json";
import orbit from "./analyses/orbit.json";
import zenith from "./analyses/zenith.json";

// Mock Analysis objects. The JSON files are real output of Aarya's engine (B2,
// `npx tsx src/engine/cli.ts <team>` on aarya-branch, 23 Oct). Until B3 lands,
// scenes and the three Nexus conflict risks below are added by hand here.

const scene = (id: string): GraphScene => mockScenes.find((s) => s.id === id)!.scene;

// Conflict risks the conflict radar (B3) will produce for Nexus. Hand-written for now.
const nexusConflicts: Risk[] = [
  {
    id: "same_line_overlap-routes",
    kind: "same_line_overlap",
    severity: "high",
    confidence: "likely",
    title: "Two branches edit routes.js lines 60 to 75",
    summary: "feature/auth and feature/api both change lines 60 to 75 of routes.js, so the second merge will conflict.",
    summarySource: "template",
    rule: "Likely when two open branches change overlapping line ranges in the same file. Possible when they only touch the same file.",
    evidence: [
      { label: "File", value: "src/routes.js", ref: { type: "file", id: "src/routes.js" } },
      { label: "feature/auth (Member A)", value: "lines 60 to 75", ref: { type: "branch", id: "feature/auth" } },
      { label: "feature/api (Member B)", value: "lines 62 to 70", ref: { type: "branch", id: "feature/api" } },
      { label: "Overlap", value: "9 lines" },
    ],
    people: ["p1", "p2"],
    action: "Member A merges first; Member B rebases on main before opening the PR.",
    scene: scene("same-line"),
    firstDetectableAt: "2026-10-19T12:00:00Z",
  },
  {
    id: "branch_drift-feature-report",
    kind: "branch_drift",
    severity: "medium",
    title: "feature/report is 14 commits behind main",
    summary: "feature/report has not taken changes from main for 14 commits, so its merge will pull them all in at once.",
    summarySource: "template",
    rule: "Medium when a branch is more than 10 commits behind main, high above 25.",
    evidence: [
      { label: "Behind main", value: "14 commits", ref: { type: "branch", id: "feature/report" } },
      { label: "Owner", value: "Member C" },
      { label: "Last push", value: "17 Oct" },
    ],
    people: ["p3"],
    action: "Member C merges main into feature/report today.",
    scene: scene("drift"),
    firstDetectableAt: "2026-10-16T12:00:00Z",
  },
  {
    id: "direct_push_to_main-1",
    kind: "direct_push_to_main",
    severity: "medium",
    confidence: "possible",
    title: "Commit pushed straight to main",
    summary: "A commit went to main without a PR while feature/cart was open on the same files.",
    summarySource: "template",
    rule: "Flagged when a commit lands on main without a PR while an open branch touches the same files.",
    evidence: [
      { label: "Commit", value: "a1f9c2e by Member A, 20 Oct", ref: { type: "commit", id: "a1f9c2e" } },
      { label: "Open branch on the same file", value: "feature/cart", ref: { type: "branch", id: "feature/cart" } },
      { label: "File", value: "src/cart.js" },
    ],
    people: ["p1"],
    action: "Protect main so changes go through a PR.",
    scene: scene("direct-push"),
    firstDetectableAt: "2026-10-20T12:00:00Z",
  },
];

// JSON imports type tuples as arrays, hence the cast through unknown below.
const SEVERITY_ORDER = { high: 0, medium: 1, low: 2 } as const;

/** Attach the matching mock scene to engine risks that have none yet. */
function withScenes(a: Analysis, extra: Risk[] = []): Analysis {
  const risks = [...a.risks, ...extra].map((r) => {
    if (r.scene) return r;
    if (r.id === "late_integration-share") return { ...r, scene: scene("late-merge") };
    if (r.id === "review_gap-unreviewed") return { ...r, scene: scene("no-review") };
    return r;
  });
  risks.sort((x, y) => SEVERITY_ORDER[x.severity] - SEVERITY_ORDER[y.severity]);
  return { ...a, risks };
}

export const mockAnalyses: Record<string, Analysis> = {
  nexus: withScenes(nexus as unknown as Analysis, nexusConflicts),
  atlas: withScenes(atlas as unknown as Analysis),
  orbit: withScenes(orbit as unknown as Analysis),
  zenith: withScenes(zenith as unknown as Analysis),
};

export const mockTeams: TeamListItem[] = Object.values(mockAnalyses).map((a) => ({
  id: a.teamId,
  name: a.team.name,
  verdict: a.verdict,
  verdictReason: a.verdictReason,
  riskCount: a.risks.length,
}));
