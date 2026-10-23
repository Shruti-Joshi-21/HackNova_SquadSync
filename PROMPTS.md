# PROMPTS.md: Phase 1, paste into Claude Code

Phase 1 is A1, A2 on Laptop A and B1, B2 on Laptop B. A3 and B3 are here too but run in Phase 2.
Each prompt is one task. Paste it into the Claude Code session on that laptop,
let it finish, run the commit commands it prints, then paste the next prompt.
Do not paste two prompts at once.

Shruti runs both laptops in Phase 1. Before the first prompt on each laptop,
make sure CLAUDE.md is in the repo root (copied by hand, gitignored).

---

## LAPTOP A

### A1: scaffold, tokens, shell, deploy (about 30 min)

```
You are Laptop A. Read CLAUDE.md, CONTEXT.md, DESIGN.md, ARCHITECTURE.md and
src/lib/types.ts first. You own only the paths listed for Laptop A in
ARCHITECTURE.md.

Task A1: scaffold the app and the shell.

1. Scaffold Next.js (TypeScript, App Router, src directory, Tailwind, ESLint,
   npm, alias @/*). The repo already has docs, context/ and src/lib/types.ts.
   If create-next-app refuses a non-empty folder, scaffold into a temp folder
   and copy the files in without overwriting anything that exists.
2. Install geist and @primer/octicons-react. Nothing else UI-related.
3. Create src/styles/tokens.css with the CSS variables from DESIGN.md exactly
   (dark theme default). Map them into Tailwind's theme so classes like
   bg-surface, border-border, text-muted, text-success work. No hex values
   anywhere outside tokens.css.
4. Set up Geist Sans and Geist Mono. Base 14px, line-height 1.5.
5. Build the app shell: 48px top bar with the text wordmark "SquadSync"
   (Geist Sans 600, no logo), a team switcher placeholder, and a Mentor / Team
   toggle. Content container max 1200px with 24px gutters.
6. Add empty placeholder pages: /, /team/[id], /connect, /plan, /embed,
   /dev/scenes. Each shows one plain line of text naming the page.
7. Do not add frame-denying headers anywhere (the extension will embed /embed).
8. Make sure npm run build passes and npm run lint passes.

Follow DESIGN.md strictly: no emojis, no gradients, no icon unless needed, no
card grids. Do not create mock data yet.

When done: append what you did to context/LOG-A.md, then print the exact git
commands and commit message (this task is allowed to push to main):
  git add -A
  git commit -m "Scaffold Next.js app with design tokens and app shell"
  git push origin main
  git checkout -b laptop-a
Do not run git push yourself.
```

### A2: GitGraph scene component (about 60 min)

```
You are Laptop A. Read CLAUDE.md, DESIGN.md (especially "The GitGraph scene"),
PROJECT.md ("Conflict scenes") and src/lib/types.ts (GraphScene, GraphNode,
GraphEdge, GraphLane, NodeState).

Task A2: build the signature visual.

1. src/components/GitGraph.tsx: draws a GraphScene as SVG.
   - Lanes are horizontal lines, main at the bottom, branch lanes stacked above.
     Lane label is a small mono pill with the branch name.
   - A node's x comes from its slot, y from its lane.
   - Edges are curved paths. A branch lane connects down to main with a curve.
   - Node states per DESIGN.md: commit (ring with dot), future (dashed ring),
     merge (success ring with a check), conflict (danger fill, danger ring, a
     cross), warning (warning ring), ghost (dashed ring with a cross), unknown
     (dashed ring with a question mark). Draw the check, cross and question
     mark as simple stroked paths, not imported icons.
   - Colours only from the CSS variables: main uses --g-main, a branch uses
     --g0..--g4 from its person's colorIndex (take colorIndex from a prop map),
     state colours use --success, --danger, --warning.
2. Animation: a step counter advances every 500ms. A node or edge shows when its
   step is <= the current step. Edges draw with stroke-dashoffset. A conflict node
   pulses once (scale 1, 1.15, 1 over 400ms), turns red, then the cross draws in.
   No looping. A "Replay" ghost button restarts. Under prefers-reduced-motion show
   the final frame with no motion.
3. Accessibility: role="img" with aria-label from the scene caption, and a
   visually hidden text description listing what happens in order.
4. The scene must fit 360px wide (side panel) and scale up to 700px.
5. src/mocks/scenes.ts: eight typed GraphScene mocks for scenes 1 to 8 in
   PROJECT.md (same-line edit, same file different lines, branch drift, direct
   push to main, PR already conflicting, modify versus delete, late big merge,
   merged without review). Export an array of { id, title, scene }.
6. /dev/scenes page: lists every scene with its title and caption, playing each
   when it scrolls into view.

Keep it plain and precise, like a diagram from GitHub's docs. No glow, no
gradients, no shadows. npm run build and lint must pass.

When done: append to context/LOG-A.md and print:
  git add src/components src/mocks src/app/dev context/LOG-A.md
  git commit -m "Add GitGraph scene component and scene gallery"
  git push origin laptop-a
Do not push yourself.
```

