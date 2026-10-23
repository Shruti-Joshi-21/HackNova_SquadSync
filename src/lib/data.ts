import type { Analysis, ISODate, ProjectPlan, RepoSnapshot, TeamListItem } from "@/lib/types";
import { mockAnalyses, mockTeams } from "@/mocks/analyses";
import { mockPlan } from "@/mocks/plan";

// The single place pages get data from. Runs in the browser and calls the API
// (relative URLs). NEXT_PUBLIC_USE_MOCKS=true switches back to the mock data.
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

class NotFound extends Error {}

async function getJson<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, init);
  } catch {
    throw new Error("Could not reach the server. Check the connection and try again.");
  }
  const body = await res.json().catch(() => null);
  if (res.status === 404) throw new NotFound(body?.error ?? "Not found.");
  if (!res.ok) throw new Error(body?.error ?? `The server answered with an error (${res.status}).`);
  return body as T;
}

export async function getTeams(): Promise<TeamListItem[]> {
  if (USE_MOCKS) return mockTeams;
  return getJson<TeamListItem[]>("/api/teams");
}

/**
 * One team's analysis. Synthetic teams come from GET /api/analyze/[id]; a repo
 * pasted on /connect is re-analysed from the input saved in this browser.
 * Returns null when the team does not exist. Throws with a plain message on errors.
 */
export async function getAnalysis(teamId: string, asOf?: ISODate): Promise<Analysis | null> {
  if (USE_MOCKS) return mockAnalyses[teamId] ?? null;

  const saved = readSavedRepo(teamId);
  if (saved) {
    const r = await connectRepo(saved.input);
    if (r.ok) return r.analysis;
    if (saved.analysis) return saved.analysis; // last good result beats an error screen
    throw new Error(r.error);
  }

  const q = asOf ? `?asOf=${encodeURIComponent(asOf)}` : "";
  try {
    return await getJson<Analysis>(`/api/analyze/${encodeURIComponent(teamId)}${q}`);
  } catch (err) {
    if (err instanceof NotFound) return null;
    throw err;
  }
}

/** "owner/name", "github.com/owner/name" or a full GitHub URL to "owner/name". Null if it is not one. */
export function parseRepo(input: string): string | null {
  const s = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const m =
    s.match(/^(?:https?:\/\/)?(?:www\.)?github\.com\/([\w.-]+)\/([\w.-]+)(?:\/.*)?$/i) ??
    s.match(/^([\w.-]+)\/([\w.-]+)$/);
  return m ? `${m[1]}/${m[2]}` : null;
}

export interface ConnectInput {
  repo: string; // "owner/name"
  deadline: ISODate;
  tasksCsv?: string;
}

export type ConnectResult =
  | { ok: true; snapshot: RepoSnapshot; analysis: Analysis; warnings: string[] }
  | { ok: false; error: string };

/** Analyse a live GitHub repo via POST /api/analyze/github (B5) and remember it in this browser. */
export async function connectRepo(input: ConnectInput): Promise<ConnectResult> {
  let res: Response;
  try {
    res = await fetch("/api/analyze/github", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Check the connection and try again." };
  }
  const body = await res.json().catch(() => null);
  // The route answers with { error } (a 404 means the repo was not found).
  // A 404 or 405 without JSON means the route itself is missing on this deploy.
  if ((res.status === 404 || res.status === 405) && !body?.error) {
    return { ok: false, error: "Live repos are not connected on this deploy. The sample teams still work." };
  }
  if (!res.ok || !body?.analysis) {
    return { ok: false, error: body?.error ?? "Could not analyse this repo." };
  }
  saveRepo(body.analysis.teamId, input, body.analysis);
  // warnings: one plain sentence each about the task CSV (B8), only when there is something to say.
  const warnings = Array.isArray(body.warnings) ? body.warnings.filter((w: unknown) => typeof w === "string") : [];
  return { ok: true, snapshot: body.snapshot, analysis: body.analysis, warnings };
}

/* Pasted repos are kept in localStorage so a reload does not lose them. */

const REPO_KEY = "squadsync.repos";

interface SavedRepo {
  input: ConnectInput;
  analysis?: Analysis;
}

function readRepos(): Record<string, SavedRepo> {
  try {
    return JSON.parse(localStorage.getItem(REPO_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function readSavedRepo(teamId: string): SavedRepo | null {
  if (typeof window === "undefined") return null;
  return readRepos()[teamId] ?? null;
}

function saveRepo(teamId: string, input: ConnectInput, analysis: Analysis) {
  try {
    localStorage.setItem(REPO_KEY, JSON.stringify({ ...readRepos(), [teamId]: { input, analysis } }));
  } catch {
    // storage full or blocked: the result still shows this time
  }
}

/**
 * Split a PRD into a plan. Calls POST /api/plan (B7). A 400 means the input is
 * wrong, so it throws the route's sentence. If the route cannot be reached or
 * fails, returns the sample plan and says so in `note`.
 */
export async function makePlan(prd: string, teamSize: number): Promise<{ plan: ProjectPlan; note?: string }> {
  let res: Response | null = null;
  try {
    res = await fetch("/api/plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prd, teamSize }),
    });
  } catch {
    // fall through to the sample plan
  }
  const body = res ? await res.json().catch(() => null) : null;
  if (res?.ok && body?.modules) return { plan: body as ProjectPlan };
  if (res?.status === 400) throw new Error(body?.error ?? "Check the PRD and the team size.");
  return { plan: mockPlan(teamSize), note: "The splitter did not answer, so this is a sample plan." };
}
