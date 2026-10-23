# PROMPTS-PHASE2.md: from 22:30, three people

First, on every laptop (Shruti uses phase2-a, Aarya phase2-b, Samiksha phase2-c):
```
git fetch
git checkout -b phase2-<a|b|c> origin/main
cat CONTEXT.md context/LOG-A.md context/LOG-B.md context/LOG-C.md
```
Then read what the logs say is done and left, and start with the first task
below that is not done.

Order from 22:30. Shruti: A3 (in PROMPTS.md), A4, A5, A6, A7. Aarya: finish B2 if open,
then B3 (in PROMPTS.md), B4 to B8. Samiksha: C2, C6, C7, C1, C4, C3, C5.
A9 polish is the shared 05:30 pass. Paste one prompt at a time. Commit routine as before.

Shared preamble for every Claude Code prompt below:
"Read CLAUDE.md, CONTEXT.md and all three logs in context/ first. Stay inside
the paths you own. Do not push. At the end update your log and print the git
commands and commit message."

---

## LAPTOP A (Shruti)

### A4: mentor list and connect page
```
Build "/" (mentor list) and "/connect". Mentor list: one table, not cards. A row
per team: team name, verdict word (coloured), one-line reason, number of risks,
the largest risk. Sort by worst verdict first, then risk count. Rows link to
/team/[id]. Data from getAnalysis for each mock team for now. /connect: a
login-free setup form: GitHub repo link (owner/name or URL, validated), project
deadline (date), optional task CSV upload (file input, name shown), a single
primary button "Analyse". On submit it calls a function connectRepo() in
src/lib/data.ts that returns an error state for now. Plain labels, inline
validation messages, no icons. Follow DESIGN.md.
Commit message: Add mentor list and connect page
```

### A5: swap mocks for the API
```
Replace the mock data source with the real API behind one flag in
src/lib/data.ts (NEXT_PUBLIC_USE_MOCKS=true keeps mocks). Endpoints are in
ARCHITECTURE.md and src/lib/types.ts. Add loading skeletons made of plain
bordered blocks, and error states with one sentence and a Retry button. Add a
"Refresh" button on the team page that re-calls the API, and optional 60-second
auto-refresh toggle. Keep results in memory and localStorage so a reload does not
lose a pasted repo. Commit message: Connect pages to the analysis API
```

### A6: replay strip
```
Build the replay strip on the team page: one segment per week from
Analysis.timeline coloured by status (success, warning, danger, future as dashed
border), a draggable marker, and a small marker at the earliest
Risk.firstDetectableAt labelled "first warning" in plain text. Dragging calls
the API with ?asOf= and the whole page updates; debounce 250ms. Keyboard
accessible (arrow keys move one week). Show "Viewing 12 Oct" text while replaying and a
"Back to today" link. Commit message: Add replay strip
```

### A7: plan page
```
Build "/plan". Left: a textarea for the PRD and a team-size select (2 to 6) and
one primary button "Split the work". Right, after the call to POST /api/plan:
an ownership map as a table (module, owner as Member A..., folders, tasks,
depends on), a "Shared files" list (path, single owner, rule), "Agree these
first" interfaces list, and the merge order as a horizontal node-and-edge strip
(reuse GitGraph styling: rings for modules, edges for dependencies). Show a
"checked by code" line with what was validated and any validation failures. Save
the latest plan in localStorage. Mock the response if the API is not live. No
icons beyond Octicons if needed. Commit message: Add PRD splitter page
```

### A9: polish and accessibility (shared 05:30 pass, everyone takes a set of pages)
```
Do a pass over every page against DESIGN.md: contrast, focus rings, keyboard
use, reduced motion, empty states, copy (plain, sentence case, no exclamation
marks, no emojis), text sizes, mobile widths at 390px. Remove anything that
looks generic or decorative. Fix real bugs only. List what you changed in the log.
Commit message: Polish interface and fix accessibility issues
```

---

## LAPTOP B (Aarya)

