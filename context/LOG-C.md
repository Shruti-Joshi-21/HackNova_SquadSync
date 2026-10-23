# LOG-C: Teammate C (extension, docs, deck)

Only this owner edits this file. Newest entry on top.

## Done

- C2: Chromium MV3 extension in extension/. manifest.json (sidePanel,
  activeTab, storage permissions; host permission github.com), background.js
  (opens side panel on toolbar click), sidepanel.html/js (reads active tab
  URL, extracts owner/repo, sets iframe src to <app url>/embed?repo=owner/repo,
  shows a one-line message on non-repo pages), options.html/js (app URL and
  default deadline saved to chrome.storage.local), README.md with Edge/Chrome
  load-unpacked instructions. Tested: loads unpacked in Edge with no errors.

## In progress

Nothing yet.

## Next

C6: src/app/embed/ side-panel page.

## Needs from others

- src/lib/types.ts (frozen, already available).
- src/components/GitGraph.tsx (owner A) for C6.
- src/lib/data.ts (owner A) for C6, getAnalysis/connectRepo.
- Deployed app URL for extension default (currently placeholder
  https://squadsync.vercel.app in sidepanel.js, update once known).

## Decisions

- Branch named "samiksha" instead of "phase2-c" (same role, C).
- Default app URL in sidepanel.js is a placeholder; real URL goes in options
  or gets updated once Vercel deployment is confirmed.

## Contract changes

None.

# LOG-C: Teammate C (extension, docs, deck)

Only this owner edits this file. Newest entry on top.

## Done

- C7: src/lib/github/csv.ts, parseTasksCsv(text, people). Pure function, no
  imports beyond types.ts. Handles quoted commas, case-insensitive columns
  (title, assignee, status, created, done, due, points), maps status names to
  TaskStatus, matches assignee to Person.taskAssignee or githubLogin
  (case-insensitive), skips rows with missing title with a reason. linkedPRs
  empty, linkSource "none", linkConfidence 0 (B5 or B8 wires these into the
  GitHub ingest route). Checked with npx tsc --noEmit and a manual check
  script (src/lib/github/csv.check.ts), both pass.
- C2: Chromium MV3 extension in extension/. manifest.json (sidePanel,
  activeTab, storage permissions; host permission github.com), background.js
  (opens side panel on toolbar click), sidepanel.html/js (reads active tab
  URL, extracts owner/repo, sets iframe src to <app url>/embed?repo=owner/repo,
  shows a one-line message on non-repo pages), options.html/js (app URL and
  default deadline saved to chrome.storage.local), README.md with Edge/Chrome
  load-unpacked instructions. Tested: loads unpacked in Edge with no errors.

## In progress

Nothing yet.

## Next

C1: docs/METRICS.md. (C6, the embed page, is blocked: src/lib/data.ts does
not exist yet, owner A, needed for getAnalysis/connectRepo. Will revisit once
A3 lands.)

## Needs from others

- src/lib/data.ts (owner A) for C6, getAnalysis/connectRepo. Not yet created
  as of this log entry.
- Deployed app URL for extension default (currently placeholder
  https://squadsync.vercel.app in sidepanel.js, update once known).

## Decisions

- Branch named "samiksha" instead of "phase2-c" (same role, C).
- csv.ts: a row missing a created date gets a placeholder createdAt of
  1970-01-01T00:00:00Z rather than being skipped, since created date is
  common on boards but not always exported. Flagged here for visibility.
- Order changed: C6 deferred past C7 since it was blocked on A's data.ts.
  Moving to C1 next per the fallback ordering in TASKS.md.

## Contract changes

None.