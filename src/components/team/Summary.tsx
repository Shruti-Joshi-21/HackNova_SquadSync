import type { Analysis } from "@/lib/types";
import { VERDICT, shortDate } from "@/components/ui";

// Verdict word and sentence, beside the two-bar schedule.
export default function Summary({ a }: { a: Analysis }) {
  const v = VERDICT[a.verdict];
  const s = a.schedule;
  const timeUsed = s.daysTotal ? s.daysUsed / s.daysTotal : 0;
  const tasksDone = s.tasksTotal ? s.tasksDone / s.tasksTotal : 0;

  return (
    <section className="grid gap-8 rounded-md border border-border bg-surface p-6 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-7">
        <p className={`text-[32px] leading-tight font-semibold ${v.text}`}>{v.word}</p>
        <p className="mt-2 max-w-[60ch] text-base">{a.verdictReason}</p>
      </div>

      <div className="space-y-4 lg:col-span-5">
        <ScheduleBar label="Time used" value={timeUsed} detail={`${s.daysUsed} of ${s.daysTotal} days`} />
        <ScheduleBar label="Tasks done" value={tasksDone} detail={`${s.tasksDone} of ${s.tasksTotal} tasks`} />
        {s.projectedFinish && (
          <p className="text-muted">
            {s.daysLate > 0
              ? `At this pace: done ${shortDate(s.projectedFinish)}, ${s.daysLate} days late.`
              : `At this pace: done ${shortDate(s.projectedFinish)}, on time.`}
          </p>
        )}
      </div>
    </section>
  );
}

function ScheduleBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <span>{label}</span>
        <span>
          <span className="font-semibold">{Math.round(value * 100)}%</span>
          <span className="ml-2 text-xs text-muted">{detail}</span>
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-sm bg-surface-2">
        <div className="h-2 rounded-sm bg-g-main" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}
