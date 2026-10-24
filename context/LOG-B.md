# LOG-B: Laptop B (data and engine)

Only this owner edits this file. Newest entry on top.

## Done

### Landing: "15 risk rules" overview, dev badge off (2026-10-24)

- The first stat on the landing page is now a button (same look, hover
  underline). It opens a dialog listing the 15 rules (the 15 RiskKind values) in
  three groups: Work and reviews (4), Conflict radar (8), Stalled work and the
  plan (3), one plain line each, plus "See them on a live team" (/team/nexus).
  Closes with Escape, the close button or a click outside; focus goes to the
  close button and back to the stat. One column and scrolls inside on phones.
  Styles in landing.css under `ssl-rules*`.
- Removed the other two landing stats ("0% weight on commit count", "Built for
  student teams of up to 12") and their icons; "15 risk rules" is centred alone.
- `next.config.ts` (Laptop A's file): `devIndicators: false` hides the "N"
  badge during `npm run dev`. It never showed in production.
- Checked in the browser at 1440x900 and 375x812. Lint and build pass.

### Back buttons and Clear all on /plan (2026-10-24, on Aarya's laptop, Laptop A's area)

- New `src/components/BackButton.tsx`, shown once at the top of every page in
  the (shell) layout (/mentor, /team/[id], /connect, /plan, /dev/scenes). Not on
  /embed or the landing page. It keeps a trail of pages visited in this tab
  (sessionStorage `squadsync.trail`) and says where it goes ("Back to All teams").
  Opened directly, it goes to the parent: /team/* -> /mentor, others -> /.
  It never leaves the site. The landing page records "/" in the trail.
- `/plan` (PlanSplitter.tsx): new "Clear all" button (empties the PRD, team size
  back to 4, removes the plan and errors; greyed out when there is nothing to
  clear). The plan is no longer saved to localStorage, so a refresh starts
  empty; the old `squadsync.plan` entry is removed on load. An answer that
  arrives after Clear all is ignored.
- Checked in the browser: landing -> All teams -> Team Nexus, then Back twice
  returns to the landing page; direct opens fall back correctly; split, refresh
  (empty), split, Clear all (empty), Clear all during a split (late answer ignored).
  Lint and build pass.

### Fix: "member C" in the verdict sentence (2026-10-24, reported by Laptop A)

- With one medium risk the verdict reads "One thing to watch: <summary>" and
  `lowerFirst()` lowercased "Member C". Now it lowercases only an ordinary first
  word ("At", "A", "Three") and leaves "Member X", "PR #31", "GitHub" and
  numbers alone. Checked on the Nexus replay for 18 Sep. All checks, lint, build pass.

### Landing page at "/" (2026-10-24, on Aarya's laptop, agreed with Shruti)

Pages are Laptop A's area; built here at the team's request, Shruti agreed.
- New `src/app/page.tsx` + `src/components/landing/Landing.tsx` + `landing.css`:
  one-screen landing page from a given design (video background, liquid-metal
  nav pills, glass buttons, staggered entrance motion, phone menu with blur).
  All text and links are SquadSync's: nav Mentor view /mentor, Team view
  /team/nexus, Split a PRD /plan, Paste a repo /connect; buttons Open dashboard,
  See a live team, Analyse your repo. Stats are true facts (15 risk rules, 0%
  weight on commit count, teams up to 12).
- The mentor list moved from `/` to `/mentor` (`(shell)/page.tsx` ->
  `(shell)/mentor/page.tsx`). Links updated: TopBar Mentor tab, ConnectForm
  "Open the sample teams", TeamView "Back to all teams". The TopBar wordmark
  still links to `/` (now the landing page). docs/DEMO.md step 1 and README pages table updated.
- Deliberately outside DESIGN.md (gradients, glows, Inter and Instrument Serif,
  colours in the CSS file), for this one page only. Every class is prefixed
  `ssl-` and reset rules use `:where()`, so nothing reaches other pages; no html
  or body rules, no site favicon change. Fonts via next/font on this page only.
- Why plain CSS, not a CSS module: next.config.ts sends every `*.css` through
  `@tailwindcss/turbopack` as global CSS, so `.module.css` class names come back
  undefined. Also: the build drops a standard `backdrop-filter` written before
  its `-webkit-` version, so the `-webkit-` line must come first.
- Checked in the browser: 1440x900 one frame, no scroll, all 16 animated parts
  settle; 375x812 fits one screen, menu opens full width with blur, Escape
  closes it, labels and aria-expanded update. All 8 links go to the right
  pages; clicking into /mentor leaves the app's font, top bar and scrolling as before.
- The hero video is the URL from the given design (cloudfront). If it fails to
  load, the page stays black with all text readable.

### Fix: pasted forks showed "no activity" (2026-10-24)

- Found with the extension on samikshajadhav16/SheSolves3.0_Sahayog: a fork's
  created_at is the fork date (10 Oct), after all its copied commits (9 Oct),
  so the window "not before repo creation" held no commits.
- Now, with no projectStart, the window is the 56 days up to the latest commit
  on the default branch (one extra request; an empty repo is handled). Works
  for forks, imported repos and quiet repos.
- Tested: the fork (51 commits, 3 people), its original, a quiet solo repo, our
  repo (at_risk, 17 PRs), sindresorhus/ky.
- "Not flagged" is empty for a one-person repo (nothing to compare with).
- Message when a repo really has nothing: "This repo has no commits, pull
  requests or branches to analyse yet."
- All checks, lint and build pass.

### B8: task CSV wired into the GitHub route (2026-10-24, Aarya's laptop, branch `aarya-branch`)

- `POST /api/analyze/github` now uses `tasksCsv` (text of the CSV file). The
  board replaces GitHub issues as the tasks. Response adds `warnings: string[]`
  (one plain sentence each) only when there is something to say. 400 if
  tasksCsv is not a string or is over 500 KB.
- `src/lib/github/board.ts` wraps Samiksha's `parseTasksCsv` (csv.ts unchanged):
  - created date missing (csv.ts puts 1970) -> earliest real date, clamped to project dates.
  - in progress / in review -> `startedAt` = created (boards rarely export a start).
  - done dates up to 36 h ahead of now are a time zone gap (IST board, UTC
    server) and become now; later ones are dropped with a warning.
  - assignee not found by csv.ts -> `matchName()`: "Aarya Patil" -> `PatilAarya`
    when exactly one login fits (same name, login starts with a name part, or
    contains a part of 4+ letters). Otherwise unassigned and named in a warning.
  - max 500 tasks; PR task links from issues are cleared.
- AI task matching, two fixes found with real data:
  - a link to a PR by someone other than the task's assignee is dropped by code
    (the model had matched "Conflict radar and graph scenes" to Shruti's
    "Add GitGraph scenes" at 0.9).
  - the model now sees up to 8 code files per PR (no context/, docs/, .md), so
    vague titles like "Aarya branch" still match by files.
- Live, our repo + a 5-row CSV with real names: 5.5 s; names matched to all
  three logins; radar task -> PR #5, extension -> #4, metrics -> #12; PRD page
  task left unlinked (Shruti's PRs have vague titles); unknown name warned.
- `npx tsx src/lib/github/board.check.ts`: 19 checks pass. All other checks
  (engine, AI 15, plan 22, csv.ts, data gen), build and lint on our paths pass.
- Scenes 9 to 12 (add/add, lockfile, stale branch, unpushed work) were already
  built in B3, so B8 is complete.

### B7: PRD splitter and plan versus reality (2026-10-24, Aarya's laptop, branch `aarya-branch`)

- `POST /api/plan` body `{ prd, teamSize }` -> `ProjectPlan` (what Laptop A's
  `makePlan()` already calls). 400 with one sentence for a short PRD (under 20
  chars), over 20,000 chars, team size outside 2 to 8, or bad JSON.
- `POST /api/plan/check` body `{ plan, teamId }` or `{ plan, snapshot }`, optional
  `owners` (Person.id per slot; default slot i = team.people[i]) -> `Risk[]`.
- `src/engine/plan.ts`:
  - `planFrom(prd, teamSize, complete)`: Gemini proposes (20 s limit), code
    parses, validates, repairs once, validates again; else `templatePlan()`.
  - `validatePlan()`: the five rules of the /plan page (one owner per module,
    no folder twice, shared files single owner, merge order complete and
    dependencies first, everyone owns a module) plus: no folder inside another
    module's folder, no unknown dependency, no duplicate ids.
  - `repairPlan()`: wraps owners into range, drops unknown dependencies and
    overlapping folders, de-duplicates shared files, rebuilds the merge order
    (dependencies first), gives an idle person the busiest owner's last module.
    A dependency loop cannot be repaired, so it falls back to the template.
  - `templatePlan()`: deterministic, picks modules from words in the PRD (accounts,
    search, payments, notifications, maps, admin, media) plus API, screens, docs.
  - `checkPlan()`: open branches and PRs merged in the last 14 days against the
    ownership map. One risk per (person, module) or (person, shared file):
    "Member C edited Member A's folder", "Member C changed package-lock.json,
    owned by Member A". Medium if still open, low if merged. Kind is
    `task_code_mismatch` (the contract has no plan kind; closest fit).
    Evidence, action and a scene (`outsidePlan` in scenes.ts) on each.
- `npx tsx src/engine/check-plan.ts [--live]`: 22 checks. Every plan the API can
  return also passes Laptop A's `checkPlanShape()`. Live: Gemini split a
  marketplace PRD into 5 modules in 2.5 s, valid as is. Nexus plan check finds
  C in A's folder (routes.js), C on A's package-lock.json, B deleting
  apiClient.js in C's folder.
- Routes tested with `next start`. Build passes; lint passes on all Laptop B paths.

### B6: LLM wording and AI task matching (2026-10-24, Aarya's laptop, branch `aarya-branch`)

- `src/lib/llm.ts`: `complete(prompt, opts)` for Gemini (REST, `x-goog-api-key`).
  Env: `LLM_PROVIDER=gemini`, `LLM_API_KEY`, optional `LLM_MODEL` (default
  `gemini-flash-lite-latest`). Tested 24 Oct: gemini-2.5-flash is closed to new
  keys (404), full flash models answered 503 "high demand", flash-lite answers
  in about 2 s. 8 s timeout per attempt, one retry only on 429/5xx/network
  errors and only if time allows. Never throws: returns null, callers keep templates.
- `src/engine/ai.ts` (no network code, `complete` is passed in):
  - `wordRisks()`: one call for all risks, JSON answer. Code keeps a sentence
    only if it is one sentence, 20 to 220 chars, ends with a full stop, has no
    ! or ?, no emoji, every number in it appears in the risk's title, template
    or evidence, and every "Member X" in it appears in the evidence. Else the
    template stays. Accepted ones get `summarySource: "ai"`.
  - `aiTaskLinks()`: tasks (not todo) with no link and PRs with no task go to
    the model. Code keeps a link only if both ids exist, confidence is above
    0.6, and neither side is already used. Linked tasks get `linkSource: "ai"`
    and the confidence. Rules always run first.
  - `analyzeWithAi(snapshot, complete, { match, words })`.
- Routes: `GET /api/analyze/[teamId]` words today's view; replay (`?asOf=`)
  and `?ai=0` skip AI so the replay slider stays fast. `POST /api/analyze/github`
  does matching and wording. `/api/teams` uses no AI.
- `npx tsx src/engine/check-ai.ts`: 14 checks with a fake model (invented
  number rejected, two sentences rejected, unknown person rejected, broken JSON
  and no answer keep templates, bad links dropped, 0.6 not used). All pass.
- `npx tsx src/engine/try-ai.ts nexus`: live test with the key in .env.local.
  Live result: 12 of 12 accepted in 3.8 s; through the API route 11 of 12 in
  2.5 s (code rejected one and kept its template). Replay and `?ai=0`: no AI, 0.04 to 0.09 s.
- The prompt asks for plainer words for non-programmer mentors, with one
  example. An AI sentence that is 90% the same words as the template keeps the
  "template" tag, so the AI tag only marks real rewrites.
- Lint, build, engine checks pass. Without a key everything uses templates.

### B5: GitHub ingest (2026-10-24, Aarya's laptop, branch `aarya-branch`)

`POST /api/analyze/github` body `{ repo, deadline, projectStart? , tasksCsv? }`
returns `{ snapshot, analysis }`. `repo` takes `owner/name` or any github.com URL.
Files: `src/lib/github/client.ts` (fetch, errors, rate limits, pool),
`patch.ts` (diff hunks to changed line ranges), `ingest.ts` (repo to
RepoSnapshot), `try.ts` (terminal test: `npx tsx src/lib/github/try.ts owner/name 2026-11-01 [start] [--json]`).

Tested with the real token: our own repo (3 people, 23 requests, 2.4 s, at_risk:
all PRs merged without review), sindresorhus/ky, a missing repo (404 message),
next.js and pallets/click (422 too many contributors, stopped after the first
round of requests). Route tested with `next start`: 200 and every 400 case.
Lint, build and engine checks pass.

B5 decisions:
- What we read, all capped: default-branch commits since project start (3
  pages), the 30 most recently updated PRs with files, reviews and (if open)
  mergeable, up to 20 branches compared with main (ahead, behind, commits,
  files with patches), issues (2 pages). About 20 to 130 requests per paste.
- Project start: `projectStart` if given, else 56 days before the repo's latest
  commit (changed 24 Oct, see the fix below). asOf is now.
- People: every non-bot login with activity. More than 12 gives 422.
  Display names "Member A.." by first activity. Role "mixed" for everyone.
  Commits whose email is not linked to a GitHub user use the git author name.
- Direct pushes: commits on main's first-parent line, one parent, not committed
  by GitHub's merge button ("web-flow"), not a PR's merge commit. Files and
  stats fetched only for the 10 most recent in the last 14 days. Commits made in
  GitHub's web editor straight to main are missed (they look like web-flow).
- Line ranges: added lines, plus the new-file line where a deletion happened.
  Context lines in the patch are ignored. PRs over 100 files are cut at 100.
- mergeable: GitHub false or "dirty" -> conflicting, true -> clean, else unknown.
- Issues are tasks (id = issue number). closed -> done (not_planned skipped),
  open with an open linked PR or a "review" label -> in_review, label with
  progress/doing/wip -> in_progress, else todo. startedAt = issue creation.
  Linked to PRs by "#12" in the PR title or body.
- Engine changes: `branchMentions()` in link.ts also matches GitHub-style
  branch names for issue numbers ("12-fix-login", "feature/12-x", "issue-12").
  The unreviewed-PR rule now needs at least 3 merged PRs (one PR gave "100%").
- Nothing is cached or stored. maxDuration 60 s on the route.
- tasksCsv is accepted and ignored until B8 wires Samiksha's csv.ts.
- Response shape matches `ConnectResult` in Laptop A's data.ts: success is
  `{ snapshot, analysis }`, failure is `{ error }` with one plain sentence
  (plus `resetAt` on 429). GitHub's own error text goes to the server log only.

### B4: API routes (2026-10-24, Aarya's laptop, branch `aarya-branch`)

- `GET /api/teams` -> TeamListItem[] for nexus, atlas, orbit, zenith. Sorted
  worst verdict first, then most risks. About 0.15 s.
- `GET /api/analyze/[teamId]?asOf=` -> Analysis. asOf takes `YYYY-MM-DD` (end of
  that day, never past the data) or a full ISO time. About 0.06 s.
- Errors are JSON `{ "error": "..." }`: 404 unknown team, 400 for a bad date or
  a date outside project start to the snapshot's asOf, 500 if analysis throws.
- Tested against `next start`: all of the above return the right status.
  Replay: `?asOf=2026-10-10` gives nexus "slipping" with 2 risks.
- `npm run lint` and `npm run build` pass. Both routes are dynamic (no caching).

B4 decisions:
- Snapshots are imported as JSON through `data/snapshots/index.ts`
  (`SNAPSHOTS`, `getSnapshot`) instead of read with fs. Imported JSON is always
  bundled into the serverless function on Vercel; fs reads of data/ need extra
  file-tracing config. Still stateless: nothing is cached or written.
- Routes import the engine as `@/engine` and data by relative path.

### B3: conflict radar and scenes (2026-10-24, Aarya's laptop, branch `aarya-branch`)

New: `src/engine/radar.ts`, `src/engine/scenes.ts`. analyze() now merges rule
risks and radar risks, keeps one per id, adds scenes to the late-merge and
no-review risks, and sorts by severity then firstDetectableAt.
`npx tsx src/engine/check.ts`, `npm run lint` and `npm run build` all pass.

Radar rules (thresholds in `config.ts` under `radar`):
- same_line_overlap (likely, high): two open branches change ranges of one
  file that overlap or sit within 3 lines.
- same_file_overlap (possible, low): same file, ranges apart.
- pr_conflicting (certain, high): GitHub mergeable is "conflicting".
- modify_delete_conflict (likely, high), add_add_conflict (likely, high).
- lockfile_overlap (possible, low): action says regenerate, do not hand-merge.
- branch_drift: medium above 10 behind, high above 25.
- direct_push_to_main (medium): in the last 14 days while another branch was open.
- stale_branch: branch with an open task, no push for 5 days (low) or 8 (medium).
- unpushed_work (low, proxy): task in progress 5+ days with no branch or PR.
  Rule text says we cannot see laptops. Skipped for design and docs roles.
- firstDetectableAt: for overlaps, when the second branch first touched the file
  (from commit file lists); drift, when the 11th main commit landed; others,
  from the dates directly.

Scenes follow `src/mocks/scenes.ts` (branch lanes first, main last, step 1 up,
slots 0 to 10). Built from real data: branch names, owners (lane colour), line
ranges, file names, PR numbers, days. Scenes exist for every radar kind and
for `late_integration-share` and `review_gap-unreviewed`. Workload, deadline
and old-PR risks have no scene. Lane labels drop "feature/" when over 22 chars.

Risk ids are short and URL-safe: `same_line_overlap-routes-js-p1-p3`,
`branch_drift-nex-132-settings`, `pr_conflicting-13`, `direct_push_to_main-57a05f4`.

Nexus now: at_risk, 12 risks. High: apiClient.js modify/delete (B and C),
routes.js lines 60-75 (A and C), 58% late merges. Then the B2 mediums, direct
push, 14 behind, 3 unreviewed. Low: package-lock.json, email-receipts stale.
Atlas: on_track, 0 risks. Zenith adds PR #13 conflicting (certain), two
branches 11 behind, and "Push alerts" unpushed.

### B2: engine core (2026-10-23, Aarya's laptop, branch `aarya-branch`)

`npx tsx src/engine/cli.ts nexus [asOf]` prints the Analysis as JSON.
`npx tsx src/engine/check.ts` runs all assertions (all pass, about 2 s).
Files in `src/engine/`: config, util, normalize, link, baseline, indicators,
slice (sliceAsOf), risks (rules, verdict, notFlagged), index (analyze), cli, check.
`analyze(snapshot, { weights?, asOf? })` normalises, slices if asOf is given, and
returns the full Analysis. Exports also `buildSnapshot`, `normalize`, `sliceAsOf`.

Results today (asOf 2026-10-23):
- nexus: at_risk. High: 58% of code merged in last 3 days. Medium: Member C no
  reviews, Member A finished 46% of tasks, 5 days late projected, PR #31 open
  9 days, 3 PRs merged without review. Not flagged: Member D (3 finished design
  tasks), Member B (gives 37% of reviews). Replay on 10 Oct already shows slipping.
- atlas: on_track, no risks.
- orbit: at_risk. High: Member A carries 62% of the work. Medium: Member D 3% of
  the work, Member D no reviews.
- zenith: at_risk. High: 11 of 11 recent PRs unreviewed, 96% merged in last 3 days.

B2 decisions (thresholds all in `config.ts`, for docs/METRICS.md):
- Workload flag: combined share OR finished-task share above 1.6x even share.
  Reason: on Nexus the 15% docs-and-design part goes to the designer, which pulls
  Member A's combined share to 39%, just under 40%, though A finished 46% of tasks.
  High at 2x even.
- A part with fewer than 3 events across the team (one review in the whole
  project, say) is left out of the combined share and its weight goes to the
  others. Without this, Zenith's one review made its reviewer "carry 58%".
- Workload rules wait until the team has 6 finished tasks.
- Code share: merged lines without lockfiles and docs/design paths, capped at
  800 per PR. Docs/design share: finished tasks owned by a design/docs member, or
  whose PR only touches docs/design paths.
- Quick replies: first review within 24 h of the PR opening.
- Unreviewed share uses PRs merged in the last 14 days (all PRs if fewer than 5).
  Nexus: 3 of 10 recent = 30%, medium. Over all PRs it would be 14%, not flagged.
- Open PR older than 7 days or over 800 lines: one medium risk per PR.
- teamUsualRange = the flag band (0.4x to 1.6x even share), so chart and rule agree.
- Timeline week status: warning above 2x the median past week, danger above 3x.
- firstDetectableAt: walk back day by day on sliced snapshots while the same
  rule still holds.
- Risk ids are URL-safe: `workload_imbalance-p1`, `late_integration-pr-31`.
- All summaries are templates (summarySource "template"). AI wording is B6.
- AI link fallback hook: `AiMatcher` in link.ts, passed to normalize(); unused until B6.

### B1: synthetic data generator (2026-10-23, Aarya's laptop, branch `aarya-branch`)

`npx tsx data/gen/run.ts` writes `data/snapshots/{nexus,atlas,orbit,zenith}.json`,
validates each one, prints the planted-story checklist and exits 1 on any failure.
`npx tsx data/gen/validate.ts` re-checks the written files on their own.
Output is byte-identical on every run (mulberry32, fixed seeds per team).

Files: `data/gen/prng.ts`, `time.ts`, `builder.ts` (plans to RepoSnapshot),
`story.ts` (ship() = one merged PR with task and reviews), `validate.ts`,
`planted.ts` (story checks), `run.ts`, `teams/{nexus,atlas,orbit,zenith}.ts`.

Nexus planted story (all checked by run.ts):
- [x] 8 weeks from 2026-09-07, deadline 2026-11-01, asOf 2026-10-23T12:00Z
- [x] Member A finishes 46.2% of done tasks (12 of 26)
- [x] Member C gives zero reviews
- [x] 3 PRs merged with no review
- [x] 58.0% of merged lines (additions + deletions) land in the last 3 days
- [x] PR #31 (Member B, `feature/payments`) open 9 days, 1,240 lines
- [x] Open branches of A (`feature/search`, routes.js [56,75]) and C
      (`feature/NEX-131-notifications`, routes.js [60,82]) overlap on lines 60 to 75
- [x] PR #31 removes `src/lib/apiClient.js`, C's open branch modifies it
- [x] One direct push to main (2026-10-19, also touches routes.js 64 to 68)
- [x] `feature/NEX-132-settings` is 14 behind main; every other branch is 10 or fewer
- [x] Task "Email receipts" in progress, its branch has no push for 6.1 days
- [x] package-lock.json on two open branches (search, notifications)
- [x] Member D is design role, 2 commits, 3 finished design tasks (2 without any PR)
- Deadline: last 7 days pace projects about 4.7 days late (medium slip)

Other teams:
- atlas: healthy. Done tasks 25% each, every PR reviewed, 5% late share,
  largest PR 207 lines, no shared files on open branches, projects on time.
  Member D is a docs role.
- orbit: Member A finishes 65.2% of tasks; Member D (code role) 8.7%. On time.
- zenith: 96% of merged lines in the last 3 days, 1 merged PR reviewed,
  one open PR with mergeable "conflicting", long-lived branches. On time by pace.

## In progress

Nothing.

## Next

All B tasks (B1 to B8) are done. Next: the 05:30 integration and polish pass
with the team (merge, check the deployed URL, run the demo story twice), and
help Laptop A wire /plan/check and the AI tags if they want it.

## Needs from others

- Laptop A, /connect: the CSV the user picks should be sent as text in
  `tasksCsv`; show `warnings` from the answer under the result if present.

- Samiksha (C): `npm run lint` fails on main because of `src/app/embed/page.tsx`
  line 105, "Avoid calling setState() directly within an effect"
  (react-hooks/set-state-in-effect). Build and Vercel are not affected.
- Laptop A: `/plan` can show "Plan versus reality" by calling
  `POST /api/plan/check` with `{ plan, teamId }` (or `{ plan, snapshot }` for a
  pasted repo). It returns Risk[] with scenes, like the team page risks.

- Laptop A (Shruti): `package-lock.json` on main is out of sync with
  package.json (`npm ci` fails: @emnapi packages missing). Please run
  `npm install` on Laptop A and commit the lockfile. Vercel may hit the same error.
  Laptop B ran `npm install` locally and reverted the lockfile, so it is not in this commit.
- Laptop A: real scenes now come from `analyze()`. /dev/scenes and the team page
  can use `risk.scene` instead of `src/mocks/scenes.ts` when the API is wired.
- Shruti (Vercel owner): add `GITHUB_TOKEN` in Vercel project settings
  (Production and Preview). Aarya has the token.
- Shruti (Vercel owner): add `LLM_PROVIDER=gemini` and `LLM_API_KEY` in Vercel
  too. Without them the app still works and shows template sentences.
- Laptop A: risks with `summarySource: "ai"` should show the small "written by
  AI" tag (DESIGN.md), and tasks with `linkSource: "ai"` their confidence.
- Laptop A, /connect: call `POST /api/analyze/github` with `{ repo, deadline }`.
  Errors come back as `{ error }` (plus `resetAt` on 429), ready to show as is.
  A paste takes 2 to 10 s, so show a loading state.

## Decisions

- Merged PRs are squash merges: one commit on `main` with the PR's whole diff,
  message `<title> (#<n>)`. Branch commits stay on their branch. Count code from
  PRs, not by summing all commits, or merged code is counted twice.
- "Merged lines" = additions + deletions of merged PRs. Late share uses mergedAt
  at or after asOf minus 3 days.
- behindMain = main commits after the branch's createdAt (up to asOf).
  aheadOfMain = commits on the branch. validate.ts enforces both, so sliceAsOf can
  recompute them the same way.
- Task ids look like Jira keys, starting at 101 (`NEX-101`) so they never look
  like PR numbers. Links: branch name contains the key, PR title starts with the
  key, or the first commit message starts with it; "ai" links carry 0.62 to 0.88.
  Tasks in progress with no PR link to their branch by key (linkSource
  "branch-name", linkedPRs empty).
- PR numbers follow creation order with gaps (as if issues used them), so #31
  lands on the payments PR.
- Merged branches are deleted (GitHub default): `branches` only lists open ones.
  `main` is not in `branches`.
- No `points` on tasks (default 1), so task shares are plain counts.
- Fake logins are animal handles (kestrel-dev, heron-codes ...). No real people.

## Contract changes

None.
