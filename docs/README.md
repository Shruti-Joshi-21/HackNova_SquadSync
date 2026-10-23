# SquadSync

SquadSync reads a student team's Git activity and task board and finds
collaboration risks early: one person carrying the work, code merged without
review, and merges that will conflict. Each risk is shown as one plain
sentence, the rule that flagged it, the evidence from real data, one action,
and a picture of what will go wrong. Its main promise: stop merge problems
before they happen, and do it without ever judging people by commit count.

Live app: https://hack-nova-squad-sync.vercel.app

Built for Hacknova'26, problem statement PS-3 (SquadSync).

## Run it locally

You need Node.js 20 or later and Git.

```
git clone https://github.com/Shruti-Joshi-21/HackNova_SquadSync.git
cd HackNova_SquadSync
npm install
```

Create a file named `.env.local` in the project root (it is gitignored, never
commit it):

```
GITHUB_TOKEN=your_github_token
LLM_PROVIDER=gemini
LLM_API_KEY=your_gemini_key
```

| Variable | Needed for | Without it |
|----------|-----------|------------|
| `GITHUB_TOKEN` | Pasting a live repo on /connect | Works for small repos, but GitHub allows only 60 requests an hour |
| `LLM_PROVIDER` | AI wording, task matching, PRD splitter | Use `gemini` |
| `LLM_API_KEY` | Same as above | Everything still works with template sentences and a template plan |
| `LLM_MODEL` | Optional, overrides the model | Default is `gemini-flash-lite-latest` |
| `NEXT_PUBLIC_USE_MOCKS` | Optional, `true` shows built-in mock data with no API calls | Uses the live API |

A GitHub token: GitHub, Settings, Developer settings, Personal access tokens,
Fine-grained tokens, read-only access to public repositories is enough.
A Gemini key: aistudio.google.com, Get API key, Create API key.

Then start the app:

```
npm run dev
```

Open http://localhost:3000. The four sample teams work with no keys at all.

## Pages

| Page | What it shows |
|------|---------------|
| `/` | Mentor view: every team ranked, worst first, with the verdict and one reason |
| `/team/[id]` | Team view: verdict, schedule, who did the work, who reviewed whom, when code landed, risks with an evidence drawer and conflict picture, "Not flagged", replay |
| `/connect` | Paste a GitHub repo link and a deadline, optionally a task CSV, and analyse it live |
| `/plan` | Paste a PRD, pick a team size, and get a split of the work that reduces conflicts |
| `/embed` | Narrow view for the browser extension's side panel |

## How it works

```
GitHub API or sample data  ->  normalise  ->  analyse  ->  evidence  ->  dashboard
```

1. **Ingest.** Sample teams are JSON files in `data/snapshots/`. A pasted repo
   is read live from the GitHub REST API: commits on the default branch, recent
   pull requests with their changed files and reviews, open branches compared
   with main, and issues as tasks (or a task CSV from Jira or Trello).
2. **Normalise.** Everything becomes one shape (`RepoSnapshot` in
   `src/lib/types.ts`). One person record per human: the GitHub login is
   matched to the task-board name. Tasks are linked to pull requests by the
   task id in the branch name, pull request title or commit message.
3. **Analyse.** Pure TypeScript in `src/engine/` computes contribution shares,
   the review matrix, the weekly timeline and the deadline projection, then
   runs the rules: workload, review gap, late integration, deadline slip, and
   the conflict radar (overlapping files and lines, deleted files, branch
   drift, direct pushes, stale work).
4. **Evidence.** Every risk carries the rule with its threshold, the real
   values that triggered it, one action, the date it first became detectable,
   and a node-and-edge scene.
5. **Dashboard.** The Next.js pages draw it. Nothing is stored on the server;
   analysis is computed on every request, and pasted repos are kept only in
   the browser.

AI (Google Gemini) is used in three places only, and code checks every
answer: wording risk sentences, linking tasks to pull requests when no id
links them, and proposing the PRD split. If AI fails or gives an answer code
rejects, the template is used. See `docs/METRICS.md` for every rule and threshold.

## Folder map

