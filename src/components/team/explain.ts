import type { Confidence, RiskKind, Severity } from "@/lib/types";

// Plain-English notes for the evidence drawer, written for someone who has never used Git.
// meaning: what we saw. why: why a team should care. source: where the numbers come from.
// notProof: what the flag does not say, so normal differences are not read as blame.

export interface Explain {
  meaning: string;
  why: string;
  source: string;
  notProof: string;
}

const PR = "pull requests (the step where code is sent in to be checked and joined to the main version)";

export const EXPLAIN: Record<RiskKind, Explain> = {
  workload_imbalance: {
    meaning: "One person is carrying a much bigger part of the work than an even split would give them.",
    why: "If that person is ill or stuck, the project stops. The rest of the team also learns less of the code.",
    source: "Finished tasks from the task board, plus merged code, reviews, docs and design from GitHub. Commit count is not used.",
    notProof:
      "It does not mean others are lazy. Someone may be doing design, research or helping in ways the data cannot see. Talk before judging.",
  },
  review_gap: {
    meaning: `Code is being joined to the project without a second person reading it first, or one person never reads anyone else's ${PR}.`,
    why: "A second reader catches mistakes early and makes sure more than one person understands each part.",
    source: "Reviews recorded on each pull request in GitHub.",
    notProof:
      "It does not mean the code is bad. Small fixes are often merged without review. It means nobody checked, so nobody can say.",
  },
  late_integration: {
    meaning: "A lot of work is being joined to the main version very late, or one change has been waiting a long time.",
    why: "When pieces are joined at the last moment, there is no time left to find out they do not fit together.",
    source: "The date and size of every merged and open pull request in GitHub.",
    notProof: "Some large changes are fine, for example adding a library. It is the timing close to the deadline that is the risk.",
  },
  deadline_slip: {
    meaning: "At the speed tasks were finished last week, the remaining tasks will not be done by the deadline.",
    why: "Knowing early leaves time to cut scope or ask for help, instead of finding out on the last night.",
    source: "Tasks finished in the last 7 days and tasks still open, from the task board.",
    notProof: "It is a projection, not a fact. A slow week of planning or exams can make it look worse than it is.",
  },
  same_file_overlap: {
    meaning: "Two people are changing the same file on separate copies of the code at the same time.",
    why: "When both copies are joined, the changes may clash and someone has to sort it out by hand.",
    source: "The list of changed files on each open branch, compared with main.",
    notProof: "Different parts of one file usually join cleanly. This is an early heads-up, not a clash yet.",
  },
  same_line_overlap: {
    meaning: "Two people changed the same lines of the same file on separate copies of the code.",
    why: "Git cannot decide which version to keep, so the second person to join will be stopped until they fix it by hand.",
    source: "The exact changed lines on each open branch, compared with main.",
    notProof: "Neither person did anything wrong. It means they should talk and agree whose change goes in first.",
  },
  pr_conflicting: {
    meaning: "GitHub itself says this pull request cannot be joined to main as it is.",
    why: "It is blocked until someone fixes the clash, and the longer it waits the bigger the fix gets.",
    source: "GitHub's own merge check on the pull request.",
    notProof: "This is normal in busy projects. It only becomes a problem if it is left for days.",
  },
  modify_delete_conflict: {
    meaning: "One person deleted or moved a file while another person is still editing it.",
    why: "When both are joined, Git cannot keep the file and remove it at once, so the join will stop.",
    source: "The changed and removed files on each open branch, compared with main.",
    notProof: "Both may be right on their own. They need to agree whether the file stays.",
  },
  add_add_conflict: {
    meaning: "Two people created a new file with the same name in the same place.",
    why: "Only one can win, so the second join will stop until someone merges the two files by hand.",
    source: "The new files on each open branch, compared with main.",
    notProof: "It usually means two people solved the same problem. Pick one and drop the other.",
  },
  branch_drift: {
    meaning: "This separate copy of the code has fallen far behind the main version.",
    why: "The further behind it is, the more it has to catch up at once, and the more likely something breaks.",
    source: "How many commits the branch is behind and ahead of main, from GitHub.",
    notProof: "A long feature can be fine if it pulls in main from time to time.",
  },
  direct_push_to_main: {
    meaning: "Code was put straight into the main version, without a pull request and without anyone checking it.",
    why: "Nobody reviewed it, and everyone with open work now has to fit around a change they did not see coming.",
    source: "Commits on main that did not come through a pull request, from GitHub.",
    notProof: "A quick fix before a demo is common. It is worth a word so the team agrees when it is allowed.",
  },
  stale_branch: {
    meaning: "A task is marked as in progress, but its code has not been updated for several days.",
    why: "The task may be stuck, or the work may be sitting only on someone's laptop where nobody else can see it.",
    source: "The last push to the branch from GitHub, matched to the open task on the board.",
    notProof: "The person may be busy with other work or exams. Ask if they need help, not why they are slow.",
  },
  lockfile_overlap: {
    meaning: "Two people both changed the file that records which libraries the project uses.",
    why: "This file clashes easily and is hard to fix by hand. Done wrong, the app may stop installing.",
    source: "The changed files on each open branch, compared with main.",
    notProof: "It is common and usually fixed by re-running the install after joining. One person should own it.",
  },
  unpushed_work: {
    meaning: "A task shows activity, but no matching code has reached GitHub yet.",
    why: "Work that is only on one laptop can be lost, and nobody else can build on it.",
    source: "Task status from the board, compared with branches in GitHub. This is a guess, not a measurement.",
    notProof: "The person may simply be working in a way we cannot see. Ask first.",
  },
  task_code_mismatch: {
    meaning: "The code someone changed does not match the work they were given in the plan or on the board.",
    why: "Two people may end up doing the same thing, or a planned part may be left without an owner.",
    source: "The task board or the team plan, compared with the files each person changed in GitHub.",
    notProof: "Plans change, and helping a teammate is good. The team just needs to update who owns what.",
  },
};

