// The synthetic teams, imported as JSON so they are bundled into every
// serverless function (no file reads at request time).

import type { RepoSnapshot } from "../../src/lib/types";
import atlas from "./atlas.json";
import nexus from "./nexus.json";
import orbit from "./orbit.json";
import zenith from "./zenith.json";

export const SNAPSHOTS: Record<string, RepoSnapshot> = {
  nexus: nexus as RepoSnapshot,
  atlas: atlas as RepoSnapshot,
  orbit: orbit as RepoSnapshot,
  zenith: zenith as RepoSnapshot,
};

export function getSnapshot(teamId: string): RepoSnapshot | null {
  return Object.hasOwn(SNAPSHOTS, teamId) ? SNAPSHOTS[teamId] : null;
}
