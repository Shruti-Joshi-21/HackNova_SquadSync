# TASKS.md: schedule, ownership, commit routine

Times are IST. Today is Friday 23 Oct 2026. Submission: Saturday 24 Oct, 8:00 AM.
Prompts to paste into Claude Code are in PROMPTS.md (Phase 1) and PROMPTS-PHASE2.md.

## The team

| Person | Tool | Role |
|--------|------|------|
| Shruti | Claude Code, two laptops | Starts 16:15, works until 18:30, back at 22:30. Phase 1: runs Laptop A (interface) and Laptop B (data and engine). Phase 2: Laptop A. Runs every push by hand and merges into `main` |
| Aarya | Claude Code | Back by 22:30. Phase 2: takes over Laptop B (finishes B2 if needed, then B3 to B8). Optional prep before 22:30, see below |
| Samiksha | Claude via Arena, copy and paste | Back by 22:30. Phase 2: C (extension, docs, deck text, embed page, CSV import). Can start the writing tasks earlier, see below |

Until 22:30 Shruti is the only one on the laptops and drives both. Rhythm: paste the next prompt into
one laptop, and while it works check the other laptop's output and run its
commit commands. Never paste two prompts into one laptop at once.

## Timeline at a glance

| When | Who | What |
|------|-----|------|
| 16:15 to 16:35 | Shruti | Step 0 setup, below |
| 16:35 to 18:15 | Shruti on Laptop A and Laptop B in parallel | Phase 1 (A1, A2, B1, B2) |
| 18:15 to 18:30 | Shruti | Wrap up: push branches, update logs, merge |
| Any time before 22:30 | Aarya, Samiksha | Optional prep, see "Before 22:30" |
| 18:30 to 22:30 | Nobody | Gap. Everything must already be pushed |
| 22:30 to 02:30 | Shruti (A), Aarya (B), Samiksha (C) in parallel | Phase 2 |
| 02:30 to 05:30 | Everyone | Sleep. Do not skip this |
| 05:30 to 07:00 | Everyone | Integrate, polish, deck, rehearse |
| 07:00 | Everyone | Code freeze. Only fixes after this |
| 07:15 | Shruti | Check the deployed URL, submit |
| 08:00 | | Hard deadline |

## Step 0: setup (Shruti, 16:15 to 16:35)

Do this on Laptop A first. Laptop B starts after A's push (about 5 minutes later).

On Laptop A:
1. On GitHub, create a repo named `squadsync` and tick "Add a README".
2. `git clone <repo-url>` then `cd squadsync`.
3. Unzip the kit into the repo root (it holds `src/lib/types.ts`, `context/`
   and the `.md` files). `docs/` and `extension/` are created later by C. CLAUDE.md
   must never go into git: add it to .gitignore first (next step).
4. Run:
   ```
   echo "CLAUDE.md" >> .gitignore
   echo ".env*" >> .gitignore
   git add -A
   git commit -m "Add project context, design system and data contract"
   git push origin main
   ```
   This and A1's scaffold are the only two direct pushes to `main`.
5. Create `.env.local` later when keys are ready (never commit it).
6. In Vercel, import the GitHub repo (do this after A1 pushes the scaffold).

