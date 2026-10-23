import type { Analysis, TeamListItem } from "@/lib/types";
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
