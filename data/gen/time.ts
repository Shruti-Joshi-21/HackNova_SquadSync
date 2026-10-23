// Dates are handled as milliseconds and written as ISO strings in UTC.

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** "2026-10-14" (noon UTC) or a full ISO string to milliseconds. */
export function t(s: string): number {
  return Date.parse(s.length === 10 ? `${s}T12:00:00Z` : s);
}

/** Milliseconds to an ISO string rounded to the minute, without millis. */
export function iso(ms: number): string {
  const rounded = Math.round(ms / MINUTE) * MINUTE;
  return new Date(rounded).toISOString().replace(/\.\d{3}Z$/, "Z");
}

/** Round to the minute, so values match what iso() writes. */
export function minute(ms: number): number {
  return Math.round(ms / MINUTE) * MINUTE;
}
