import type { Confidence, Severity, Verdict } from "@/lib/types";

// Small shared pieces: status tags, panels, number formatting.

export type Tone = "success" | "danger" | "warning" | "neutral";

// Status shows in the text colour only: a plain border, no tinted background.
const TONE_CLASS: Record<Tone, string> = {
  success: "text-success",
  danger: "text-danger",
  warning: "text-warning",
  neutral: "text-muted",
};

export function Tag({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded border border-border px-1.5 text-xs whitespace-nowrap ${TONE_CLASS[tone]}`}
    >
      {children}
    </span>
  );
}

export const SEVERITY: Record<Severity, { word: string; tone: Tone }> = {
  high: { word: "High", tone: "danger" },
  medium: { word: "Medium", tone: "warning" },
  low: { word: "Low", tone: "neutral" },
};

export const CONFIDENCE_WORD: Record<Confidence, string> = {
  possible: "Possible",
  likely: "Likely",
  certain: "Certain",
};

export const VERDICT: Record<Verdict, { word: string; text: string }> = {
  on_track: { word: "On track", text: "text-success" },
  slipping: { word: "Slipping", text: "text-warning" },
  at_risk: { word: "At risk", text: "text-danger" },
};

export function Panel({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-md border border-border bg-surface ${className}`}>
      <h2 className="border-b border-border px-5 py-3 font-semibold">{title}</h2>
      <div className="p-5">{children}</div>
    </section>
  );
}

export const pct = (x: number) => `${Math.round(x * 100)}%`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" });
