# PROJECT.md: SquadSync product brief

## What this is

Hackathon: Hacknova'26, sponsored by MyStartupWave (Wave, Bengaluru).
Problem statement: PS-3 "SquadSync, Spotting Workload Imbalance and Integration
Risk from Git and Task Data".
Deadline: Saturday 8:00 AM IST (submission). Team of 3.
Judges are mostly sponsors and founders, so the demo must be understood in
seconds by non-technical people, and must also hold up for engineers.

SquadSync reads a team's Git activity and task board, finds collaboration
risks early, and shows each one as a short sentence, evidence, and a picture
of what will go wrong. Its main promise: stop merge problems before they happen.

## What the problem statement requires (all must ship)

1. Data ingestion and normalisation: Git and task data in one consistent format.
2. Workload analysis.
3. Review participation analysis.
4. Integration risk analysis.
5. Collaboration indicators beyond commit counts.
6. Risk detection.
7. Evidence-based insights: a short explanation for every risk.
8. Collaboration dashboard.
9. Mentor view and team view with actionable insights.

Deliverables: working prototype, dashboard, analysis component, source code
and documentation, a demo, and a short justification of the metrics
(`docs/METRICS.md`).

Constraints that decide design:
- Do not judge contribution by commit count alone.
- Every indicator needs a justification.
- Separate real risks from normal differences (the "Not flagged" list).
- Show only team-level information that is needed. Anonymise names in the UI
  ("Member A").
- Use the provided synthetic or anonymised data. The dataset was not found in
  the PDF's resources, so we generate our own synthetic data in the same shape
  as the GitHub API. Ask the organisers whether a dataset exists.

## Users

- Mentor, teaching assistant, faculty: supervises many teams. Wants one ranked
  list and one sentence each.
- Team member: one repo. Wants what to do this week.
Same engine, same data, two views. (We do not use the word "founder" in the UI.
It is only a pitch line for Wave: "a founder can read the verdict in 10 seconds.")

## What GitHub already shows, so we do not repeat it

GitHub Insights shows commits over time, commits per person, lines added and
removed, code frequency, network graph. We do not rebuild these. We cut raw
commit counts and raw line counts from the UI. We show only what GitHub does
not: a verdict with a reason, review gaps, tasks matched to code, conflicts
before they happen, a plan against reality, and replay.

## The idea: Plan, Watch, Warn

1. Plan: paste a PRD, choose team size. AI proposes modules, one owner and
   folder per person, one owner per shared file, interfaces to agree first,
   and a merge order. The code checks the plan (no folder owned twice, every
   module owned). We never promise zero conflicts. A good split reduces them.
2. Watch: read branches, changed files, line ranges, pushes, PRs, tasks.
3. Warn: before a conflict happens, show who, where, how sure, and what to do.

## Our extras (what other teams will not have)

1. Conflict radar with node-and-edge scenes (below).
2. PRD splitter and plan-versus-reality check ("C edited A's folder").
3. Replay: drag back in time, see the week the first warning was possible.
4. Single points of failure: parts of the code only one person has touched.
5. Fair for every role: docs and design count, so quiet is not flagged.
6. Side-panel browser extension beside the GitHub repo.
7. Every flag is evidence-backed and visual: rule, picture, evidence, action.

## Fair contribution (starting weights, tune later)

Finished tasks 30%, merged code weighted by size 25%, reviews given 20%,
docs and design 15%, quick replies 10%. Commit count 0%.
Role-aware: compare each person with their own team and role, never with a
fixed number. Show the team's usual range as a shaded band.

## What can and cannot be detected (be honest in the pitch)

- A server reads GitHub data. It cannot see anyone's laptop.
- Unsaved or uncommitted files never leave the laptop. We cannot catch them.
  The proxy: a task is "in progress" with no push for N days, shown as an
  "unknown" node with a question mark. A real fix needs a local tool, such as a
  git hook or editor extension. Say so plainly and list it as future work.
- Conflicts are predicted from changed files and line ranges. "Possible" means
  same file, "Likely" means overlapping lines, "Certain" means GitHub already
  says the PR conflicts. Never claim more than the data shows.

## Conflict scenes (the catalogue)

Each risk can carry a `GraphScene` (see `src/lib/types.ts`). The engine
(Laptop B) builds the scenes. The UI (Laptop A) draws them. Source says how we
know. Priority: M = must have, S = should, X = stretch.

| # | Scene | What the picture shows | Source | Pri |
|---|-------|------------------------|--------|-----|
| 1 | Same-line edit | Two branches off main both edit lines 60 to 75 of one file; the merge node turns red with a cross | PR/branch file ranges | M |
| 2 | Same file, different lines | Two branches touch one file, amber merge node, "Git can probably combine these" | file ranges | M |
| 3 | Branch drift | A branch far behind main, a long dashed gap of missed commits, amber | behindMain | M |
| 4 | Direct push to main | Main moves forward with no PR while a branch is open; the later merge node turns red | commits with directToMain | M |
| 5 | PR already conflicting | The PR's merge node is red from the start | PR.mergeable | M |
| 6 | Modify versus delete | One branch edits a file, another deletes or renames it; red node | file status removed or renamed | M |
| 7 | Late big merge | Many ring nodes pile into main in the last days; amber to red | merge dates and sizes | M |
| 8 | Merged without review | A merge node on main with a dashed "no reviewer" lane | PR.reviews empty | M |
| 9 | Add versus add | Two branches both add the same new path; red node | file status added on both | S |
| 10 | Lockfile overlap | Both branches edit package-lock.json; amber with a hint ("regenerate, do not hand-merge") | filename | S |
| 11 | Stale branch | A branch lane that stops, a dashed future that never arrives | lastPushAt | S |
| 12 | Unpushed work | A dashed "?" node: task in progress, no push for days | proxy only | S |
| 13 | History rewrite | A branch ref jumps, old commits become ghost nodes with crosses | only if data has it (synthetic yes; live best effort) | X |

## Demo story (3 to 4 minutes)

1. Open the mentor list: three teams ranked. One says "Slipping".
2. Open Team Nexus. Verdict, schedule gap, three panels. Say one sentence.
3. Click the top risk. The GitGraph scene plays: two branches, one red node.
   Evidence drawer: files, lines, who, how sure, what to do.
4. Show "Not flagged": the designer with few commits is fine.
5. Drag the replay marker back: "the first warning was possible three weeks ago".
6. Paste a PRD, pick team size, show the plan: owners, folders, shared files.
7. Paste a real repo link: same engine, live data.
8. Open the extension beside the GitHub repo.

## Metrics justification

Lives in `docs/METRICS.md` (written by the Arena teammate). One line per
indicator: what it measures, why it matters, how it is computed, its threshold,
and why a normal difference is not flagged.

## Scope guard

Must: contract and data, engine, dashboard, evidence drawer, conflict scenes
1 to 8, mentor list, deploy, extension, PRD splitter.
Next: scenes 9 to 12, GitHub paste-link, CSV tasks, plan-versus-reality, replay.
Cut first, in order: scene 13, light theme, polling refresh, replay polish.
