// Small helpers shared by the engine files.

import type { ISODate, Team } from "../lib/types";

export const HOUR = 3_600_000;
export const DAY = 24 * HOUR;

export const ms = (d: ISODate): number => Date.parse(d);

export function iso(t: number): ISODate {
  return new Date(t).toISOString().replace(/\.\d{3}Z$/, "Z");
}

export function sum<T>(list: T[], f: (x: T) => number): number {
  return list.reduce((a, x) => a + f(x), 0);
}

export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 1 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** 0.4619 -> "46%" */
export function pct(x: number): string {
  return `${Math.round(x * 100)}%`;
}

/** 1240 -> "1,240" */
export function num(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** "2026-11-06T12:00:00Z" -> "6 Nov" */
export function day(d: ISODate): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const date = new Date(d);
  return `${date.getUTCDate()} ${months[date.getUTCMonth()]}`;
}

export function plural(n: number, word: string): string {
  return `${num(n)} ${word}${n === 1 ? "" : "s"}`;
}

export function nameOf(team: Team, personId: string): string {
  return team.people.find((p) => p.id === personId)?.displayName ?? "Unknown member";
}
