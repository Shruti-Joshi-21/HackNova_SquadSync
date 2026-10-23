import type { GraphScene } from "@/lib/types";

// Mock GraphScenes for conflict scenes 1 to 8 in PROJECT.md.
// Used by /dev/scenes until the engine (B3) builds real ones.

/** Person.id to colorIndex, as the engine's Person.colorIndex would give. */
export const mockColors: Record<string, number> = { p1: 0, p2: 1, p3: 2, p4: 3 };

export interface MockScene {
  id: string;
  title: string;
  scene: GraphScene;
}

const sameLine: GraphScene = {
  lanes: [
    { id: "feature/auth", label: "feature/auth", kind: "branch", personId: "p1" },
    { id: "feature/api", label: "feature/api", kind: "branch", personId: "p2" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "a1", lane: "feature/auth", slot: 2, state: "commit", step: 2 },
    { id: "a2", lane: "feature/auth", slot: 3, state: "commit", label: "L60-75", step: 3 },
    { id: "b1", lane: "feature/api", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/api", slot: 4, state: "commit", label: "L62-70", step: 3 },
    { id: "m2", lane: "main", slot: 5, state: "merge", step: 4 },
    { id: "m3", lane: "main", slot: 6, state: "conflict", label: "routes.js", step: 5 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "a1", state: "normal", step: 2 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "a1", to: "a2", state: "normal", step: 3 },
    { from: "b1", to: "b2", state: "normal", step: 3 },
    { from: "m1", to: "m2", state: "normal", step: 4 },
    { from: "a2", to: "m2", state: "normal", step: 4 },
    { from: "m2", to: "m3", state: "normal", step: 5 },
    { from: "b2", to: "m3", state: "danger", step: 5 },
  ],
  steps: 5,
  caption: "Both branches change routes.js lines 60 to 75. The second merge will conflict.",
};

const sameFile: GraphScene = {
  lanes: [
    { id: "feature/auth", label: "feature/auth", kind: "branch", personId: "p1" },
    { id: "feature/api", label: "feature/api", kind: "branch", personId: "p2" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "a1", lane: "feature/auth", slot: 2, state: "commit", step: 2 },
    { id: "a2", lane: "feature/auth", slot: 3, state: "commit", label: "L12-20", step: 3 },
    { id: "b1", lane: "feature/api", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/api", slot: 4, state: "commit", label: "L140-152", step: 3 },
    { id: "m2", lane: "main", slot: 5, state: "merge", step: 4 },
    { id: "m3", lane: "main", slot: 6, state: "warning", label: "routes.js", step: 5 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "a1", state: "normal", step: 2 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "a1", to: "a2", state: "normal", step: 3 },
    { from: "b1", to: "b2", state: "normal", step: 3 },
    { from: "m1", to: "m2", state: "normal", step: 4 },
    { from: "a2", to: "m2", state: "normal", step: 4 },
    { from: "m2", to: "m3", state: "normal", step: 5 },
    { from: "b2", to: "m3", state: "normal", step: 5 },
  ],
  steps: 5,
  caption: "Both branches touch routes.js on different lines. Git can probably combine these.",
};

const drift: GraphScene = {
  lanes: [
    { id: "feature/report", label: "feature/report", kind: "branch", personId: "p3" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "b1", lane: "feature/report", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/report", slot: 3, state: "commit", step: 2 },
    { id: "m2", lane: "main", slot: 2, state: "commit", step: 3 },
    { id: "m3", lane: "main", slot: 3, state: "commit", step: 3 },
    { id: "m4", lane: "main", slot: 4, state: "commit", step: 3 },
    { id: "m5", lane: "main", slot: 5, state: "commit", step: 3 },
    { id: "m6", lane: "main", slot: 6, state: "commit", step: 3 },
    { id: "m7", lane: "main", slot: 7, state: "commit", step: 3 },
    { id: "m8", lane: "main", slot: 8, state: "warning", label: "14 behind", step: 4 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "b1", to: "b2", state: "normal", step: 2 },
    { from: "m1", to: "m2", state: "normal", step: 3 },
    { from: "m2", to: "m3", state: "normal", step: 3 },
    { from: "m3", to: "m4", state: "normal", step: 3 },
    { from: "m4", to: "m5", state: "normal", step: 3 },
    { from: "m5", to: "m6", state: "normal", step: 3 },
    { from: "m6", to: "m7", state: "normal", step: 3 },
    { from: "m7", to: "m8", state: "normal", step: 4 },
    { from: "b2", to: "m8", state: "dashed", step: 4 },
  ],
  steps: 4,
  caption: "feature/report is 14 commits behind main. A late merge pulls in all of them at once.",
};

const directPush: GraphScene = {
  lanes: [
    { id: "feature/cart", label: "feature/cart", kind: "branch", personId: "p3" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "b1", lane: "feature/cart", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/cart", slot: 4, state: "commit", step: 2 },
    { id: "m2", lane: "main", slot: 3, state: "warning", label: "no PR", step: 3 },
    { id: "m3", lane: "main", slot: 5, state: "conflict", label: "cart.js", step: 4 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "b1", to: "b2", state: "normal", step: 2 },
    { from: "m1", to: "m2", state: "normal", step: 3 },
    { from: "m2", to: "m3", state: "normal", step: 4 },
    { from: "b2", to: "m3", state: "danger", step: 4 },
  ],
  steps: 4,
  caption: "A commit went straight to main while feature/cart was open. The later merge conflicts.",
};

const prConflicting: GraphScene = {
  lanes: [
    { id: "feature/search", label: "feature/search", kind: "branch", personId: "p2" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "m2", lane: "main", slot: 3, state: "commit", step: 1 },
    { id: "m3", lane: "main", slot: 5, state: "conflict", label: "PR #27", step: 1 },
    { id: "b1", lane: "feature/search", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/search", slot: 4, state: "commit", step: 2 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "m2", state: "normal", step: 1 },
    { from: "m2", to: "m3", state: "normal", step: 1 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "b1", to: "b2", state: "normal", step: 2 },
    { from: "b2", to: "m3", state: "danger", step: 3 },
  ],
  steps: 3,
  caption: "GitHub already reports PR #27 as conflicting with main.",
};

const modifyDelete: GraphScene = {
  lanes: [
    { id: "feature/login", label: "feature/login", kind: "branch", personId: "p1" },
    { id: "cleanup", label: "cleanup", kind: "branch", personId: "p4" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "a1", lane: "feature/login", slot: 2, state: "commit", step: 2 },
    { id: "a2", lane: "feature/login", slot: 4, state: "commit", label: "edit auth.js", step: 2 },
    { id: "c1", lane: "cleanup", slot: 2, state: "commit", label: "rm auth.js", step: 2 },
    { id: "m2", lane: "main", slot: 3, state: "merge", step: 3 },
    { id: "m3", lane: "main", slot: 5, state: "conflict", label: "auth.js", step: 4 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "a1", state: "normal", step: 2 },
    { from: "a1", to: "a2", state: "normal", step: 2 },
    { from: "m1", to: "c1", state: "normal", step: 2 },
    { from: "m1", to: "m2", state: "normal", step: 3 },
    { from: "c1", to: "m2", state: "normal", step: 3 },
    { from: "m2", to: "m3", state: "normal", step: 4 },
    { from: "a2", to: "m3", state: "danger", step: 4 },
  ],
  steps: 4,
  caption: "One branch edits auth.js, another deletes it. Git cannot decide which to keep.",
};

const lateMerge: GraphScene = {
  lanes: [
    { id: "feature/ui", label: "feature/ui", kind: "branch", personId: "p1" },
    { id: "feature/data", label: "feature/data", kind: "branch", personId: "p2" },
    { id: "feature/pay", label: "feature/pay", kind: "branch", personId: "p3" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 4, state: "commit", step: 1 },
    { id: "u1", lane: "feature/ui", slot: 1, state: "commit", step: 2 },
    { id: "u2", lane: "feature/ui", slot: 3, state: "commit", step: 2 },
    { id: "d1", lane: "feature/data", slot: 1, state: "commit", step: 2 },
    { id: "d2", lane: "feature/data", slot: 4, state: "commit", step: 2 },
    { id: "p1", lane: "feature/pay", slot: 2, state: "commit", step: 2 },
    { id: "p2", lane: "feature/pay", slot: 5, state: "commit", step: 2 },
    { id: "m2", lane: "main", slot: 6, state: "warning", step: 3 },
    { id: "m3", lane: "main", slot: 7, state: "warning", step: 4 },
    { id: "m4", lane: "main", slot: 8, state: "conflict", label: "3 days left", step: 5 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m0", to: "u1", state: "normal", step: 2 },
    { from: "u1", to: "u2", state: "normal", step: 2 },
    { from: "m0", to: "d1", state: "normal", step: 2 },
    { from: "d1", to: "d2", state: "normal", step: 2 },
    { from: "m0", to: "p1", state: "normal", step: 2 },
    { from: "p1", to: "p2", state: "normal", step: 2 },
    { from: "m1", to: "m2", state: "normal", step: 3 },
    { from: "u2", to: "m2", state: "normal", step: 3 },
    { from: "m2", to: "m3", state: "normal", step: 4 },
    { from: "d2", to: "m3", state: "normal", step: 4 },
    { from: "m3", to: "m4", state: "normal", step: 5 },
    { from: "p2", to: "m4", state: "danger", step: 5 },
  ],
  steps: 5,
  caption: "58% of merged code landed in the last 3 days. That leaves no time to fix conflicts.",
};

const noReview: GraphScene = {
  lanes: [
    { id: "review", label: "no reviewer", kind: "branch" },
    { id: "feature/search", label: "feature/search", kind: "branch", personId: "p2" },
    { id: "main", label: "main", kind: "main" },
  ],
  nodes: [
    { id: "m0", lane: "main", slot: 0, state: "commit", step: 1 },
    { id: "m1", lane: "main", slot: 1, state: "commit", step: 1 },
    { id: "b1", lane: "feature/search", slot: 2, state: "commit", step: 2 },
    { id: "b2", lane: "feature/search", slot: 3, state: "commit", step: 2 },
    { id: "r1", lane: "review", slot: 4, state: "future", label: "review", step: 3 },
    { id: "m2", lane: "main", slot: 5, state: "warning", label: "PR #18", step: 4 },
  ],
  edges: [
    { from: "m0", to: "m1", state: "normal", step: 1 },
    { from: "m1", to: "b1", state: "normal", step: 2 },
    { from: "b1", to: "b2", state: "normal", step: 2 },
    { from: "b2", to: "r1", state: "dashed", step: 3 },
    { from: "r1", to: "m2", state: "dashed", step: 3 },
    { from: "m1", to: "m2", state: "normal", step: 4 },
    { from: "b2", to: "m2", state: "normal", step: 4 },
  ],
  steps: 4,
  caption: "PR #18 was merged with no review. Nobody else has read this code.",
};

export const mockScenes: MockScene[] = [
  { id: "same-line", title: "Same-line edit", scene: sameLine },
  { id: "same-file", title: "Same file, different lines", scene: sameFile },
  { id: "drift", title: "Branch drift", scene: drift },
  { id: "direct-push", title: "Direct push to main", scene: directPush },
  { id: "pr-conflicting", title: "PR already conflicting", scene: prConflicting },
  { id: "modify-delete", title: "Modify versus delete", scene: modifyDelete },
  { id: "late-merge", title: "Late big merge", scene: lateMerge },
  { id: "no-review", title: "Merged without review", scene: noReview },
];
