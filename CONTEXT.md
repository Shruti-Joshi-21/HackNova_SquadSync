# CONTEXT.md: start here

Paste this file, then the three log files, into any new Claude chat or Claude
Code session to get fully up to speed:

```
cat CONTEXT.md context/LOG-A.md context/LOG-B.md context/LOG-C.md
```

Then read PROJECT.md, DESIGN.md, ARCHITECTURE.md, TASKS.md as needed.

## The situation in one paragraph

We are a team of three at the Hacknova'26 hackathon, sponsored by
MyStartupWave (Wave). We chose problem statement PS-3, SquadSync:
analyse Git and task-board data to find workload imbalance, review gaps and
risky integration in student project teams. Submission is Saturday 8:00 AM IST.
We are building from scratch, deploying from the first hour, and always keeping
one working deployment ready to submit. Judges are mostly sponsors and founders.

## How we got here (decisions, with the reason)

1. PS choice. Chose PS-3 because it is analysis on
   provided data (no maps, no scraping), fits the Wave audience (Git, sprints,
   reviews) and is likely less crowded. Weak point: it is less visual, so we
   made the visuals the priority (node-and-edge scenes, verdict word, replay).
  Problem Statement given: 
   SquadSync — Spotting Workload Imbalance and Integration Risk from Git and Task Data Background / Context Student project teams often discover collaboration problems only when deadlines are approaching. Work may be distributed unevenly, code reviews may be missed, or team members may delay integrating their work until the final stages of a project. Raw commit counts alone do not provide a reliable picture of contribution or collaboration. A more meaningful analysis should consider factors such as task distribution, review participation, code activity, and integration patterns. Problem Statement Build a system that analyzes Git repository activity and task-board data to identify collaboration risks such as workload imbalance, insufficient review participation, and delayed integration. The system should go beyond raw commit counts by using meaningful indicators and presenting clear evidence that helps student teams and mentors understand potential collaboration issues and take corrective action. Objectives / Goals  Identify meaningful collaboration patterns from Git and task-board activity.  Detect potential workload imbalance among team members. Identify missing or uneven review participation.  Detect delayed or risky integration patterns.  Explain the evidence behind each identified risk.  Use multiple meaningful indicators rather than relying solely on commit counts. Present actionable insights that teams and mentors can understand easily. Target Users / Stakeholders  Student project teams  Teaching assistants  Project mentors  Faculty members supervising group projects HACKNOVA26 7 HACKNOVA26 PROBLEM STATEMENTS 6. 7. 8. 9. Constraints & Technical Considerations  Use the provided synthetic or anonymised Git and task-board data.  Contribution should not be assessed using raw commit count alone.  Selected metrics and indicators must be clearly justified.  The system should distinguish between genuine collaboration risks and normal differences in team activity.  Only information necessary for team-level insights should be displayed.  The solution should be feasible to implement and demonstrate within the hackathon duration. Resources Provided  GitHub REST API: Access repository commits, pull requests, code reviews, branches, and merge activity. Link:   https://docs.github.com/en/rest GitHub Archive: Historical public GitHub event data that can support the analysis of development activity and collaboration patterns. Link:   https://www.gharchive.org/ ▪ Apache DevLake: An open-source engineering analytics platform for collecting and analyzing development activity from supported tools, including GitHub and Jira. Link:   https://devlake.apache.org/ Teams may use their own Git repository data, task-board exports, publicly available datasets, or other relevant data sources, provided they are suitable for the problem statement and comply with applicable access and licensing requirements. Expected Solution / Key Features The solution is expected to include:  Data Ingestion & Normalisation: Process and combine Git activity and task-board data into a consistent format.  Workload Analysis: Analyze task distribution and development activity across team members.  Review Participation Analysis: Identify patterns in code-review participation and potential review gaps.  Integration Risk Analysis: Detect delayed merges, long-lived changes, or patterns indicating potential integration problems.  Collaboration Indicators: Generate meaningful metrics that provide a broader view of team collaboration beyond commit counts. Risk Detection: Highlight potential collaboration risks based on the selected indicators.  Evidence-Based Insights: Provide short explanations showing why a particular risk was identified.  Collaboration Dashboard: Present workload distribution, review participation, integration status, and identified risks in a clear interface. Mentor/Team View: Provide actionable insights that can help teams and mentors address identified issues. Expected Deliverables Teams must submit:  A functional SquadSync collaboration-monitor prototype.  A dashboard or report displaying collaboration indicators and identified risks.  A data-analysis component for Git and task-board activity.  Source code and documentation.  A demonstration showing how the system identifies collaboration risks. 8 HACKNOVA 26HACKNOVA 26 PROBLEM STATEMENTS  A brief justification of the selected metrics and indicators. 10. Evaluation Criteria:  Meaningfulness and justification of the selected collaboration indicators.  Ability to identify realistic workload, review, and integration risks. Ability to provide clear evidence behind identified risks.  Usability and usefulness for students and mentors.  Engineering quality and clarity of presentation.
2. Do not repeat GitHub. GitHub Insights already shows commit graphs and
   per-person counts. We only show what it does not: verdict plus reason,
   review gaps, tasks matched to code, conflicts before they happen,
   plan versus reality, replay.
3. We are not building a Git. We build an analytics app on top of Git and
   task-board data. One engine, three ways to feed it: (A) provided or
   synthetic data, (B) paste a GitHub repo link (GitHub REST API), (C) "live"
   by refresh or 60-second polling (no webhooks).