### A3: team page on mock data (about 75 min). PHASE 2: Shruti's first task at 22:30

```
You are Laptop A. Read CLAUDE.md, DESIGN.md (Dashboard panels, Components),
PROJECT.md and src/lib/types.ts (Analysis, Risk, ContributionShare,
ReviewMatrix, WeekSummary, Schedule).

Task A3: the team page, built entirely on a typed mock.

1. src/mocks/nexus.ts: a typed Analysis for "Team Nexus": team of 4 (Member A
   to D, D is design role), 8 weeks, asOf 2026-10-23, deadline 2026-11-01.
   Verdict "slipping". Include the planted story from TASKS.md: A holds 46% of
   finished tasks, C reviews nothing, 3 PRs merged without review, 58% of merged
   code in the last 3 days, PR #31 open 9 days at 1,240 lines, two open
   branches editing routes.js lines 60 to 75, a direct push to main, a branch
   14 commits behind. 5 to 6 Risk objects with rule, evidence, action and scenes
   from src/mocks/scenes.ts. notFlagged: D with the reason.
   Also export mock Analysis objects for 3 more teams (one healthy, one
   imbalanced, one last-minute integrator), shorter is fine.
2. /team/[id] page, reading from a single data function getAnalysis(id) in
   src/lib/data.ts that returns the mock for now (a flag will swap it for the API
   later). Layout from DESIGN.md:
   - header row (team, week x of y, days left)
   - verdict word (32px, coloured by verdict) with one sentence, beside a
     two-bar schedule: time used vs tasks done, gap labelled
   - three panels: who did the work (stacked bars for tasks, code, reviews, docs
     and design, with the even-share line and the team's usual band), who checked
     whose work (review matrix heatmap with row and column labels and numbers),
     when code landed (weekly bars with usual band, then open PRs by age)
   - risks list: severity tag, confidence tag for conflicts, title, one sentence
   - clicking a risk opens the evidence drawer from the right: rule, GitGraph
     scene, evidence list, action, and the "written by AI" tag when
     summarySource is "ai"
   - "Not flagged" list with the reason per person
3. Charts are plain SVG or divs drawn by you. No chart library. Label values
   directly. Flagged items also carry a text tag, never colour alone.
4. Anonymised labels from Person.displayName everywhere.
5. Good empty and loading states: one sentence and one action.

Obey DESIGN.md: no icons beside panel titles, no identical card grid, no
emojis, no gradients. npm run build and lint must pass.

When done: append to context/LOG-A.md and print:
  git add src/app src/components src/mocks src/lib/data.ts context/LOG-A.md
  git commit -m "Add team page with indicators, risk list and evidence drawer"
  git push origin laptop-a
Note: src/lib/data.ts is yours; src/lib/types.ts is frozen, do not edit it.
Do not push yourself.
```

---

## LAPTOP B

### B1: synthetic data (about 55 min)

