// What "usual" means for a team: compared with itself, never with a fixed number.

import { CONFIG } from "./config";
import { median } from "./util";

export interface UsualRange {
  median: number;
  /** Median absolute deviation: how far a typical value sits from the median. */
  spread: number;
}

export function usualRange(values: number[]): UsualRange {
  const m = median(values) ?? 0;
  const spread = median(values.map((v) => Math.abs(v - m))) ?? 0;
  return { median: m, spread };
}

/**
 * The band a person's combined share can sit in without being flagged:
 * from 0.4 to 1.6 times the even share. It is the shaded band on the chart,
 * so the picture and the rule always agree.
 */
export function shareBand(teamSize: number): [number, number] {
  const even = 1 / teamSize;
  return [even * CONFIG.workload.lowShare, even * CONFIG.workload.highShare];
}

/** Code and mixed roles are judged on code; design and docs on their own work. */
export function judgedOnCode(role: string): boolean {
  return role === "code" || role === "mixed";
}
