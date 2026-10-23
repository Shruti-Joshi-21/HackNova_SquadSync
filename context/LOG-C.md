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