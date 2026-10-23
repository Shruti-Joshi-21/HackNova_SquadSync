/**
 * SquadSync data contract. FROZEN.
 *
 * Both laptops code against this file. Do not edit it casually.
 * To change it: one laptop edits, adds a "CONTRACT CHANGE" line to its
 * context/LOG-*.md, and the other laptop pulls before continuing.
 *
 * Rule of thumb: the engine decides what is true, the UI only draws it.
 */

export type ISODate = string; // e.g. "2026-10-20T14:30:00Z"

/* ------------------------------------------------------------------ */
/* 1. Input: one normalised snapshot of a team's repo and task board   */
/* ------------------------------------------------------------------ */

export type Role = "code" | "design" | "docs" | "mixed";

export interface Person {
  id: string; // stable internal id, e.g. "p1"
  displayName: string; // anonymised in the UI: "Member A"
  githubLogin: string;
  taskAssignee?: string; // name used on the task board, for identity matching
  role: Role;
  colorIndex: number; // 0..4, index into the graph palette in DESIGN.md
}

export interface Team {
  id: string; // "nexus"
  name: string; // "Team Nexus"
  projectStart: ISODate;
  deadline: ISODate; // entered by the user at setup
  people: Person[];
}

export interface FileChange {
  path: string;
  status: "added" | "modified" | "removed" | "renamed";
  previousPath?: string; // for renames
  /** Changed line ranges in the NEW file, inclusive: [[60, 75], [120, 128]] */
  ranges: [number, number][];
  additions: number;
  deletions: number;
}

export interface Commit {
  sha: string;
  author: string; // Person.id
  date: ISODate;
  message: string;
  branch: string;
  additions: number;
  deletions: number;
  files: string[];
  /** true when the commit landed on main without going through a PR */
  directToMain: boolean;
}

export interface Review {
  reviewer: string; // Person.id
  submittedAt: ISODate;
  state: "approved" | "changes_requested" | "commented";
}

export interface PullRequest {
  number: number;
  title: string;
  author: string; // Person.id
  branch: string;
  baseBranch: string;
  createdAt: ISODate;
  mergedAt: ISODate | null;
  closedAt: ISODate | null;
  state: "open" | "merged" | "closed";
  additions: number;
  deletions: number;
  files: FileChange[];
  reviews: Review[];
  /** from GitHub's mergeable state; "unknown" if not computed yet */
  mergeable: "clean" | "conflicting" | "unknown";
  taskIds: string[];
}

export interface Branch {
  name: string;
  owner: string; // Person.id
  createdAt: ISODate;
  lastPushAt: ISODate;
  aheadOfMain: number;
  behindMain: number;
  filesTouched: FileChange[]; // diff of branch against main
  hasOpenPR: boolean;
}

export type TaskStatus = "todo" | "in_progress" | "in_review" | "done";
export type LinkSource =
  | "branch-name"
  | "pr-text"
  | "commit-text"
  | "ai"
  | "manual"
  | "none";

export interface Task {
  id: string;
  title: string;
  assignee: string | null; // Person.id
  status: TaskStatus;
  createdAt: ISODate;
  startedAt?: ISODate;
  doneAt?: ISODate;
  dueAt?: ISODate;
  points?: number; // optional size, default 1
  linkedPRs: number[]; // PullRequest.number
  linkSource: LinkSource;
  linkConfidence: number; // 0..1, shown in the UI when source is "ai"
}

export interface RepoSnapshot {
  team: Team;
  asOf: ISODate; // "today" for the analysis; replay changes this
  source: "synthetic" | "github" | "csv";
  commits: Commit[];
  pullRequests: PullRequest[];
  branches: Branch[];
  tasks: Task[];
}

/* ------------------------------------------------------------------ */
/* 2. Output: what the engine produces and the UI draws                */
/* ------------------------------------------------------------------ */

export type Severity = "high" | "medium" | "low";
export type Confidence = "possible" | "likely" | "certain";
export type Verdict = "on_track" | "slipping" | "at_risk";

export type RiskKind =
  | "workload_imbalance"
  | "review_gap"
  | "late_integration"
  | "deadline_slip"
  | "same_file_overlap" // possible
  | "same_line_overlap" // likely
  | "pr_conflicting" // certain
  | "modify_delete_conflict"
  | "add_add_conflict"
  | "branch_drift"
  | "direct_push_to_main"
  | "stale_branch"
  | "lockfile_overlap"
  | "unpushed_work" // proxy only, see PROJECT.md
  | "task_code_mismatch";

export interface EvidenceRef {
  type: "pr" | "commit" | "branch" | "task" | "file" | "person";
  id: string;
  url?: string;
}

export interface EvidenceItem {
  label: string; // "PR #31 open for"
  value: string; // "9 days"
  ref?: EvidenceRef;
}

/* --- node and edge scenes, drawn by <GitGraph /> --- */

export type NodeState =
  | "commit" // ring with dot
  | "future" // dashed ring, work not done yet
  | "merge" // successful merge point
  | "conflict" // red, with a cross
  | "warning" // amber
  | "ghost" // dashed, e.g. orphaned after a force push
  | "unknown"; // dashed with "?", e.g. work that may exist only on a laptop