export const SEVERITY_MEANS: Record<Severity, string> = {
  high: "Act on this today. Left alone, it is likely to cost the team time before the deadline.",
  medium: "Worth fixing this week. It is not blocking yet, but it is heading that way.",
  low: "Good to know. Keep an eye on it.",
};

export const CONFIDENCE_MEANS: Record<Confidence, string> = {
  certain: "Certain: GitHub itself reports the clash.",
  likely: "Likely: the two changes overlap in a way that usually clashes, but GitHub has not reported it yet.",
  possible: "Possible: the same file was changed in two places. It may still join cleanly.",
};

// What fixing the risk prevents, for "Do these this week". One short phrase.
export const PREVENTS: Record<RiskKind, string> = {
  workload_imbalance: "one person becoming the only one who can finish the project",
  review_gap: "mistakes reaching the main version with nobody having read them",
  late_integration: "parts that do not fit together on the last day",
  deadline_slip: "finding out on the last night that the work will not be done",
  same_file_overlap: "a clash when both changes are joined",
  same_line_overlap: "the second merge being stopped by a conflict",
  pr_conflicting: "a blocked pull request that gets harder to fix each day",
  modify_delete_conflict: "the merge stopping because one side deleted the file",
  add_add_conflict: "two versions of the same new file fighting at merge time",
  branch_drift: "a huge catch-up merge that breaks things",
  direct_push_to_main: "unreviewed changes surprising everyone with open work",
  stale_branch: "a stuck task, or work lost on one laptop",
  lockfile_overlap: "an app that stops installing after the merge",
  unpushed_work: "work lost on one laptop",
  task_code_mismatch: "two people doing the same part, or a part with no owner",
};

// Steps after the risk's own action, so "What to do" reads as a short sequence.
// The first step is always the engine's action for this exact risk.
export const NEXT_STEPS: Record<RiskKind, string[]> = {
  workload_imbalance: [
    "Move one open task from the busiest person to someone with less on their plate.",
    "Check this page again in a few days: the shares should move closer to the even line.",
  ],
  review_gap: [
    "Agree a simple rule: every pull request gets one reviewer before it is merged.",
    "Check again after the next merges: the review count should go up.",
  ],
  late_integration: [
    "Split large changes into smaller pull requests and merge them as they are ready.",
    "Check the weekly bars: they should stay inside the grey band.",
  ],
  deadline_slip: [
    "Pick the tasks that can be dropped or made smaller, and agree on them today.",
    "Check the projected finish next week: it should move before the deadline.",
  ],
  same_file_overlap: [
    "Decide who merges first, and the second person pulls main before merging.",
    "Check again after the first merge: the warning should go away.",
  ],
  same_line_overlap: [
    "After the second merge, run the app and check both changes still work.",
    "Check again after the first merge: the warning should go away.",
  ],
  pr_conflicting: [
    "Pull main into the branch and fix the clash by hand, with the other author nearby.",
    "Check the pull request on GitHub: it should say it can be merged.",
  ],
  modify_delete_conflict: [
    "Whoever merges second pulls main first and moves their edits to where the code now lives.",
    "Check again after both merge: the warning should go away.",
  ],
  add_add_conflict: [
    "Keep one version of the file and delete the other before merging.",
    "Check again after both merge: the warning should go away.",
  ],
  branch_drift: [
    "Pull main into the branch now, and then every day until it is merged.",
    "Check again tomorrow: the number of commits behind should drop.",
  ],
  direct_push_to_main: [
    "Turn on branch protection for main on GitHub so changes go through pull requests.",
    "Ask the people with open branches to pull main.",
  ],
  stale_branch: [
    "Push whatever is done, even if unfinished, so others can see it.",
    "If the person is stuck, pair them with a teammate for an hour.",
  ],
  lockfile_overlap: [
    "One person owns the lockfile; others re-run the install after pulling main.",
    "Check that the app still installs after the merge.",
  ],
  unpushed_work: [
    "Push the work to a branch today, even if it is not finished.",
    "Check again tomorrow: the warning should go away.",
  ],
  task_code_mismatch: [
    "Update the plan or the task board so it says who really owns each part.",
    "Check the plan page again: everyone should own a module.",
  ],
};
