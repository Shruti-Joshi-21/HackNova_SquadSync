# Demo script

About 3 to 4 minutes. One person clicks, one person talks (or the same person
does both). Every sentence below is short on purpose: say it, then let the
screen show it.

Live app: https://hack-nova-squad-sync.vercel.app

## Before the demo (check 15 minutes before)

- [ ] The live app opens on the landing page, and `/mentor` shows four teams.
- [ ] Team Nexus opens and shows 12 risks. Some sentences carry the small
      "written by AI" tag (this proves the Gemini key is set in Vercel).
- [ ] `/connect` analyses `Shruti-Joshi-21/HackNova_SquadSync` once (this
      proves the GitHub token is set, and warms the server up).
- [ ] `/plan` has the sample PRD below copied and ready to paste.
- [ ] The extension is loaded in Edge and pinned (`edge://extensions`,
      Developer mode, Load unpacked, `extension/` folder).
- [ ] A tab is open on https://github.com/Shruti-Joshi-21/HackNova_SquadSync
      for the extension step.
- [ ] Browser zoom at 110 to 125% so judges can read it. Notifications off.
- [ ] The backup screen recording is on the laptop's desktop, ready to play.
- [ ] A second laptop has the app open too, in case one fails.

Sample PRD to paste in step 6:

```
Campus marketplace. Students sign up with their college email and log in.
They list items for sale with photos, search and filter listings, chat with
sellers, and pay through a checkout page. Sellers get an email when an item
sells. An admin dashboard shows reports and removes bad listings.
```

## The script

### 1. Mentor list (20 s)

**Click:** open `/`, the landing page, then click "Mentor view" (it opens `/mentor`).

**Say:** "A mentor supervises many student teams. SquadSync ranks them, worst
first, with one sentence each. Three teams are at risk. Team Atlas is on track."

### 2. Team Nexus (30 s)

**Click:** the Team Nexus row.

**Say:** "Team Nexus is at risk. Nine days to the deadline, and at its current
pace it finishes about five days late. These three panels are who did the
work, who checked whose work, and when the code landed. Notice we never count
commits: the share mixes finished tasks, merged code by size, reviews, and
docs and design work."

**Point at:** the verdict word, the schedule bars, and the red last week on the
"when code landed" chart (58% of the code landed in the last 3 days).

### 3. The top conflict (45 s)

**Click:** the risk "Two branches edit routes.js L60-75". The evidence drawer
opens and the picture plays.

**Say:** "Here is the problem SquadSync is built for. Member A and Member C are
both changing the same lines of routes.js on two open branches. Neither has
merged yet, so nothing has broken. But when the second one merges, it will
conflict. The picture shows exactly that: two branches, one red merge."

**Point at:** the "Likely" tag, then the rule ("why we flagged this"), the
evidence (files, line ranges, who), and the action at the bottom.

**Say:** "Every risk has these four parts: the rule, the real evidence, the
picture and one action. No evidence, no risk."

### 4. Not flagged (20 s)

**Click:** close the drawer and scroll to "Not flagged".

**Say:** "Member D has very few commits, and a commit counter would flag them.
Member D is the designer and owns three finished design tasks, so SquadSync does not.
Separating real risk from normal differences was one of the requirements."

### 5. Replay (25 s)

**Click:** drag the replay marker back to around 10 October.

**Say:** "Could we have known earlier? Drag back two weeks: the team was
already slipping. And this tick shows the first warning, Member C's missing
reviews, back on 18 September. A mentor could have stepped in five weeks before
the deadline."

**Click:** "Back to today".

### 6. Plan: the PRD splitter (35 s)

**Click:** open `/plan`, paste the sample PRD, choose team size 4, click
"Split the work".

**Say:** "Prevention starts before the first commit. Paste the project
description, choose the team size, and SquadSync proposes a split: one owner
per module, one folder each, one owner for every shared file, what to agree on
first, and a merge order. AI proposes it, but code checks it."

**Point at:** the "Checked by code" list, all green.

