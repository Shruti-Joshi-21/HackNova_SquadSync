// POST /api/plan/check  body { plan, teamId } or { plan, snapshot }, optional owners
// -> Risk[]: plan versus reality ("Member C edited Member A's folder").
// owners maps plan slots to Person ids; by default slot i is team.people[i].

import { getSnapshot } from "../../../../../data/snapshots";
import { normalize } from "@/engine";
import { checkPlan, validatePlan } from "@/engine/plan";
import type { ProjectPlan, RepoSnapshot } from "@/lib/types";

export async function POST(request: Request) {
  let body: { plan?: ProjectPlan; teamId?: unknown; snapshot?: RepoSnapshot; owners?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Send the plan and a teamId or snapshot as JSON." }, { status: 400 });
  }
  const plan = body.plan;
  if (!plan || !Array.isArray(plan.modules) || !Array.isArray(plan.sharedFiles) || typeof plan.teamSize !== "number") {
    return Response.json({ error: "The plan is missing or not in the expected shape." }, { status: 400 });
  }
  if (validatePlan(plan).length > 0) {
    return Response.json({ error: "The plan does not pass its own checks, so make a new one first." }, { status: 400 });
  }

  let snapshot: RepoSnapshot | null = null;
  if (typeof body.teamId === "string") snapshot = getSnapshot(body.teamId);
  else if (body.snapshot && Array.isArray(body.snapshot.branches) && body.snapshot.team) snapshot = body.snapshot;
  if (!snapshot) {
    return Response.json({ error: "Give a known teamId or a snapshot from a pasted repo." }, { status: 400 });
  }
  const owners = Array.isArray(body.owners) && body.owners.every((o) => typeof o === "string") ? (body.owners as string[]) : undefined;

  try {
    return Response.json(checkPlan(plan, normalize(snapshot), owners));
  } catch (err) {
    console.error("POST /api/plan/check failed", err);
    return Response.json({ error: "Could not check the plan." }, { status: 500 });
  }
}
