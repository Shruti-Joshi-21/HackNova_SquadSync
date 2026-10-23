// GET /api/analyze/[teamId]?asOf= -> Analysis for one synthetic team.
// asOf (a date or ISO time) replays the team as it was then.

import type { NextRequest } from "next/server";
import { getSnapshot } from "../../../../../data/snapshots";
import { analyze } from "@/engine";

export async function GET(request: NextRequest, ctx: RouteContext<"/api/analyze/[teamId]">) {
  const { teamId } = await ctx.params;
  const snapshot = getSnapshot(teamId);
  if (!snapshot) {
    return Response.json({ error: `No team called "${teamId}".` }, { status: 404 });
  }

  const raw = request.nextUrl.searchParams.get("asOf");
  let asOf: string | undefined;
  if (raw) {
    const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(raw);
    const parsed = Date.parse(dateOnly ? `${raw}T23:59:00Z` : raw);
    if (Number.isNaN(parsed)) {
      return Response.json({ error: `asOf "${raw}" is not a date. Use YYYY-MM-DD or an ISO time.` }, { status: 400 });
    }
    const start = Date.parse(snapshot.team.projectStart);
    const latest = Date.parse(snapshot.asOf);
    // A plain date means "end of that day", but never later than the data goes.
    const t = dateOnly && raw === snapshot.asOf.slice(0, 10) ? Math.min(parsed, latest) : parsed;
    if (t < start || t > latest) {
      return Response.json(
        { error: `asOf must be between ${snapshot.team.projectStart.slice(0, 10)} and ${snapshot.asOf.slice(0, 10)}.` },
        { status: 400 },
      );
    }
    asOf = new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
  }

  try {
    return Response.json(analyze(snapshot, { asOf }));
  } catch (err) {
    console.error(`GET /api/analyze/${teamId} failed`, err);
    return Response.json({ error: "Could not analyse this team." }, { status: 500 });
  }
}