### B4: API routes (skip if done)
```
Create the API routes in src/app/api: GET /api/teams (TeamListItem[] from
data/snapshots), GET /api/analyze/[teamId]?asOf= (Analysis, using sliceAsOf
when asOf is given). Read snapshots with fs at build/request time from data/ (they are committed
files). Stateless. Return typed JSON and clear errors (404 unknown team, 400
bad date). Commit message: Add team and analysis API routes
```

### B5: GitHub ingest
```
Create src/lib/github/ and POST /api/analyze/github. Input { repo, deadline,
tasksCsv? }. Use GITHUB_TOKEN from the server environment only. Pull: commits
(default branch), pull requests with files (parse hunk headers in each file's
patch into line ranges), reviews, branches with compare (ahead and behind),
issues as tasks. Map to RepoSnapshot (source "github"), build Persons from
logins with display names "Member A..", roles default "mixed", then analyze().
Respect rate limits: cap pages and PR count, parallelise carefully, return a clear
error with the reset time on 403 or 429, never loop. Private repos: if 404,
say the token may lack access. Cache nothing on disk. Commit message: Add GitHub ingestion for pasted repos
```

### B6: LLM wrapper and wording
```
Create src/lib/llm.ts: one function complete(prompt, opts) using LLM_PROVIDER and
LLM_API_KEY from the environment, with a 8s timeout and one retry. Use it for:
(1) rewriting each Risk.summary into one plain sentence from the numbers in
Risk.evidence (summarySource "ai"), keeping the template as the fallback on any
failure; (2) task-to-PR matching when no ID link exists, returning a confidence
0..1, linkSource "ai", used only above 0.6. The prompt must forbid inventing
numbers: the sentence may only use values present in the evidence. After the
call, validate that every number in the sentence appears in the evidence;
otherwise use the template. Never block the response on AI: run with a timeout and
fall back. Commit message: Add LLM wording and task matching with template fallback
```

### B7: PRD splitter and plan check
```
Implement src/engine/plan.ts and POST /api/plan. planFrom(prd, teamSize) asks the
LLM for a ProjectPlan (modules, one owner slot and folders per module, shared
files with a single owner, interfaces to agree first, merge order). Then validate
in code and repair or reject: every module has exactly one owner, no folder is owned
by two modules, shared files have one owner, merge order respects dependsOn,
teamSize owners are all used when modules allow. If validation fails after one
repair attempt, return a deterministic template plan (source "template").
checkPlan(plan, snapshot) compares changed paths on branches and PRs against
the ownership map and returns Risk objects ("C edited A's folder", "two
people editing a shared file") with evidence and a scene. Commit message: Add PRD splitter and plan versus reality check
```

### B8: wire CSV import and extra scenes
```
Samiksha owns src/lib/github/csv.ts (exports parseTasksCsv(text, people): { tasks: Task[]; skipped: string[] }).
Do not edit it. Pull it from origin/main, then wire tasksCsv into POST /api/analyze/github.
Then add scenes 9 to 12 from PROJECT.md if not present. Commit message: Wire CSV tasks and add remaining scenes
```

---

## C (Samiksha, Arena, copy and paste)

How to work: open a new Arena chat. First message: paste CONTEXT.md and
DESIGN.md. Then paste one task below. Ask for complete files with their paths.
Copy each file into the repo at that path, run the check named in the task, then
commit on `phase2-c`. If a reply is long, ask "continue" and join the parts.
Only create or edit files under `docs/`, `extension/`, `src/app/embed/` and `src/lib/github/csv.ts`.

### C1: docs/METRICS.md
```
Write docs/METRICS.md: the justification of our indicators for the judges. For
each indicator write one short block with these headings: What it measures. Why
it matters. How it is computed. Default threshold. Why a normal difference is not
flagged. Indicators: contribution share (tasks, size-weighted code, reviews, docs
and design), review gap, review latency, late integration, open PR age and size,
branch drift, deadline projection, conflict radar (possible, likely, certain),
same-file and same-line overlap, direct push to main, unpushed-work proxy. Also
one block: "Why not commit count" and one: "What we cannot see". Use the thresholds
in ARCHITECTURE.md. Plain language, no emojis, under 1,200 words.
```

