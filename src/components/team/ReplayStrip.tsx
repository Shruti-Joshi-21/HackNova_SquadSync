"use client";

import { useRef } from "react";
import type { Analysis, WeekSummary } from "@/lib/types";
import { shortDate } from "@/components/ui";

const DAY = 86_400_000;

const SEGMENT: Record<WeekSummary["status"], string> = {
  ok: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  future: "border border-dashed border-border-strong",
};

const toDay = (t: number) => new Date(t).toISOString().slice(0, 10);

type Props = {
  /** Today's analysis: the strip always shows the whole project as it is now. */
  latest: Analysis;
  /** The day being viewed, YYYY-MM-DD; null means today. */
  value: string | null;
  onChange: (day: string | null) => void;
};

// One segment per week, a draggable marker for the day being viewed, and a tick
// at the first day any of today's risks could have been seen.
export default function ReplayStrip({ latest, value, onChange }: Props) {
  const trackRef = useRef<HTMLDivElement>(null);
  const start = Date.parse(latest.team.projectStart.slice(0, 10));
  const end = Date.parse(latest.asOf.slice(0, 10));
  const span = Math.max(DAY, end - start);
  const current = value ? Date.parse(value) : end;
  const at = (t: number) => `${((t - start) / span) * 100}%`;

  const firstWarning = latest.risks.length
    ? Math.min(...latest.risks.map((r) => Date.parse(r.firstDetectableAt.slice(0, 10))))
    : null;

  const set = (t: number) => {
    const clamped = Math.min(end, Math.max(start, Math.round(t / DAY) * DAY));
    onChange(clamped >= end ? null : toDay(clamped));
  };

  const fromPointer = (clientX: number) => {
    const r = trackRef.current?.getBoundingClientRect();
    if (!r) return;
    set(start + ((clientX - r.left) / r.width) * span);
  };

  // The weeks come from the analysis timeline; the last one may run past "today".
  const weeks = latest.timeline;
  const weekStart = (i: number) => start + i * 7 * DAY;

  return (
    <section aria-label="Replay">
      <div className="flex flex-wrap items-baseline gap-x-3">
        <h2 className="font-semibold">Replay</h2>
        <span className="text-xs text-muted">Drag to see the team as it was on an earlier day.</span>
        {value && (
          <span className="ml-auto flex items-baseline gap-3 text-xs">
            <span>Viewing {shortDate(value)}</span>
            <button type="button" onClick={() => onChange(null)} className="text-link hover:underline">
              Back to today
            </button>
          </span>
        )}
      </div>

      <div className="relative mt-3 pb-6">
        <div
          ref={trackRef}
          className="relative h-6 cursor-pointer touch-none select-none"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            fromPointer(e.clientX);
          }}
          onPointerMove={(e) => e.currentTarget.hasPointerCapture(e.pointerId) && fromPointer(e.clientX)}
        >
          {/* Week segments */}
          {weeks.map((w, i) => {
            const s = weekStart(i);
            const e = Math.min(end, s + 7 * DAY);
            if (s >= end) return null;
            return (
              <div
                key={w.weekIndex}
                className={`absolute top-2 h-2 rounded-sm ${SEGMENT[w.status]}`}
                style={{ left: `calc(${at(s)} + 1px)`, width: `calc(${at(e)} - ${at(s)} - 2px)` }}
                title={`${w.label}: ${w.mergedLines} merged lines`}
              />
            );
          })}

          {/* First warning tick */}
          {firstWarning !== null && (
            <div className="absolute top-0 h-6 w-px bg-text" style={{ left: at(firstWarning) }} aria-hidden />
          )}

          {/* Marker for the day being viewed */}
          <div
            role="slider"
            tabIndex={0}
            aria-label="Day being viewed"
            aria-valuemin={start}
            aria-valuemax={end}
            aria-valuenow={current}
            aria-valuetext={value ? shortDate(value) : "Today"}
            onKeyDown={(e) => {
              const step = { ArrowLeft: -7, ArrowDown: -7, ArrowRight: 7, ArrowUp: 7 }[e.key];
              if (step) set(current + step * DAY);
              else if (e.key === "Home") set(start);
              else if (e.key === "End") set(end);
              else return;
              e.preventDefault();
            }}
            className="absolute top-0 h-6 w-3 -translate-x-1/2 rounded-sm border-2 border-text bg-bg"
            style={{ left: at(current) }}
          />
        </div>

        {/* Labels under the strip */}
        <div className="absolute inset-x-0 bottom-0 h-5 text-[11px]">
          {weeks.map((w, i) =>
            weekStart(i) < end ? (
              <span
                key={w.weekIndex}
                className="absolute font-mono text-subtle"
                style={{ left: `calc(${at(weekStart(i))} + 2px)` }}
              >
                {w.label}
              </span>
            ) : null,
          )}
          {firstWarning !== null && (
            <span
              className="absolute -translate-x-1/2 bg-bg px-1 whitespace-nowrap text-text"
              style={{ left: at(firstWarning) }}
            >
              first warning, {shortDate(new Date(firstWarning).toISOString())}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
