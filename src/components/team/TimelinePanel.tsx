import type { Analysis, WeekSummary } from "@/lib/types";
import { Panel, Tag, pct } from "@/components/ui";

const BAR_COLOR: Record<WeekSummary["status"], string> = {
  ok: "var(--g-main)",
  warning: "var(--warning)",
  danger: "var(--danger)",
  future: "transparent",
};

// When code landed: merged lines per week against the usual band, then open
// PRs that were flagged for age or size.
export default function TimelinePanel({ a }: { a: Analysis }) {
  const weeks = a.timeline;
  const past = weeks.filter((w) => w.status !== "future").map((w) => w.mergedLines).sort((x, y) => x - y);
  const median = past.length ? past[Math.floor(past.length / 2)] : 0;
  const usualTop = median * 2; // the engine warns above 2x the median week
  const max = Math.max(1, usualTop, ...weeks.map((w) => w.mergedLines)) * 1.1;
  const H = 120;
  const y = (v: number) => (v / max) * H;
  const openPRs = a.risks.filter((r) => r.kind === "late_integration" && r.evidence.some((e) => e.ref?.type === "pr") && r.id.includes("-pr-"));

  return (
    <Panel title="When code landed" className="md:col-span-2 xl:col-span-1">
      <div className="relative" style={{ height: H + 36 }}>
        <div
          className="absolute inset-x-0 bg-surface-2"
          style={{ bottom: 20, height: y(usualTop) }}
          aria-hidden
        />
        <div className="absolute inset-x-0 flex items-end gap-1" style={{ bottom: 20, height: H + 16 }}>
          {weeks.map((w) => (
            <div key={w.weekIndex} className="flex flex-1 flex-col items-center justify-end">
              <span className="mb-0.5 font-mono text-xs text-muted">
                {w.status === "future" ? "" : w.mergedLines.toLocaleString("en-GB")}
              </span>
              <div
                className={`w-full max-w-7 rounded-t-sm ${w.status === "future" ? "border border-dashed border-border-strong" : ""}`}
                style={{ height: w.status === "future" ? 8 : Math.max(1, y(w.mergedLines)), background: BAR_COLOR[w.status] }}
              />
            </div>
          ))}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex gap-1">
          {weeks.map((w) => (
            <span key={w.weekIndex} className="flex-1 text-center font-mono text-xs text-subtle">
              {w.label}
            </span>
          ))}
        </div>
      </div>
      <p className="mt-2 text-xs text-muted">Lines of code joined each week. The grey band is a normal week.</p>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-muted">Joined in the last 3 days</span>
        <span className="flex items-center gap-2 font-semibold">
          {pct(a.lateMergeShare)}
          {a.lateMergeShare > 0.55 ? <Tag tone="danger">High</Tag> : a.lateMergeShare > 0.4 ? <Tag tone="warning">Medium</Tag> : null}
        </span>
      </div>

      <h3 className="mt-5 text-xs text-subtle">Open pull requests that are old or very large</h3>
      {openPRs.length === 0 ? (
        <p className="mt-1 text-muted">None.</p>
      ) : (
        <ul className="mt-1 divide-y divide-border">
          {openPRs.map((r) => (
            <li key={r.id} className="flex justify-between py-1.5">
              <span>{r.title}</span>
              <span className="font-mono text-muted">{r.evidence.find((e) => e.label === "Changed lines")?.value} lines</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