### C2: extension/
```
Create a Chromium Manifest V3 extension in extension/ that opens a side panel
beside GitHub. Files: manifest.json (permissions: sidePanel, activeTab, storage;
host permission https://github.com/*), background.js (open the side panel when
the toolbar button is clicked), sidepanel.html and sidepanel.js (read the active
tab URL, extract owner and repo from github.com/<owner>/<repo>, set an iframe src
to <APP_URL>/embed?repo=<owner>/<repo>; if the tab is not a repo, show one line
of text; re-check when the tab changes or the URL updates), options.html and
options.js (a text field for the app URL, saved in chrome.storage.local), and a short
README in the folder. Styles: black background #0a0a0a, text #ededed, Geist or
system sans, no icons except a plain text label. No remote scripts. Explain how to
load it unpacked in Edge (edge://extensions, Developer mode, Load unpacked) and
how to test on a repo page.
```

### C3: docs/README.md
```
Write docs/README.md: what SquadSync is in three sentences, how to run locally
(npm install, .env.local with GITHUB_TOKEN and LLM_API_KEY, npm run dev), how the
data flows (ingest, normalise, analyse, evidence, dashboard), folder map (from
ARCHITECTURE.md), how to deploy on Vercel with the env vars, how to load the
extension, how synthetic data is generated, and known limits (cannot see
uncommitted local work, predictions are file-and-line based). No emojis.
```

### C4: deck text
```
I have a PPT template. Write the text for each slide following this outline:
1 Problem. 2 Why GitHub's own insights are not enough. 3 The idea: Plan, Watch,
Warn. 4 How it works (describe one simple architecture diagram I will draw).
5 The indicators and why. 6 One risk walkthrough: rule, picture, evidence,
action. 7 What is unique. 8 Where AI is used and where it is not. 9 Tech and
feasibility. 10 Limits and what is next. For each slide give a title of 6 words or
fewer, up to 4 short lines, and one line of speaker notes. Use only facts from
CONTEXT.md and PROJECT.md. No emojis, no hype words.
```

### C5: docs/DEMO.md
```
Write docs/DEMO.md: the 3 to 4 minute demo script from PROJECT.md "Demo story", with
what to click and what to say on each step, one sentence each. Add: the
pre-demo checklist (deployed URL open, token set, extension loaded in Edge,
backup screen recording ready), what to do if the network or the AI call fails
(everything has a template fallback, switch to synthetic data), and five likely
judge questions with short answers (why not commit count, how do you avoid
false alarms, what AI is used for, what you cannot detect, how is this different
from GitHub Insights).
```

### C6: src/app/embed/ (side-panel page)
```
Paste first: src/lib/types.ts, DESIGN.md, src/components/GitGraph.tsx, src/lib/data.ts.
Build src/app/embed/page.tsx (and any file under src/app/embed/ only): a narrow layout
(360 to 420px) that reads ?repo=owner/name. It has no top bar. It shows the verdict
word and sentence, the top three risks as rows (click to expand the rule, the GitGraph
scene and the evidence), and an "Open full view" link to /connect. If no repo is given,
one line asking to open a GitHub repo page. Use getAnalysis/connectRepo from data.ts,
tokens only (var(--...)), Octicons only, no emojis. Check the scene fits at 360px.
Commit message: Add embed layout for the side panel
```

### C7: src/lib/github/csv.ts
```
Paste first: the Task and Person types from src/lib/types.ts.
Write src/lib/github/csv.ts, a pure function, no imports beyond types:
parseTasksCsv(text: string, people: Person[]): { tasks: Task[]; skipped: string[] }.
Columns (case-insensitive, any order): title, assignee, status, created, done, due, points.
Map status names such as To Do, Backlog, In Progress, Doing, Review, Done, Closed to
TaskStatus. Match assignee to Person.taskAssignee or githubLogin (case-insensitive).
Handle quoted commas. Tolerate missing columns. Rows it cannot read go in skipped with the
reason. Set linkedPRs [], linkSource "none", linkConfidence 0. Put a few example rows as comments at the bottom.
Commit message: Add task CSV import
```
