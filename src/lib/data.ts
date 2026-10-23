import type { Analysis, ISODate, RepoSnapshot, TeamListItem } from "@/lib/types";
import { mockAnalyses, mockTeams } from "@/mocks/analyses";

// The single place pages get data from. Mock data until the API (B4) is live;
// A5 flips this flag and fills in the fetch calls.
const USE_MOCKS = true;

export async function getAnalysis(teamId: string): Promise<Analysis | null> {
  if (USE_MOCKS) return mockAnalyses[teamId] ?? null;
  return null;
}

export async function getTeams(): Promise<TeamListItem[]> {
  if (USE_MOCKS) return mockTeams;
  return [];
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
  | { ok: true; snapshot: RepoSnapshot; analysis: Analysis }
  | { ok: false; error: string };

/** Analyse a live GitHub repo. Calls POST /api/analyze/github once B5 exists (A5). */
export async function connectRepo(input: ConnectInput): Promise<ConnectResult> {
  void input;
  return { ok: false, error: "Live repos are not connected yet. The sample teams work now." };
}
