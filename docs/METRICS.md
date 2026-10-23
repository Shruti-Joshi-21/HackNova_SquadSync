# Metrics justification

This document explains every indicator SquadSync computes: what it measures,
why it matters, how it is computed, the default threshold, and why a normal
difference between people is not flagged. Thresholds match
`src/engine/config.ts`.

## Contribution share

**What it measures.** Each person's share of the team's work, split into
tasks finished, merged code (weighted by size, not commit count), reviews
given, and docs and design work.

**Why it matters.** Workload imbalance is a leading cause of late or rushed
projects. Looking at one axis alone (for example, commits) hides who is
actually carrying the team.

**How it is computed.** A weighted composite: finished tasks 30%, merged code
size-weighted 25%, reviews given 20%, docs and design 15%, quick replies 10%.
Code and docs/design roles are compared on their own work, not forced into
one scale: a design-role person is judged on design tasks, not on code they
did not write.

**Default threshold.** Flagged when a person's composite share is above 1.6
times the even share for the team size, or below 0.4 times for a code-role
person with no docs or design work to show instead.

**Why a normal difference is not flagged.** Teams naturally split work
unevenly by role and by sprint. The threshold is wide (1.6x and 0.4x) on
purpose, and the person's own usual range (a shaded band, see Baseline below)
is shown alongside, so a quiet week does not look like a crisis.

## Review gap

**What it measures.** Whether code is being checked before it merges, and by
whom.

**Why it matters.** Merging without review is how silent bugs and style drift
enter a codebase. A team where one person reviews nothing is one person away
from losing a second pair of eyes entirely.

**How it is computed.** Share of merged pull requests with zero reviews,
whether a code-role person has given zero reviews across the project, and the
median hours from PR open to first review.

**Default threshold.** Merged-without-review share above 20% is medium, above
40% is high. A code-role person with zero reviews given is flagged on its
own. Median time to first review above 48 hours is medium.

**Why a normal difference is not flagged.** A design or docs-role person is
not expected to review code pull requests, so they are excluded from the
review-gap rule entirely. A single unreviewed PR in a small, early project is
below the 20% share and does not trigger anything.

## Late integration

**What it measures.** Whether code is landing steadily across the project or
piling up right before the deadline.

**Why it matters.** Large, late merges are the highest-risk moment for
conflicts, because there is no time left to fix what goes wrong.

**How it is computed.** Share of merged lines that landed in the last 3 days
of the analysis window, open PR age in days, and PR size in changed lines.

**Default threshold.** More than 40% of merged lines in the last 3 days is
medium, above 55% is high. An open PR older than 7 days is medium. A PR over
800 changed lines is medium. Main not updated for 4 days near the deadline is
also medium.

**Why a normal difference is not flagged.** Some back-loading is normal in
any project with a deadline. The threshold only fires when the share of late
code is large enough that the team genuinely had no time to catch problems in
it, not whenever a late merge exists at all.

## Open PR age and size

**What it measures.** Pull requests sitting open too long, or too large to
review properly.

**Why it matters.** A PR open for over a week has usually drifted from main,
making a later conflict more likely, and a very large PR is too big for a
reviewer to check carefully.

**How it is computed.** Days since the PR was opened, and its total changed
lines.

**Default threshold.** Open longer than 7 days is medium. Over 800 changed
lines is medium.

**Why a normal difference is not flagged.** A PR open for two or three days
while someone is iterating is normal and is not flagged; only PRs stale
enough to risk drifting from main are.

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
against tasks remaining to estimate a finish date.

**Default threshold.** Projected to finish 3 or more days late is medium, 7
or more days late is high.

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

**How it is computed.** Same file path touched on two open branches or PRs is
"possible". Overlapping changed line ranges in that file is "likely". GitHub
already reporting the PR as not cleanly mergeable is "certain". Confidence
words are never stronger than what the data actually shows.

**Default threshold.** Any detected overlap is surfaced; severity and
confidence (not a numeric cutoff) 