// POST /api/analyze/github  body { repo, deadline, projectStart?, tasksCsv? }
// -> { snapshot, analysis }. Pulls the repo live from GitHub with the server's
// token, analyses it, and keeps nothing.

import { analyze, buildSnapshot } from "@/engine";
import { GitHubError } from "@/lib/github/client";
import { fetchSnapshot, parseRepo } from "@/lib/github/ingest";

// A paste makes about 100 requests to GitHub; give it time.
export const maxDuration = 60;

interface Body {
  repo?: unknown;
  deadline?: unknown;
  projectStart?: unknown;
  tasksCsv?: unknown;
}

const bad = (error: string, status = 400) => Response.json({ error }, { status });

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return bad("Send the repo and the deadline as JSON.");
  }

  if (typeof body.repo !== "string" || !parseRepo(body.repo)) {
    return bad("Give the repo as owner/name or a github.com link.");
  }
  if (typeof body.deadline !== "string" || Number.isNaN(Date.parse(body.deadline))) {
    return bad("Give the project deadline as a date, like 2026-11-01.");
  }
  if (body.projectStart !== undefined && (typeof body.projectStart !== "string" || Number.isNaN(Date.parse(body.projectStart)))) {
    return bad("projectStart must be a date, like 2026-09-07.");
  }
  if (typeof body.projectStart === "string" && Date.parse(body.projectStart) >= Date.parse(body.deadline)) {
    return bad("The project start must be before the deadline.");
  }

  try {
    const raw = await fetchSnapshot({
      repo: body.repo,
      deadline: body.deadline,
      projectStart: typeof body.projectStart === "string" ? body.projectStart : undefined,
    });
    // tasksCsv is accepted but not used yet: the CSV import (csv.ts) is wired in B8.
    const snapshot = buildSnapshot(raw, "github");
    return Response.json({ snapshot, analysis: analyze(snapshot) });
  } catch (err) {
    if (err instanceof GitHubError) {
      return Response.json({ error: err.message, ...(err.resetAt ? { resetAt: err.resetAt } : {}) }, { status: err.status });
    }
    console.error("POST /api/analyze/github failed", err);
    return bad("Could not analyse this repo.", 500);
  }
}