On Laptop B (after A's push):
1. `git clone <repo-url>`, `cd squadsync`.
2. Copy `CLAUDE.md` from Laptop A by hand (message it to yourself). It is gitignored.
3. `git checkout -b laptop-b`.

Aarya and Samiksha, when they arrive at 22:30: clone the repo, copy CLAUDE.md
(ask Shruti for it, it is gitignored), then see Phase 2 for branch names.

## The commit routine (every task)

Claude Code never pushes. At the end of every task it prints these four things
and you run them yourself:

```
git status
git add <the paths this laptop owns>
git commit -m "<message>"
git push origin <your branch>
```

Then, on GitHub, open a pull request from your branch into `main`. Someone
other than the author reviews it (a short approving comment is fine), then
merge. Vercel redeploys `main`. Before the next task:
`git fetch && git rebase origin/main`.

Rules: one task per commit, plain messages in the imperative, no emojis,
never `git add -A` on A or B except for Step 0 and A1, never force push.

## Ownership (each path has one owner; see ARCHITECTURE.md for the full map)

- Laptop A (Shruti): `src/app/**` (except api), `src/components/**`, `src/mocks/**`,
  `src/styles/**`, `public/**`, `package.json` and configs, `context/LOG-A.md`.
- Laptop B (Shruti until 22:30, then Aarya): `src/engine/**`, `src/lib/github/**`, `src/lib/llm.ts`,
  `src/app/api/**`, `data/**`, `context/LOG-B.md`.
- C (Samiksha): `extension/**`, `docs/**`, `context/LOG-C.md`.
- Frozen: `src/lib/types.ts`. A change needs a "CONTRACT CHANGE" line in the
  author's log and the other laptop must pull before continuing.

Two path hand-offs for Phase 2: `src/app/embed/**` and `src/lib/github/csv.ts` are owned by
Samiksha (C). Everything else stays as listed.

If you need something in a path you do not own, write it in your log under
"Needs from A/B/C" and carry on with a mock.

## Phase 1 (16:35 to 18:15): two Claude Code laptops, 100 minutes

### Laptop A (Shruti): interface

| Task | Time | What | Done when |
|------|------|------|-----------|
| A1 | 16:35 to 17:05 | Scaffold Next.js, tokens, Geist, Octicons, app shell, empty routes, build passes | `npm run build` is green; Vercel shows the shell. Push to `main` |
| A2 | 17:05 to 18:15 | GitGraph SVG component, scene player, `/dev/scenes` page with 8 mock scenes | All 8 scenes animate; reduced-motion shows final frame |
| A3 | Phase 2 | Team page on mock data (first task at 22:30) | Page renders `src/mocks/nexus.ts` with no console errors |

Commit messages:
- A1: `Scaffold Next.js app with design tokens and app shell`
- A2: `Add GitGraph scene component and scene gallery`
- A3 (Phase 2): `Add team page with indicators, risk list and evidence drawer`

### Laptop B (Shruti in Phase 1): data and engine

| Task | Time | What | Done when |
|------|------|------|-----------|
| B1 | 16:40 to 17:30 | Seeded synthetic data generator, 4 team snapshots in `data/snapshots/` | `npx tsx data/gen/run.ts` writes 4 valid `RepoSnapshot` files |
| B2 | 17:30 to 18:15 | Engine core: normalise, indicators, baseline, risks, verdict, schedule | `npx tsx src/engine/cli.ts nexus` prints a valid `Analysis` with the planted risks |
| B3 | Phase 2 | Conflict radar and scenes 1 to 8, wired into `analyze()` (Aarya's first task, after finishing B2 if it is unfinished) | Nexus output contains a likely same-line conflict with a `scene` |

Commit messages:
- B1: `Add synthetic data generator and team snapshots`
- B2: `Add analysis engine with workload, review and integration indicators`
- B3 (Phase 2): `Add conflict radar and graph scenes`

The planted story in Nexus (B1 must include all of this so the demo works):
8-week project, start 2026-09-07, deadline 2026-11-01, "today" 2026-10-23.
4 members, one of them design-role with few commits who must NOT be flagged.
One member does about 46% of finished tasks; one member reviews nothing; 3 PRs
merged without review; about 58% of merged code lands in the last 3 days; one
PR open 9 days with 1,200+ lines; two open branches both edit `routes.js` lines
60 to 75; one branch deletes a file another edits; one direct push to main
while a branch is open; one branch 14 commits behind main; one task "in
progress" with no push for 6 days. The other three teams: one healthy, one
imbalanced, one last-minute integrator.

### The wrap-up at 18:15 (both laptops)

1. Finish or park the current task. Parking: commit what builds with a message
   starting `WIP:`.
2. Update your `context/LOG-*.md`: done, in progress, next, anything the other
   laptop needs, any decision made.
3. Run the commit routine, push your branch, open the pull request.
4. If it builds, merge to `main` (you can merge from the GitHub phone app).
5. Confirm the Vercel deployment of `main` is green.

## The gap (18:30 to 22:30)

Nobody is at a laptop. Nothing should be half-pushed. Anything unmerged waits
until 22:30. At 22:30 everyone starts the same way: `git fetch`, then a fresh branch
from main (`git checkout -b phase2-a origin/main` for Shruti, `phase2-b` for Aarya,
`phase2-c` for Samiksha), then read CONTEXT.md and all three logs.

## Phase 2 (22:30 to 02:30): three people

### Laptop A: Shruti (branch `phase2-a`), about 3h40

| Task | Min | What |
|------|-----|------|
| A3 | 75 | Team page on mock data: verdict, schedule bars, three panels, risks list, evidence drawer (prompt is in PROMPTS.md) |
| A4 | 30 | Mentor list `/` and connect page `/connect` (repo link, deadline, optional CSV) |
| A5 | 30 | Swap mocks for the API (single flag), loading and error states |
| A6 | 40 | Replay strip with draggable marker and "first warning" marker (calls `?asOf=`) |
| A7 | 45 | Plan page `/plan`: PRD textarea, team size, ownership map, shared-file rules |

Polish (A9) moves to the 05:30 block.

### Laptop B: Aarya (branch `phase2-b`), about 3h35

Start by reading the logs. If B2 is unfinished, finish it first.

| Task | Min | What |
|------|-----|------|
| B3 | 45 | Conflict radar and scenes 1 to 8 (prompt is in PROMPTS.md) |
| B4 | 20 | API routes `/api/teams`, `/api/analyze/[teamId]` |
| B5 | 60 | GitHub ingest: repo link to `RepoSnapshot` with rate-limit handling |
| B6 | 45 | LLM wrapper, summaries with template fallback, task-to-PR AI match fallback |
| B7 | 60 | `/api/plan`: PRD splitter and validation; `checkPlan` (plan versus reality) |
| B8 | 15 | Wire Samiksha's `csv.ts` into the GitHub route; scenes 9 to 12 only if time |

### C: Samiksha (branch `phase2-c`, copy-paste workflow, small isolated files), about 3h40

| Task | Min | What |
|------|-----|------|
| C1 | 30 | `docs/METRICS.md`: justification for every indicator (one block each) |
| C2 | 45 | `extension/`: manifest, background, side panel, repo detection, options page |
| C3 | 20 | `docs/README.md` (setup, env vars, how to run, how to load the extension) |
| C4 | 30 | Deck text for the given PPT template (outline below) |
| C5 | 20 | `docs/DEMO.md`: the 3 to 4 minute script and a backup plan if Wi-Fi or an API fails |
| C6 | 45 | `src/app/embed/**`: the narrow side-panel page (prompt in PROMPTS-PHASE2.md) |
| C7 | 30 | `src/lib/github/csv.ts`: task CSV import, a pure function (prompt in PROMPTS-PHASE2.md) |

Order for Samiksha: C2 first (the extension is required), then C6, C7, C1, C4, C3, C5.

### Before 22:30 (optional, nobody needs a laptop with the repo)

Aarya:
- Create a GitHub personal access token that can read repositories, and get an
  LLM API key. Keep both in a private note. They go into Vercel as `GITHUB_TOKEN`,
  `LLM_API_KEY` (and `LLM_PROVIDER`) and into `.env.local`. Never in git.
- Read CONTEXT.md, PROJECT.md, ARCHITECTURE.md and `src/lib/types.ts`.

Samiksha:
- C1, C4 and C5 only need Arena and the kit files. Draft them in Arena now and
  paste the files into `docs/` at 22:30. Share the PPT template with the team.

Deck outline: 1 Problem. 2 Why GitHub's own insights are not enough. 3 The idea:
Plan, Watch, Warn. 4 How it works (one diagram). 5 The indicators and why.
6 Evidence, picture, action (one risk walkthrough). 7 What is unique. 8 Where AI
is used and where it is not. 9 Tech and feasibility. 10 Limits and what is next.

## 02:30 to 05:30: sleep

No work. The 05:30 to 07:00 block is for integration and rehearsal, not new features.

## 05:30 to 07:00: integrate and rehearse

1. Merge all branches into `main`, check the Vercel deployment.
   Polish pass (task A9) with all three: keyboard use, focus rings, contrast, reduced
   motion, empty states, plain copy, 390px width. List the changes in your log.
2. Run the full demo story from PROJECT.md on the deployed URL, twice.
3. Fix only what breaks the demo. No new features.
4. Record a backup screen recording of the demo.
5. Load the extension in Edge, test on a real repo page.

## If you fall behind, cut in this order

1. Scene 13, scenes 9 to 12.
2. Light theme, polling refresh.
3. Replay polish (keep a plain slider).
4. CSV import.
5. Plan-versus-reality check (keep the PRD splitter).
Never cut: engine, dashboard, evidence drawer, scenes 1 to 8, mentor list,
extension, PRD splitter, deploy.
