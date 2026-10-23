# Metrics justification

This document explains every indicator SquadSync computes: what it measures,
why it matters, how it is computed, the default threshold, and why a normal
difference between people is not flagged. Every number here is set in one
place, `src/engine/config.ts`, so this document and the engine agree.

Two rules hold everywhere. Code decides what is true: every flag comes from a
rule on real data, never from AI. And commit count is never used to compare
people.

## Contribution share

**What it measures.** Each person's share of the team's work, split into
tasks finished, merged code (weighted by size, not commit count), reviews
given, docs and design work, and quick replies to review requests.

**Why it matters.** Workload imbalance is a leading cause of late or rushed
projects. Looking at one axis alone (for example, commits) hides who is
actually carrying the team.

**How it is computed.** A weighted combined share: finished tasks 30%, merged
code 25%, reviews given 20%, docs and design 15%, quick replies 10%.

- Finished tasks count story points when the board has them, otherwise 1 each.
- Merged code is the changed lines of merged pull requests, without lockfiles
  and without docs or design files. One pull request counts for at most 800
  lines, so a single huge dump cannot dominate.
- Reviews given counts each pull request a person reviewed once, however many
  comments they left.
- Docs and design work is finished tasks owned by a design or docs member, or
  tasks whose pull request only touches docs and design files.
- A quick reply is a first review within 24 hours of the pull request opening.
- A part with fewer than 3 events across the whole team (for example, one
  review in the whole project) is left out, and its weight goes to the other
  parts. Otherwise one event would make one person look like they carry the team.

**Default threshold.** A person is flagged when their combined share, or their
share of finished tasks alone, is above 1.6 times the even share (40% in a
team of 4). Above 2 times the even share it is high severity. A code-role
person is also flagged when their combined share is below 0.4 times the even
share (10% in a team of 4) and they have no docs or design work to show
instead. Workload rules start only once the team has finished 6 tasks.

**Why a normal difference is not flagged.** Teams naturally split work
unevenly by role and by sprint. The band is wide on purpose: from 0.4 to 1.6
times the even share. This band is drawn as the shaded area on the chart, so
the picture and the rule always agree. Design and docs members are judged on
their own tasks, not on code: they are flagged only if they have no finished
task in 21 days and nothing in progress. People who look quiet but are fine
are listed under "Not flagged" with the reason, for example "Fewer code
changes, but owns 3 finished design tasks."

## Review gap

**What it measures.** Whether code is being checked before it merges, and by
whom.

**Why it matters.** Merging without review is how silent bugs and style drift
enter a codebase. A team where one person reviews nothing is one person away
from losing a second pair of eyes entirely.

**How it is computed.** Three checks:

- The share of recently merged pull requests with no review from anyone other
  than the author. Recent means merged in the last 14 days, or all merged pull
  requests when fewer than 5 merged in that time. It needs at least 3 merged
  pull requests to mean anything.
- Whether a code-role person has given zero reviews after teammates merged at
  least 3 pull requests.
- The median hours from a pull request opening to its first review.

**Default threshold.** Unreviewed share above 20% is medium, above 40% is
high. A code-role person with zero reviews given is medium. Median time to
first review above 48 hours is medium.

**Why a normal difference is not flagged.** Design and docs members are not
expected to review code, so they are left out of the reviewer check. One
unreviewed pull request in a small, early project does not trigger anything:
the share needs at least 3 merged pull requests, and the reviewer check waits
until teammates have merged 3.

## Late integration

**What it measures.** Whether code is landing steadily across the project or
piling up right before the deadline.

**Why it matters.** Large, late merges are the highest-risk moment for
conflicts, because there is no time left to fix what goes wrong.

**How it is computed.** The share of all merged lines (additions plus
deletions) that were merged in the last 3 days. On the weekly chart, a week is
amber above 2 times the team's usual week (the median of past weeks) and red
above 3 times.

**Default threshold.** More than 40% of merged lines in the last 3 days is
medium, above 55% is high. Main getting no new commit for 4 days, within 14
days of the deadline, is also medium.

**Why a normal difference is not flagged.** Some back-loading is normal in
any project with a deadline. The rule only fires when the share of late code
is large enough that the team genuinely had no time to catch problems in it,
not whenever a late merge exists at all.

## Open PR age and size

**What it measures.** Pull requests sitting open too long, or too large to
review properly.

**Why it matters.** A pull request open for over a week has usually drifted
from main, making a later conflict more likely, and a very large pull request
is too big for a reviewer to check carefully.

**How it is computed.** Days since the pull request was opened, and its total
changed lines.

**Default threshold.** Open longer than 7 days is medium. Over 800 changed
lines is medium. A pull request that is both gets one risk that says both.

**Why a normal difference is not flagged.** A pull request open for two or
three days while someone is iterating is normal and is not flagged; only pull
requests old enough to risk drifting from main are.

## Branch drift

**What it measures.** How far a branch has fallen behind the current state of
main.

**Why it matters.** The longer a branch sits behind main, the more likely its
changes overlap with work that has already merged elsewhere, and the harder
the eventual merge becomes.

**How it is computed.** Commits behind main, from GitHub's compare endpoint
(or recomputed from commit history for synthetic and replayed snapshots).

**Default threshold.** More than 10 commits behind is medium, more than 25 is
high.

**Why a normal difference is not flagged.** Being a few commits behind is the
normal state of any branch that has been open for a day. The threshold is set
well above that so short-lived, actively worked branches are left alone.

## Deadline projection

**What it measures.** Whether the team is on pace to finish by the deadline,
based on recent throughput.

**Why it matters.** A verdict that only looks backward is not useful to a
mentor or a team member. Projecting forward gives time to react.

