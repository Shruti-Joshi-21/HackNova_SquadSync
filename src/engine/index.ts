// analyze(): one snapshot in, one Analysis out. Pure, no framework imports.

import type { Analysis, ContributionShare, RepoSnapshot } from "../lib/types";
import { shareBand } from "./baseline";
import { WEIGHTS, Weights } from "./config";
import { timeline } from "./indicators";
import { normalize } from "./normalize";
import { context, drafts, finish, notFlagged, sortRisks, verdict } from "./risks";
import { sliceAsOf } from "./slice";

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

  const risks = sortRisks(finish(c, drafts(c)));
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

export { buildSnapshot, normalize } from "./normalize";
export { sliceAsOf } from "./slice";
export { WEIGHTS, CONFIG } from "./config";
