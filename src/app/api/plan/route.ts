// POST /api/plan  body { prd, teamSize } -> ProjectPlan
// AI proposes the split; code checks and repairs it, or returns the template plan.

import { planFrom } from "@/engine/plan";
import { complete } from "@/lib/llm";

// A plan answer is longer than a sentence; give the model time.
export const maxDuration = 30;

export async function POST(request: Request) {
  let body: { prd?: unknown; teamSize?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Send the PRD and the team size as JSON." }, { status: 400 });
  }
  const prd = typeof body.prd === "string" ? body.prd.trim() : "";
  const teamSize = Number(body.teamSize);
  if (prd.length < 20) {
    return Response.json({ error: "Paste a PRD of at least a few sentences." }, { status: 400 });
  }
  if (prd.length > 20_000) {
    return Response.json({ error: "The PRD is too long, so keep it under 20,000 characters." }, { status: 400 });
  }
  if (!Number.isInteger(teamSize) || teamSize < 2 || teamSize > 8) {
    return Response.json({ error: "Team size must be a whole number from 2 to 8." }, { status: 400 });
  }
  try {
    return Response.json(await planFrom(prd, teamSize, complete));
  } catch (err) {
    console.error("POST /api/plan failed", err);
    return Response.json({ error: "Could not make a plan." }, { status: 500 });
  }
}