### 7. A real repository (30 s)

**Click:** open `/connect`, paste `Shruti-Joshi-21/HackNova_SquadSync`, any
deadline, click "Analyse". It takes about 5 seconds.

**Say:** "Same engine, real data. This is our own repository from tonight,
read live from GitHub." When it opens: "And it is honest about us too: we
merged our pull requests without reviews, because three people were building
at 2 AM."

### 8. The extension (25 s)

**Click:** switch to the GitHub tab with our repository, click the SquadSync
icon in the Edge toolbar. The side panel opens.

**Say:** "Students live on GitHub, not on dashboards. The extension puts the
verdict and the top risks right beside the repository."

**Close with:** "SquadSync: plan the split, watch the branches, warn before
the merge breaks."

## If something fails

| What fails | What you see | What to do |
|------------|--------------|------------|
| AI (Gemini down or slow) | Sentences have no "written by AI" tag; the plan says it is a template | Nothing. Say: "AI is optional here. When it fails, the code's own template is used." |
| GitHub (rate limit or slow) | /connect shows one sentence, for example "GitHub's rate limit is used up until 14:05 UTC" | Skip step 7. Say: "Live data needs GitHub; the four sample teams show the same engine." |
| Wi-Fi | Pages do not load | Use the phone hotspot. If that fails, play the backup recording. |
| The deployed site | Error page | Open the app on the second laptop, or run it locally: `npm run dev` with `NEXT_PUBLIC_USE_MOCKS=true` needs no network for the sample teams. |
| The extension | Panel is blank | Show `/embed?repo=Shruti-Joshi-21/HackNova_SquadSync` in a narrow browser window: it is the same page the panel loads. |

Never apologise for long; say one sentence and move to the next step.

## Likely judge questions

**Why not just count commits?**
"Commit count rewards people who commit often, not people who do the work. A
designer or a careful reviewer looks idle. We combine finished tasks, merged
code weighted by size, reviews given, docs and design, and quick replies, and
commit count has zero weight. Member D in the demo is the example: few commits,
not flagged."

**How do you avoid false alarms?**
"Three ways. Thresholds are wide and compared with the team's own even share,
not a fixed number: flagged above 1.6 times or below 0.4 times. Rules wait for
enough data, for example 6 finished tasks before any workload flag. And every
flag shows its rule and evidence, so a mentor can check it in seconds. People
who look quiet but are fine are listed under 'Not flagged' with the reason."

**What is the AI used for, and can it make things up?**
"Code decides what is true. AI does three small jobs: it rewords the risk
sentences, links tasks to pull requests when there is no id, and proposes the
PRD split. Code checks every answer: a sentence with any number that is not in
the evidence is thrown out, a task link needs above 0.6 confidence and the same
person on both sides, and a plan must pass five checks. If AI fails, templates
take over, and the app still works with no AI key at all."

**What can't SquadSync detect?**
"Anything that is not on GitHub. Uncommitted work on a laptop is invisible to
a web app. We show a proxy, a task in progress with nothing pushed, and say on
screen that it is a proxy. Conflicts are predicted from files and line ranges,
so we say 'possible', 'likely' or 'certain', never more than the data shows.
A local Git hook is the next step."

**How is this different from GitHub Insights?**
"GitHub shows commit graphs and counts per person. It does not give a verdict
with a reason, does not see review gaps, does not link tasks to code, and does
not warn about a conflict before it happens. It also has no plan versus
reality and no replay. We deliberately do not repeat what GitHub already shows."

## Timing

| Step | Time |
|------|------|
| 1 Mentor list | 0:20 |
| 2 Team Nexus | 0:50 |
| 3 Top conflict | 1:35 |
| 4 Not flagged | 1:55 |
| 5 Replay | 2:20 |
| 6 PRD splitter | 2:55 |
| 7 Real repo | 3:25 |
| 8 Extension | 3:50 |

If time is short, cut step 7 first, then step 5. Never cut step 3.