```
You are Laptop B. Read CLAUDE.md, CONTEXT.md, PROJECT.md, ARCHITECTURE.md and
src/lib/types.ts. You own src/engine, src/lib/github, src/lib/llm.ts,
src/app/api, data/ and context/LOG-B.md only. The Next.js scaffold may not exist
yet: use plain TypeScript run with npx tsx, no package.json changes.

Task B1: a seeded generator that writes realistic synthetic snapshots.

1. data/gen/run.ts writes data/snapshots/{nexus,atlas,orbit,zenith}.json, each
   a valid RepoSnapshot (source "synthetic"). Use a seeded PRNG (mulberry32) so
   output is identical on every run.
2. Shape the data like GitHub API results: PRs with files (path, status,
   additions, deletions, changed line ranges), reviews, branches with
   aheadOfMain, behindMain, filesTouched and lastPushAt, tasks with links to PRs
   (mix linkSource: branch-name, pr-text, ai with confidences, none).
3. The planted story for nexus (all of it must be present, see TASKS.md):
   - 8 weeks from 2026-09-07, deadline 2026-11-01, asOf 2026-10-23.
   - 4 people: A, B, C (code) and D (design role, few commits, owns design tasks).
   - A finishes about 46% of tasks, C gives zero reviews, 3 PRs merged with no
     review, about 58% of merged lines land in the last 3 days, PR #31 open 9 days
     with 1,240 lines.
   - Two open branches (A and C) both edit routes.js lines 60 to 75.
   - One branch deletes a file another branch edits.
   - One direct push to main (directToMain) while a branch is open.
   - One branch 14 commits behind main.
   - One task in_progress with no push for 6 days.
   - Both package-lock.json touched on two open branches.
4. atlas: healthy (steady merges, reviews spread, small PRs). orbit: strong
   imbalance (one person about 65% of work). zenith: everything merged in the
   last days, almost no reviews.
5. data/gen/validate.ts checks referential integrity: every person id exists,
   dates are ordered (PR merged after created, review after PR created), PR
   additions equal the sum of its files, branches reference real owners, task
   links point to real PRs. Run it at the end of run.ts and fail loudly.
6. Names: the generator uses Person.displayName "Member A".."Member D" and fake
   github logins. No real people.

No dependencies. Make the output deterministic and diff-friendly (stable key
order, 2-space JSON).

When done: append to context/LOG-B.md (include the planted-story checklist,
ticked) and print:
  git add data context/LOG-B.md
  git commit -m "Add synthetic data generator and team snapshots"
  git push origin laptop-b
Do not push yourself.
```

### B2: analysis engine core (about 75 min)

```
You are Laptop B. Read CLAUDE.md, ARCHITECTURE.md (Engine, Default thresholds,
Evidence rules), PROJECT.md and src/lib/types.ts. Plain TypeScript, no framework
imports, run with npx tsx.

Task B2: the engine core, in src/engine/ (files listed in ARCHITECTURE.md).

1. config.ts: all thresholds and weights (tasks 0.30, code 0.25, reviews 0.20,
   docsDesign 0.15, quick replies 0.10). Nothing hard-coded elsewhere.
2. normalize.ts and link.ts: identity match (GitHub login to task assignee),
   task-to-PR links by branch name and "#id" in PR or commit text. Leave a clear
   hook for the AI fallback (B6 later). Return a normalised RepoSnapshot.
3. baseline.ts: per-team and per-role usual range (median and spread). A design
   or docs person is judged on their own work, not on code.
4. indicators.ts: ContributionShare for each person (composite from the
   weights, code share weighted by size, not commit count), ReviewMatrix
   (including mergedWithoutReview and median hours to first review), weekly
   timeline (WeekSummary with status), lateMergeShare (last 3 days),
   Schedule (days used and left, tasks done, projected finish from the last 7
   days of finished tasks, daysLate).
5. risks.ts: workload, review gap, late integration and deadline slip rules to
   Risk objects. Every Risk has: a plain rule that quotes the threshold, an
   evidence list of real values with refs, one action, a template summary
   (summarySource "template"), people, and firstDetectableAt.
6. A verdict: at_risk if any high; slipping if two mediums or a deadline slip;
   else on_track. verdictReason is one plain sentence naming the top cause.
7. notFlagged: people who look quiet but are fine, with the reason.
8. sliceAsOf(snapshot, asOfISO): returns the snapshot as it was on that date
   (filter commits, PRs, reviews and tasks by date, recompute ahead/behind from
   commits). It is approximate for open-branch file ranges; document that in a
   comment. analyze() must accept the sliced snapshot.
9. index.ts exports analyze(snapshot): Analysis (include the team object).
10. src/engine/cli.ts: npx tsx src/engine/cli.ts nexus [asOf] prints the
    Analysis as JSON. src/engine/check.ts asserts: nexus has a workload risk
    on Member A, a review gap on Member C, a late-integration risk, verdict
    slipping or at_risk, and Member D is in notFlagged and NOT flagged for
    workload; atlas has no high risks; orbit has a workload risk; zenith has a
    late-integration risk. Run it and fix until it passes.

Never compare people by commit count. Do not touch types.ts; if the contract is
missing something, write it under "Needs" in your log and work around it.

When done: append to context/LOG-B.md and print:
  git add src/engine context/LOG-B.md
  git commit -m "Add analysis engine with workload, review and integration indicators"
  git push origin laptop-b
Do not push yourself.
```