export interface GraphLane {
  id: string; // "main" or the branch name
  label: string; // pill label on the lane
  kind: "main" | "branch";
  personId?: string; // colours the branch lane
}

export interface GraphNode {
  id: string;
  lane: string; // GraphLane.id
  slot: number; // horizontal position, 0, 1, 2 ...
  state: NodeState;
  label?: string; // short, e.g. "A1F9C2E" or "routes.js"
  step: number; // animation step at which this node appears
}

export interface GraphEdge {
  from: string; // GraphNode.id
  to: string;
  state: "normal" | "danger" | "dashed";
  step: number;
}

export interface GraphScene {
  lanes: GraphLane[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  steps: number; // total animation steps
  caption: string; // one short line under the scene
}

/* --- risks --- */

export interface Risk {
  id: string;
  kind: RiskKind;
  severity: Severity;
  confidence?: Confidence; // only for conflict kinds
  title: string; // short headline, 8 words max
  summary: string; // one plain sentence
  summarySource: "template" | "ai"; // the UI shows a tag when "ai"
  rule: string; // "Why we flagged this", plain language, includes the threshold
  evidence: EvidenceItem[];
  people: string[]; // Person.id
  action: string; // one next step
  scene?: GraphScene; // the node and edge picture for this risk
  firstDetectableAt: ISODate; // powers the replay "first warning" marker
}

/* --- indicators the dashboard draws --- */

export interface ContributionShare {
  personId: string;
  tasks: number; // share 0..1 of finished tasks
  code: number; // share 0..1 of merged lines, size-weighted
  reviews: number; // share 0..1 of reviews given
  docsDesign: number; // share 0..1
  composite: number; // weighted, see ARCHITECTURE.md weights
  teamUsualRange: [number, number]; // shaded band on the chart
  role: Role;
  flagged: boolean;
}

export interface ReviewMatrix {
  /** matrix[reviewerId][authorId] = number of reviews */
  matrix: Record<string, Record<string, number>>;
  mergedWithoutReview: number[]; // PR numbers
  medianHoursToFirstReview: number | null;
}

export interface WeekSummary {
  weekIndex: number; // 0-based from projectStart
  label: string; // "W3"
  mergedLines: number;
  mergedPRs: number;
  status: "ok" | "warning" | "danger" | "future";
}

export interface Schedule {
  daysTotal: number;
  daysUsed: number;
  daysLeft: number;
  tasksTotal: number;
  tasksDone: number;
  projectedFinish: ISODate | null; // from last 7 days pace
  daysLate: number; // 0 if on time
}

export interface NotFlagged {
  personId: string;
  reason: string; // "Fewer commits, but owns the design tasks"
}

export interface Analysis {
  teamId: string;
  team: Team; // people, names, deadline: the UI needs these to label charts
  asOf: ISODate;
  verdict: Verdict;
  verdictReason: string; // one plain sentence
  schedule: Schedule;
  shares: ContributionShare[];
  reviews: ReviewMatrix;
  timeline: WeekSummary[];
  /** share of merged lines that landed in the last 3 days, 0..1 */
  lateMergeShare: number;
  risks: Risk[]; // sorted by severity, then by firstDetectableAt
  notFlagged: NotFlagged[];
}

/* ------------------------------------------------------------------ */
/* 3. PRD splitter (the "Plan" half of Plan, Watch, Warn)              */
/* ------------------------------------------------------------------ */

export interface PlanModule {
  id: string;
  name: string; // "Authentication"
  ownerSlot: number; // 0..teamSize-1, mapped to a Person later
  folders: string[]; // "src/auth/**"
  tasks: string[];
  dependsOn: string[]; // PlanModule.id, what must exist first
}

export interface SharedFileRule {
  path: string; // "package.json", "src/routes.js"
  ownerSlot: number; // the single person allowed to edit it
  rule: string; // "Others request changes through a PR comment"
}

export interface PlanInterface {
  between: [string, string]; // PlanModule.id pair
  agreeFirst: string; // "Shape of the user object"
}

export interface ProjectPlan {
  teamSize: number;
  modules: PlanModule[];
  sharedFiles: SharedFileRule[];
  interfaces: PlanInterface[];
  mergeOrder: string[]; // PlanModule.id in the order to merge
  source: "ai" | "template";
}

/* ------------------------------------------------------------------ */
/* 4. API shapes                                                       */
/* ------------------------------------------------------------------ */

export interface TeamListItem {
  id: string;
  name: string;
  verdict: Verdict;
  verdictReason: string;
  riskCount: number;
}

// GET  /api/teams                    -> TeamListItem[]
// GET  /api/analyze/[teamId]?asOf=   -> Analysis        (synthetic teams)
// POST /api/analyze/github           -> { snapshot: RepoSnapshot, analysis: Analysis }
//        body: { repo: "owner/name", deadline: ISODate, tasksCsv?: string }
// POST /api/plan                     -> ProjectPlan
//        body: { prd: string, teamSize: number }
