# ARCHITECTURE.md

## Stack (decided, do not relitigate)

- Next.js (App Router) + TypeScript, deployed on Vercel from the first hour.
- Tailwind with theme colours mapped to the CSS variables in DESIGN.md.
- `geist` (fonts) and `@primer/octicons-react` (icons). No other UI libraries.
- Charts and graph scenes: hand-written SVG components. No chart library.
- Tests: plain `npx tsx` scripts and a few asserts. No heavy test setup.
- Extension: Chromium Manifest V3 with a side panel. Works in Edge and Chrome.
  The team uses Edge. Loaded unpacked for the demo, no store publishing.

## Storage: no database, "virtual storage" (decision)

Yes, go without an external database. How to do it safely on Vercel:

- Synthetic teams: static JSON files in `data/snapshots/`, committed to the
  repo, read-only. Always works.
- Analysis: computed on demand by pure functions. Nothing is saved.
- Pasted GitHub repos: fetched on demand, analysed on the fly. The client keeps
  the result in browser memory and `localStorage` (so a refresh does not lose it).
- PRD plan: lives in the browser (`localStorage`), also passed to the engine
  when checking plan versus reality.
- Extension: `chrome.storage.local` for the last repo and settings.
- Do NOT rely on in-memory variables or writing files on the server. Serverless
  functions forget everything between requests and the filesystem is read-only.
  Design every API route as stateless.
- "Live refresh" means: the client re-calls the API on a button press or every
  60 seconds. The API re-pulls from GitHub and recomputes.
- Secrets: `GITHUB_TOKEN` and the LLM key live only in Vercel environment
  variables and a local `.env.local`. Never commit them. Never send them to the browser.

## Folder map and who owns what

The rule that prevents merge conflicts: every path has exactly one owner.
Nobody edits a path they do not own. If you need a change in someone else's
path, write it in your log and ask.

```
squadsync/
  CLAUDE.md                   gitignored, copied by hand to each laptop
  CONTEXT.md                  owner: Shruti (rarely edited)
  PROJECT.md DESIGN.md ARCHITECTURE.md TASKS.md PROMPTS*.md   owner: Shruti
  context/LOG-A.md            owner: Laptop A only
  context/LOG-B.md            owner: Laptop B only
  context/LOG-C.md            owner: C (Samiksha) only
  docs/                       owner: C  (METRICS.md, README, demo script, PPT text)
  extension/                  owner: C  (manifest, side panel, content script)
  data/snapshots/             owner: B  (generated JSON)
  data/gen/                   owner: B  (synthetic generator)
  src/lib/types.ts            FROZEN contract, see header in the file
  src/lib/llm.ts              owner: B  (LLM call, template fallback)
  src/lib/github/             owner: B  (GitHub API client; csv.ts is owned by C)
  src/engine/                 owner: B  (normalise, indicators, risks, scenes, plan check)
  src/app/api/                owner: B  (all API routes)
  src/app/embed/**            owner: C  (side-panel page, from 22:30)
  src/lib/github/csv.ts       owner: C  (CSV task import, from 22:30)
  src/app/** (except api, embed)   owner: A  (pages, layouts)
  src/components/             owner: A
  src/lib/data.ts             owner: A  (getAnalysis, connectRepo: mock or API behind one flag)
  src/mocks/                  owner: A  (typed mock Analysis objects until the API is live)
  src/styles/                 owner: A  (tokens.css)
  public/                     owner: A
  package.json, configs       owner: A  (B asks A, or adds a line in LOG-B.md)
```

Laptop A = interface (Shruti). Laptop B = data and engine (Shruti in Phase 1, Aarya from 22:30).
C = extension, docs, deck (Samiksha).

## Branches and merging (practising what we preach)

- `main` is what Vercel deploys. It must always build.
- Phase 1: Laptop A works on branch `laptop-a`, Laptop B on `laptop-b` (both run by Shruti).
  Phase 2: Shruti `phase2-a`, Aarya `phase2-b`, Samiksha `phase2-c`, each from fresh `main`.
- The person at the laptop pushes their own branch by hand. After a task they open a
  pull request into `main`; a teammate reviews it; Shruti merges. Squash or merge.
  Disjoint paths means no conflicts.
- Before starting a new task: `git fetch && git rebase origin/main` on your branch.
- Never push directly to `main`. Never force push.
- Commit small, one task per commit, with a plain message (see TASKS.md).
- The repo is itself a demo: it should show a healthy team (reviews, small
  PRs, steady merges). SquadSync can be pointed at its own repo.

## Engine

Pure TypeScript in `src/engine/`, no framework imports. Entry point:

```ts
analyze(snapshot: RepoSnapshot, opts?: { weights?: Weights }): Analysis
buildSnapshot(raw, source): RepoSnapshot   // normalise + identity match + task-to-code link
planFrom(prd: string, teamSize: number): Promise<ProjectPlan>
checkPlan(plan: ProjectPlan, snapshot: RepoSnapshot): Risk[]   // plan versus reality
```