### B3: conflict radar and scenes (about 45 min). PHASE 2: Aarya's first task at 22:30

```
You are Laptop B. Read CLAUDE.md, PROJECT.md ("Conflict scenes",
"What can and cannot be detected"), ARCHITECTURE.md (Evidence rules) and
src/lib/types.ts (Risk, RiskKind, Confidence, GraphScene).

Task B3: the conflict radar. Files: src/engine/radar.ts, src/engine/scenes.ts,
and a small hook in src/engine/index.ts. Extend check.ts.

1. radar.ts reads open branches, open PRs and recent commits and produces Risk
   objects for conflict kinds:
   - same_file_overlap (confidence "possible"): the same file path on two open
     branches or PRs.
   - same_line_overlap ("likely"): overlapping changed line ranges in that file.
   - pr_conflicting ("certain"): PullRequest.mergeable is "conflicting".
   - modify_delete_conflict: one side modifies a path the other removes or
     renames.
   - add_add_conflict: both sides add the same new path.
   - lockfile_overlap: package-lock.json, yarn.lock or pnpm-lock.yaml on two
     branches; the action says to regenerate it after merging, not hand-merge.
   - branch_drift: behindMain above the threshold.
   - direct_push_to_main: commits with directToMain while another branch is open.
   - stale_branch and unpushed_work: no push for N days while a task is in
     progress (unpushed_work is a proxy; its rule text must say it cannot see
     local files).
   Never claim more than the data shows. Confidence levels exactly as above.
2. Each risk: rule (quotes the threshold), evidence (files, line ranges, who,
   branches, commits behind), one action, firstDetectableAt (when the second
   overlapping branch first touched the file), people.
3. scenes.ts builds a GraphScene per risk, following the scene catalogue: lanes
   for main and each involved branch, commit nodes at slots, the merge target
   node in state conflict or warning or merge, edges with danger or dashed
   states, increasing step numbers so the animation tells the story, and a
   one-line caption in plain words. Late-integration and merged-without-review
   risks from B2 also get scenes (scenes 7 and 8).
4. Wire radar and scenes into analyze() so risks are merged, de-duplicated and
   sorted by severity then firstDetectableAt.
5. Extend check.ts: nexus contains a likely same-line overlap on routes.js with
   a scene, a modify_delete_conflict, a lockfile_overlap, a direct_push_to_main,
   a branch_drift; atlas has none of the high-severity conflict kinds.

When done: append to context/LOG-B.md and print:
  git add src/engine context/LOG-B.md
  git commit -m "Add conflict radar and graph scenes"
  git push origin laptop-b
Do not push yourself.
```