**How it is computed.** Tasks finished in the last 7 days set the pace
(points if available, otherwise 1 per task); that pace is projected forward
against the tasks remaining to estimate a finish date.

**Default threshold.** Projected to finish 3 or more days late is medium, 7
or more days late is high. No task finished in the last 7 days while work is
left is medium, because no finish date can be projected.

**Why a normal difference is not flagged.** Weekly throughput naturally
varies. A small projected slip (1 or 2 days) is within normal noise and is
not flagged; only a sustained pace that misses the deadline by a clear margin
is.

## Conflict radar: possible, likely, certain

**What it measures.** The chance that two pieces of in-progress work will
conflict when merged, before either is merged.

**Why it matters.** This is the headline promise of SquadSync: warn before
the conflict happens, not after. Catching it early turns a merge fight into a
five-minute conversation.

**How it is computed.** It compares the files and changed line ranges of every
pair of open branches and pull requests. Line ranges come from each changed
file's diff against main. Ranges closer than 3 lines count as overlapping,
because Git also conflicts on neighbouring lines.

| Situation | Confidence | Severity |
|-----------|------------|----------|
| Same file on two open branches, different lines | Possible | Low |
| Same file, overlapping line ranges | Likely | High |
| GitHub already reports the pull request as conflicting | Certain | High |
| One branch edits a file another deletes or renames | Likely | High |
| Two branches both add a new file at the same path | Likely | High |
| Two branches both change a lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) | Possible | Low |

The lockfile action says to regenerate the file after the first merge, not to
merge it by hand.

**Default threshold.** Any overlap of these kinds is shown; the confidence
word and the severity carry the weight, not a numeric cutoff. Confidence words
are never stronger than what the data actually shows.

**Why a normal difference is not flagged.** Two people working in different
files is normal and produces nothing. Touching the same file on different
lines is only "possible" and low severity, because Git can usually combine
those changes by itself.

## Direct push to main

**What it measures.** Commits that landed on main without a pull request.

**Why it matters.** Nobody reviewed them, and every open branch now has to
absorb a change it did not expect. If the pushed commit touches a file an
open branch also changes, that later merge is the one at risk.

**How it is computed.** Commits on main that are not merges and did not come
through GitHub's merge button. For live repos, commits made in GitHub's web
editor straight to main look like merge-button commits and are missed.

**Default threshold.** Any direct push in the last 14 days while another
branch was open is medium.

**Why a normal difference is not flagged.** Pushes older than 14 days are
history, not a warning, and a push while no other branch is open affects no
one.

## Stale branch and unpushed work

**What it measures.** Work that has an open task but has stopped reaching
GitHub.

**Why it matters.** A task marked in progress with no recent push is often
blocked, or the work sits only on one laptop where nobody can review or merge
it.

**How it is computed.** A stale branch is a branch whose task is still open
(the task id is in the branch name, or the task links to its pull request) and
which has had no push for a while. Unpushed work is a task in progress for a
while with no branch and no pull request at all.

**Default threshold.** Stale branch: no push for 5 days is low, 8 days is
medium. Unpushed work: a task in progress for 5 days with nothing on GitHub is
low.

**Why a normal difference is not flagged.** A branch with no open task is
finished or abandoned, not stale, so it is left alone. Design and docs work
often never touches Git, so unpushed work is not checked for those roles.
Unpushed work is a proxy only: SquadSync reads GitHub and cannot see files on
anyone's laptop. The rule text says so on screen.

## Plan versus reality

**What it measures.** Whether people are working inside the split the team
agreed in the PRD plan.

**Why it matters.** A good split reduces conflicts only if people keep to it.
"Member C edited Member A's folder" is an early sign of the overlap that turns
into a conflict later.

**How it is computed.** Changed files on open branches and on pull requests
merged in the last 14 days are compared with the plan's ownership map: each
module's folders and each shared file have one owner. One risk is raised per
person and module (or per person and shared file).

**Default threshold.** Editing someone else's folder or shared file on an
open branch is medium; in a pull request already merged in the last 14 days,
low.

**Why a normal difference is not flagged.** People are never flagged for
their own folders, and files the plan does not mention are not checked. We
never promise zero conflicts; the plan reduces them.

## Verdict

**What it measures.** One word for the whole team: On track, Slipping or At
risk.

**How it is computed.** Any high-severity risk gives At risk. Otherwise, two
medium risks or any projected deadline slip give Slipping. Otherwise the team
is On track. The sentence under the verdict is the summary of the top risk.

**Why a normal difference is not flagged.** Low-severity risks never change
the verdict on their own, and one medium risk alone keeps the team On track
with "One thing to watch".

## Where AI is used, and how code checks it

AI never decides what is true. It is used in three places, and each one falls
back to code if the AI call fails, is slow, or gives an answer code rejects.

- **Wording.** Risk summaries are rewritten in plainer words. Code keeps an AI
  sentence only if it is one sentence, every number in it appears in that
  risk's evidence, and every person it names appears in the evidence.
  Otherwise the template sentence stays. AI sentences carry a "written by AI"
  tag.
- **Task matching.** For live repos, tasks that no rule could link to a pull
  request (no task id in the branch name, pull request title or commit message)
  are matched by AI. Code keeps a link only above 0.6 confidence, only when the
  pull request's author is the task's assignee, and shows the confidence.
- **PRD splitter.** AI proposes the modules, owners, folders and merge order.
  Code checks the plan (one owner per module, no folder owned twice, shared
  files with one owner, merge order respects dependencies, everyone owns a
  module), repairs what it safely can, and otherwise returns a template plan.