Layout:

```
src/engine/
  normalize.ts     identity match (login to task assignee), task-to-code links
  link.ts          link by branch name or "#12" in PR/commit text; AI match only as fallback
  indicators.ts    shares, review matrix, weekly timeline, late-merge share, schedule projection
  baseline.ts      per-team, per-role usual range (median and spread)
  risks.ts         workload, review, integration, deadline rules to Risk[]
  radar.ts         conflict rules (overlap, drift, direct push, delete, add/add, lockfile, stale)
  scenes.ts        builds a GraphScene for each risk
  config.ts        all thresholds and weights in one place
  plan.ts          planFrom (LLM + validation), checkPlan
  index.ts         analyze()
```

### Default thresholds (all in `config.ts`, all justified in docs/METRICS.md)

- Workload: flag when a person's composite share is above 1.6 times the even
  share, or below 0.4 times for a "code" role with no docs/design work.
  Roles design and docs are judged on their own work, not on code.
- Review gap: merged PRs with zero reviews above 20% is medium, above 40% high.
  A "code" person with zero reviews given is flagged. Median time to first
  review above 48 hours is medium.
- Late integration: more than 40% of merged lines in the last 3 days is medium,
  above 55% high. An open PR older than 7 days is medium. A PR over 800 changed
  lines is medium. Main not updated for 4 days near the deadline is medium.
- Branch drift: more than 10 commits behind main is medium, more than 25 high.
- Overlap: same file on two open branches is "possible"; overlapping line
  ranges is "likely"; PR mergeable "conflicting" is "certain".
- Stale branch: no push for 5 days with an open task is low, 8 days medium.
- Deadline slip: project the finish date from the last 7 days of finished tasks
  (points optional, default 1). Late by 3 days or more is medium, 7 or more high.
- Verdict: any high risk gives At risk; otherwise any two mediums or one
  deadline slip gives Slipping; otherwise On track.

### Evidence rules (non-negotiable)

- Every `Risk` has `rule`, `evidence[]` with real values from the snapshot, and
  an `action`. No evidence, no risk.
- Code decides what is true. AI only (a) words `summary` and (b) matches tasks to PRs
  when no ID exists, and (c) proposes the PRD plan. AI output is validated by code.
- Anything AI-written is tagged in data (`summarySource: "ai"`, `linkSource: "ai"`)
  and the UI shows a small tag. A template fallback always exists, so a failed
  AI call never breaks the demo.
- Anonymise people in the UI as "Member A", "Member B" by `Person.displayName`.

## API (owner: B)

```
GET  /api/teams                    TeamListItem[]
GET  /api/analyze/[teamId]?asOf=   Analysis   (asOf powers replay; default = latest)
POST /api/analyze/github           { snapshot, analysis }   body { repo, deadline, tasksCsv? }
POST /api/plan                     ProjectPlan              body { prd, teamSize }
```

GitHub pull uses the REST API with `GITHUB_TOKEN`: commits, pulls, pull files
(for changed paths and line patches), reviews, branches, compare (ahead/behind),
issues for tasks. Respect rate limits: cache within a request, cap pages,
return a clear error with a reset time, never loop. Line ranges come from
the `patch` hunk headers on each changed file.

## Pages (owner: A)

```
/                 mentor list (all teams)
/team/[id]        team page: verdict, replay, three panels, risks, not flagged
/team/[id]/risk/[riskId]   evidence drawer as a page (also a drawer on /team/[id])
/connect          login-free setup: paste repo, deadline, optional CSV
/plan             PRD splitter
/embed            narrow side-panel layout, reads ?repo=owner/name
```

No accounts. "Login" is out of scope. The first screen asks for a repo link
and a deadline. Mock data and `/api` switch via one flag so A can build
before B's API exists.

## Extension (owner: C)

```
extension/
  manifest.json     MV3; permissions: sidePanel, activeTab, storage; host: github.com
  background.js     opens the side panel on toolbar click
  sidepanel.html    one iframe to https://<deployed-app>/embed?repo=owner/name
  sidepanel.js      reads the active tab URL, extracts owner/name, sets the iframe src
  options.html      deployed app URL, optional deadline default
```

Detect the repo from `github.com/<owner>/<repo>/...`. If the tab is not a repo,
show a one-line message. The app must allow framing (do not set
`X-Frame-Options: DENY`). Test in Edge first. Private repos need the token on
the server; keep the extension free of secrets.

## Deploy

Vercel project connected to the GitHub repo, `main` auto-deploys. Preview
deployments for the other branches. Environment variables set in Vercel:
`GITHUB_TOKEN`, `LLM_API_KEY` (and `LLM_PROVIDER` if more than one). Check
the deployed URL after every merge to `main`. Always keep one known-good
deployment to submit.

## Open decisions (ask Shruti)

1. Which LLM key will be used for the PRD splitter and sentence wording?
2. Is a provided dataset available from the organisers?
3. Exact colour codes, if the team has them (otherwise DESIGN.md values stand).
