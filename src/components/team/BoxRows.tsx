import { CheckIcon, CheckboxIcon, GitMergeIcon } from "@primer/octicons-react";
import type { BoxIcon, BoxSpec } from "./boxSpec";

const ICON: Record<BoxIcon, typeof CheckIcon> = { task: CheckboxIcon, review: CheckIcon, merge: GitMergeIcon };
const MAX_UNITS = 24; // a row never draws more squares than this; the number shows the real count

// One 26px square per unit, empty dashed slots up to the fair share, and the
// count on the right. Squares pop in one by one; see boxrows.css.
export default function BoxRows({ spec }: { spec: BoxSpec }) {
  const Icon = ICON[spec.icon];
  let order = 0; // pop-in order across all rows
  const delay = () => ({ animationDelay: `${order++ * 70}ms` });

  return (
    <div>
      <ul className="divide-y divide-border border-y border-border">
        {spec.rows.map((r, i) => {
          const tone = r.flagged ? (spec.flagMode === "extra" ? "text-warning" : "text-danger") : "";
          const shown = Math.min(r.count, MAX_UNITS);
          const missing = Math.max(0, spec.fair - r.count);
          return (
            <li key={i} className="flex items-center gap-3 py-3">
              <span className="flex w-28 shrink-0 items-center gap-2">
                {r.avatar && (
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border-strong text-xs font-semibold">
                    {r.avatar}
                  </span>
                )}
                <span className={`font-semibold ${tone}`}>{r.label}</span>
              </span>

              <span className="flex min-w-0 flex-1 flex-wrap gap-1.5" aria-hidden>
                {Array.from({ length: shown }, (_, k) => {
                  const extra = r.flagged && spec.flagMode === "extra" && k >= spec.fair;
                  return (
                    <span
                      key={k}
                      style={delay()}
                      className={`bx-unit flex h-[26px] w-[26px] items-center justify-center rounded ${
                        extra ? "bg-warning-bg text-warning" : "bg-success-bg text-success"
                      }`}
                    >
                      <Icon size={14} />
                    </span>
                  );
                })}
                {Array.from({ length: missing }, (_, k) => {
                  const loud = r.flagged && spec.flagMode === "missing";
                  return (
                    <span
                      key={`m${k}`}
                      style={delay()}
                      className={`bx-unit h-[26px] w-[26px] rounded border border-dashed ${
                        loud ? "bx-pulse border-danger bg-danger-bg" : "border-border-strong"
                      }`}
                    />
                  );
                })}
              </span>

              <span className={`w-8 shrink-0 text-right text-xl font-semibold ${tone}`}>{r.count}</span>
              <span className="sr-only">
                {r.label}: {r.count}, fair share about {spec.fair}
                {r.flagged ? ", flagged" : ""}.
              </span>
            </li>
          );
        })}
      </ul>

      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted" aria-hidden>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm bg-success-bg" /> {spec.done}
        </li>
        <li className="flex items-center gap-2">
          <span
            className={`h-4 w-4 rounded-sm ${spec.flagMode === "extra" ? "bg-warning-bg" : "border border-dashed border-danger bg-danger-bg"}`}
          />
          {spec.problem}
        </li>
        <li className="flex items-center gap-2">
          <span className="h-4 w-4 rounded-sm border border-dashed border-border-strong" /> Fair share is about {spec.fair}
        </li>
      </ul>
    </div>
  );
}