```
src/app/                pages (Laptop A) and src/app/api/ routes (Laptop B)
src/app/embed/          side-panel page for the extension
src/components/         UI components, including the GitGraph scene
src/engine/             analysis engine: rules, conflict radar, scenes, plan check
src/lib/types.ts        the data contract every part codes against
src/lib/github/         GitHub client, repo ingest, task CSV import
src/lib/llm.ts          the one place that calls the AI model
src/lib/data.ts         how pages fetch data (API or mocks)
data/gen/               seeded generator for the sample teams
data/snapshots/         the four sample teams as JSON
extension/              Chromium side-panel extension
docs/                   metrics justification, this README, demo script
```

## API

| Route | Returns |
|-------|---------|
| `GET /api/teams` | The sample teams with verdict and risk count |
| `GET /api/analyze/[teamId]?asOf=YYYY-MM-DD` | Full analysis of a sample team, optionally as it was on a past day |
| `POST /api/analyze/github` `{ repo, deadline, tasksCsv? }` | `{ snapshot, analysis }` for a live repo |
| `POST /api/plan` `{ prd, teamSize }` | A checked work plan |
| `POST /api/plan/check` `{ plan, teamId }` | Plan versus reality: who edited someone else's folder |

Errors are always `{ "error": "one plain sentence" }`.

## Deploy on Vercel

1. In Vercel, import the GitHub repository. The framework is detected as
   Next.js; no build settings need changing.
2. In the project's Settings, Environment Variables, add `GITHUB_TOKEN`,
   `LLM_PROVIDER` (`gemini`) and `LLM_API_KEY`, for Production and Preview.
3. Deploy. Every merge to `main` deploys again by itself. After adding or
   changing a variable, redeploy once, because variables only reach new deployments.

## Load the browser extension

The extension opens a side panel beside any GitHub repository page and shows
SquadSync's verdict and top risks for that repo.

1. Open `edge://extensions` (or `chrome://extensions`).
2. Turn on Developer mode.
3. Click "Load unpacked" and select the `extension/` folder of this repo.
4. Pin the SquadSync icon to the toolbar.
5. Open any `github.com/<owner>/<repo>` page and click the icon.

The panel loads the deployed app by default. To use a local copy, open the
extension's Options and set the app URL to `http://localhost:3000`. The
extension holds no secrets; the token stays on the server.

## Sample data

There was no dataset in the problem statement's resources, so the four sample
teams are generated, shaped like GitHub API results. The generator is seeded,
so every run writes the same files.

```
npx tsx data/gen/run.ts
```

It writes `data/snapshots/{nexus,atlas,orbit,zenith}.json`, checks every file
(every person exists, dates are in order, line counts add up, links point to
real pull requests) and checks that each team really tells its story:

- **Team Nexus**, the demo team: one member does 46% of the tasks, one never
  reviews, most code lands in the last 3 days, two open branches edit the same
  lines of `routes.js`, and a designer with few commits who must not be flagged.
- **Team Atlas**: healthy, steady and reviewed.
- **Team Orbit**: one member does about 65% of the work.
- **Team Zenith**: everything merged in the last days, almost no reviews.

Names are anonymised in the app as "Member A", "Member B" and so on.

## Checks

```
npx tsx src/engine/check.ts             engine finds every planted risk
npx tsx src/engine/check-ai.ts          code rejects bad AI answers
npx tsx src/engine/check-plan.ts        PRD splitter and plan check
npx tsx src/lib/github/board.check.ts   task CSV import
npm run lint
npm run build
```

## Known limits

- SquadSync reads GitHub, not laptops. Uncommitted or unpushed work cannot be
  seen. "Unpushed work" is a proxy (a task in progress with nothing on GitHub)
  and says so on screen. A local Git hook or editor extension would be the real fix.
- Conflicts are predicted from changed files and line ranges. "Possible" means
  the same file, "likely" means overlapping lines, "certain" means GitHub
  already reports the conflict. We never claim more than that, and never
  promise zero conflicts.
- Commits made in GitHub's web editor straight to main look like merge-button
  commits, so they are not caught as direct pushes.
- GitHub has no "started" date for issues, so the creation date is used.
- Live repos are capped to keep within GitHub's limits: the 30 most recently
  updated pull requests, 20 open branches, 300 commits, and teams of up to 12 people.
- Replay works for the sample teams. For a live repo, GitHub only gives
  today's state, so open branches cannot be replayed exactly.
