// GET /api/teams -> TeamListItem[] for the synthetic teams, worst verdict first.

import { SNAPSHOTS } from "../../../../data/snapshots";
import { analyze } from "@/engine";
import type { TeamListItem, Verdict } from "@/lib/types";

const ORDER: Record<Verdict, number> = { at_risk: 0, slipping: 1, on_track: 2 };

export async function GET() {
  try {
    const teams: TeamListItem[] = Object.values(SNAPSHOTS).map((snapshot) => {
      const a = analyze(snapshot);
      return {
        id: a.teamId,
        name: a.team.name,
        verdict: a.verdict,
        verdictReason: a.verdictReason,
        riskCount: a.risks.length,
      };
    });
    teams.sort((x, y) => ORDER[x.verdict] - ORDER[y.verdict] || y.riskCount - x.riskCount);
    return Response.json(teams);
  } catch (err) {
    console.error("GET /api/teams failed", err);
    return Response.json({ error: "Could not analyse the teams." }, { status: 500 });
  }
}
