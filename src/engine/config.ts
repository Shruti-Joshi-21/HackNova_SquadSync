// Every threshold and weight the engine uses. Nothing is hard-coded elsewhere.
// Each value is justified in docs/METRICS.md.

export interface Weights {
  tasks: number;
  code: number;
  reviews: number;
  docsDesign: number;
  quickReplies: number;
}

/** Fair contribution. Commit count has no weight at all. */
export const WEIGHTS: Weights = {
  tasks: 0.3,
  code: 0.25,
  reviews: 0.2,
  docsDesign: 0.15,
  quickReplies: 0.1,
};

export const CONFIG = {
  workload: {
    /** Flag above this many times the even share (1 / team size). */
    highShare: 1.6,
    /** High severity above this many times the even share. */
    veryHighShare: 2.0,
    /** Flag a code-role member below this many times the even share. */
    lowShare: 0.4,
    /** A part (reviews, say) with fewer events than this across the team is left out of the combined share. */
    minPartEvents: 3,
    /** Workload rules wait until the team has finished this many tasks. */
    minDoneTasks: 6,
    /** One PR counts for at most this many lines, so one huge dump does not dominate. */
    codeLinesCapPerPR: 800,
    /** A design or docs member is flagged only with no finished task in this many days and nothing in progress. */
    ownWorkDays: 21,
  },
  review: {
    /** Window for "recently merged" PRs. */
    recentDays: 14,
    /** Use all merged PRs when fewer than this many merged recently. */
    minRecentMerged: 5,
    /** The unreviewed share needs at least this many merged PRs to mean anything. */
    minMergedForShare: 3,
    unreviewedMedium: 0.2,
    unreviewedHigh: 0.4,
    /** A code-role member with zero reviews is flagged once others have merged this many PRs. */
    minOthersMergedForReviewer: 3,
    firstReviewHoursMedium: 48,
    /** A review within this many hours of the PR opening counts as a quick reply. */
    quickReplyHours: 24,
  },
  late: {
    windowDays: 3,
    shareMedium: 0.4,
    shareHigh: 0.55,
    openPRDays: 7,
    bigPRLines: 800,
    /** Main without a commit for this many days ... */
    mainQuietDays: 4,
    /** ... while the deadline is this close. */
    nearDeadlineDays: 14,
  },
  deadline: {
    paceDays: 7,
    lateMedium: 3,
    lateHigh: 7,
  },
  radar: {
    /** Changed line ranges closer than this many lines count as overlapping (Git conflicts on neighbouring lines too). */
    lineGap: 3,
    driftMedium: 10,
    driftHigh: 25,
    /** No push for this many days while the branch's task is open. */
    staleLow: 5,
    staleMedium: 8,
    /** A task in progress this many days with no branch and no PR. */
    unpushedDays: 5,
    /** Direct pushes to main older than this are history, not a warning. */
    directPushDays: 14,
  },
  ai: {
    /** An AI task-to-PR link is used only above this confidence. */
    minLinkConfidence: 0.6,
    maxTasksToMatch: 40,
    maxPRsToMatch: 40,
    /** AI sentences longer than this are thrown away. */
    maxSentenceChars: 220,
  },
  timeline: {
    /** A week is "warning" above this many times the usual week, "danger" above the second. */
    warningRatio: 2,
    dangerRatio: 3,
  },
} as const;

/** Paths that are lockfiles: not counted as code anyone wrote. */
export const LOCKFILES = ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"];

/** Paths that count as docs and design work instead of code. */
export function isDocsDesignPath(path: string): boolean {
  return /^(docs|design)\//.test(path) || path.startsWith("src/styles/") || /\.(md|fig|sketch)$/i.test(path);
}

export function isLockfile(path: string): boolean {
  return LOCKFILES.some((name) => path === name || path.endsWith(`/${name}`));
}
