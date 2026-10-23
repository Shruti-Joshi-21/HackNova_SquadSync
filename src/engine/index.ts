// analyze(): one snapshot in, one Analysis out. Pure, no framework imports.

import type { Analysis, ContributionShare, RepoSnapshot, Risk } from "../lib/types";
import { shareBand } from "./baseline";
import { CONFIG, WEIGHTS, Weights } from "./config";
import { mergedPRs, reviewersOf, timeline } from "./indicators";
import { normalize } from "./normalize";
import { radar } from "./radar";
import { context, drafts, finish, notFlagged, sortRisks, verdict } from "./risks";
import * as scene from "./scenes";
import { sliceAsOf } from "./slice";
import { DAY, ms } from "./util";

export interface AnalyzeOptions {
  weights?: Weights;
  /** Analyse the snapshot as it was on this date (replay). */
  asOf?: string;
}

export function analyze(snapshot: RepoSnapshot, opts: AnalyzeOptions = {}): Analysis {
  const weights = opts.weights ?? WEIGHTS;
  const base = normalize(snapshot);
  const s = opts.asOf ? sliceAsOf(base, opts.asOf) : base;
  const c = context(s, weights);

  // Rule risks and radar risks together, one per id, then pictures for the
  // two rule risks that have a scene (late merges, merged without review).
  const all = finish(c, [...drafts(c), ...radar(c)]);
  const unique = [...new Map(all.map((r) => [r.id, r])).values()];
  const risks = sortRisks(unique.map((r) => withScene(r, s)));
  const flaggedForWorkload = new Set(risks.filter((r) => r.kind === "workload_imbalance").flatMap((r) => r.people));
  const band = shareBand(s.team.people.length);

  const shares: ContributionShare[] = c.shares.map((x) => ({
    personId: x.personId,
    tasks: x.tasks,
    code: x.code,
    reviews: x.reviews,
    docsDesign: x.docsDesign,
    composite: x.composite,
    teamUsualRange: band,
    role: s.team.people.find((p) => p.id === x.personId)!.role,
    flagged: flaggedForWorkload.has(x.personId),
  }));

  return {
    teamId: s.team.id,
    team: s.team,
    asOf: s.asOf,
    ...verdict(risks),
    schedule: c.schedule,
    shares,
    reviews: c.reviews,
    timeline: timeline(s),
    lateMergeShare: c.late,
    risks,
    notFlagged: notFlagged(c, risks),
  };
}

function withScene(r: Risk, s: RepoSnapshot): Risk {
  if (r.scene) return r;
  if (r.id === "late_integration-share") {
    const cutoff = ms(s.asOf) - CONFIG.late.windowDays * DAY;
    const late = mergedPRs(s)
      .filter((p) => ms(p.mergedAt!) >= cutoff)
      .sort((a, b) => ms(a.mergedAt!) - ms(b.mergedAt!));
    const daysLeft = Math.max(0, Math.floor((ms(s.team.deadline) - ms(s.asOf)) / DAY));
    const share = r.title.split(" ")[0];
    return {
      ...r,
      scene: scene.lateMerge(late, r.severity === "high" ? "conflict" : "warning", `${daysLeft} days left`,
        `${share} of merged code landed in the last ${CONFIG.late.windowDays} days. That leaves little time to fix conflicts.`),
    };
  }
  if (r.id === "review_gap-unreviewed") {
    const pr = mergedPRs(s)
      .filter((p) => reviewersOf(p).size === 0)
      .sort((a, b) => ms(b.mergedAt!) - ms(a.mergedAt!))[0];
    if (pr) {
      return { ...r, scene: scene.noReview(pr, `PR #${pr.number} was merged with no review. Nobody else has read this code.`) };
    }
  }
  return r;
}

export { buildSnapshot, normalize } from "./normalize";
export { sliceAsOf } from "./slice";
export { WEIGHTS, CONFIG } from "./config";
