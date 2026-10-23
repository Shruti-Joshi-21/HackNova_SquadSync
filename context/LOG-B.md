# LOG-B: Laptop B (data and engine)

Only this owner edits this file. Newest entry on top.

## Done

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

B5: GitHub ingest (`POST /api/analyze/github`). Needs `GITHUB_TOKEN` in
`.env.local` on this laptop and in Vercel.

## Needs from others

- Laptop A (Shruti): `package-lock.json` on main is out of sync with
  package.json (`npm ci` fails: @emnapi packages missing). Please run
  `npm install` on Laptop A and commit the lockfile. Vercel may hit the same error.
  Laptop B ran `npm install` locally and reverted the lockfile, so it is not in this commit.
- Laptop A: real scenes now come from `analyze()`. /dev/scenes and the team page
  can use `risk.scene` instead of `src/mocks/scenes.ts` when the API is wired.

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
