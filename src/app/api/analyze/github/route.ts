// POST /api/analyze/github  body { repo, deadline, projectStart?, tasksCsv? }
// -> { snapshot, analysis }. Pulls the repo live from GitHub with the server's
// token, analyses it, and keeps nothing.

import { analyzeWithAi } from "@/engine/ai";
import { complete } from "@/lib/llm";
import { GitHubError } from "@/lib/github/client";
import { MAX_CSV_CHARS, applyTasksCsv } from "@/lib/github/board";
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
  if (body.tasksCsv !== undefined && body.tasksCsv !== null && typeof body.tasksCsv !== "string") {
    return bad("tasksCsv must be the text of a CSV file.");
  }
  if (typeof body.tasksCsv === "string" && body.tasksCsv.length > MAX_CSV_CHARS) {
    return bad("The task CSV is too big, so keep it under 500 KB.");
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
    // A task CSV replaces GitHub issues as the task board.
    let snapshot = raw;
    let warnings: string[] = [];
    if (typeof body.tasksCsv === "string" && body.tasksCsv.trim()) {
      ({ snapshot, warnings } = applyTasksCsv(raw, body.tasksCsv));
    }
    // AI links tasks no rule could link, then words the summaries; both fall back to code.
    const result = await analyzeWithAi({ ...snapshot, source: "github" }, complete, { match: true, words: true });
    return Response.json(warnings.length > 0 ? { ...result, warnings } : result);
  } catch (err) {
    if (err instanceof GitHubError) {
      return Response.json({ error: err.message, ...(err.resetAt ? { resetAt: err.resetAt } : {}) }, { status: err.status });
    }
    console.error("POST /api/analyze/github failed", err);
    return bad("Could not analyse this repo.", 500);
  }
}