4. Task board data means the team's to-do cards (Trello, Jira, GitHub Issues,
   Projects): title, owner, status, dates. An optional CSV upload is a fallback
   for boards exported from Jira or Trello. Combining Git and task data means:
   one person record per human (match GitHub login to task assignee), one shared
   event shape, and links from tasks to PRs/commits (branch name, "#12" in text,
   AI match as a fallback with its confidence shown).
5. Deadline: entered by the user at setup (project start, deadline). The engine
   projects the finish date from the last 7 days of finished tasks and warns
   per person and per team. It warns; it cannot force anyone.
6. The data resources in the PS: GitHub REST API (usable, our main live source),
   GH Archive (heavy, skip unless spare time), Apache DevLake (do not deploy;
   borrow its data-model ideas). No actual dataset was found in the PDF, so we
   generate synthetic data shaped like GitHub API responses. Ask organisers.
7. Merge conflicts are the real student pain. So the headline idea is Plan,
   Watch, Warn: a PRD splitter that divides work to minimise conflicts, a
   conflict radar that reads changed files and line ranges, and a plan-versus-
   reality check. We never promise zero conflicts.
8. Honesty about limits: unsaved or uncommitted local work cannot be seen by a
   web app. We show a proxy (task in progress, no push for days) and list a local
   hook or editor extension as future work.
9. Evidence first: nothing happens in the backend that is not visible on screen.
   Every risk shows rule, picture (node-and-edge scene), evidence, action.
   Code decides what is true. AI only words sentences, links tasks when there is
   no ID, and proposes the PRD plan. Template fallback always exists.
10. AI usage is small on purpose: required PS features need no AI (rules and
    statistics are easier to defend). AI is used in three places only: summary
    wording, task-to-PR matching fallback, PRD splitter.
11. Fair contribution: tasks 30%, size-weighted merged code 25%, reviews 20%,
    docs and design 15%, quick replies 10%. Commit count 0%. Role-aware, compared
    against the team's own usual range.
12. Visuals: the GitGraph scene (nodes, edges, red conflict node with a cross,
    animated) in the style of git-flow explainer videos. Catalogue in PROJECT.md.
13. Theme: GitHub/Vercel black, white, gray. Colour only for status (green,
    red, amber) and for charts and graph scenes. No AI-looking UI: no emojis,
    no generic icons or card grids, no saturated colours. Icons from Octicons.
14. Extension: required, not optional. Web app first (deployed from the start),
    then a Chromium side-panel extension that shows the app beside the GitHub
    repo. The team uses Edge. The panel loads the deployed /embed page.
15. Storage: no external database. Static JSON for synthetic data, stateless
    API, browser storage for results and the PRD plan. See ARCHITECTURE.md.
16. Naming: "Mentor view" and "Team view". ("Founder" was an early label of
    ours, not a GitHub role. Do not use it in the UI.)

## The team and the tools

- Shruti: Claude Code. She starts at 16:15, works until 18:30 and resumes at
  22:30. Until 22:30 she is the only one at the laptops and runs two Claude Code
  sessions at once (Laptop A and Laptop B). She does all
  `git add`, `git commit` and `git push` by hand and merges into `main`.
  From 22:30 she keeps Laptop A (interface).
- Aarya: Claude Code. Back by 22:30. Takes over Laptop B (data and engine)
  from the logs and this file.
- Samiksha: Claude via the Arena app (high usage limits), no Claude Code. She
  copies code into the project by hand. Back by 22:30. Owns role C's work
  (extension/, docs/, deck text), small isolated tasks in folders nobody else
  touches.
- Claude Code never pushes. At the end of each task it gives the exact commands
  and a commit message, and the person at that laptop runs them.
- "Laptop A, Laptop B, C" are roles. Shruti plays A and B in Phase 1; from 22:30
  the roles are Shruti = A, Aarya = B, Samiksha = C.

## Timeline (IST, Friday 23 Oct to Saturday 24 Oct 2026)

- 16:15 to 16:35: Step 0 setup (repo, clone twice, copy kit, Vercel).
- 16:35 to 18:15: Phase 1, Shruti on two Claude Code laptops (A1, A2, B1, B2).
- 18:15 to 18:30: wrap-up, push, merge.
- 18:30 to 22:30: nobody at a laptop. Everything must be pushed before leaving.
- 22:30 to 02:30: Phase 2, three people in parallel (Shruti A, Aarya B, Samiksha C).
- 02:30 to 05:30: sleep.
- 05:30 to 07:00: integrate, polish, deck, rehearse. Code freeze 07:00.
- 07:15: final deploy check and submit. Hard deadline 08:00.
Details: TASKS.md.

## Where things are

- Concept canvas (early visual concept, private link, owner only):
  https://claude.ai/artifact/X8Y615kHVHCqT4oegbhMtZ . It is the early picture.
  Where it disagrees with DESIGN.md (colours, the "Founder" board), DESIGN.md wins.
- Data contract: `src/lib/types.ts` (frozen).
- Rules for Claude Code: CLAUDE.md (gitignored, copy to each laptop by hand).
- Per-person progress: `context/LOG-A.md`, `LOG-B.md`, `LOG-C.md`.

## Current status

Kit written. No code yet. Phase 1 starts at Step 0 in TASKS.md.
(Do not edit this section. Progress goes in your own LOG file.)

## Open decisions

1. Which LLM API key for the PRD splitter and sentence wording.
2. Does the organiser provide a dataset?
3. Exact colour codes, if the team has them.
4. Deployed app URL (needed by the extension), once Vercel is set up.
