import type { Analysis } from "@/lib/types";
import { VERDICT, shortDate } from "@/components/ui";

// Verdict word and sentence, beside the two-bar schedule.
export default function Summary({ a }: { a: Analysis }) {
  const v = VERDICT[a.verdict];
  const s = a.schedule;
  const timeUsed = s.daysTotal ? s.daysUsed / s.daysTotal : 0;
  const tasksDone = s.tasksTotal ? s.tasksDone / s.tasksTotal : 0;
  const gap = Math.round((timeUsed - tasksDone) * 100);

  return (
    <div className="flex flex-wrap items-start gap-x-12 gap-y-6">
      <div className="max-w-[520px] flex-1 basis-[320px]">
        <p className={`text-[32px] leading-tight font-semibold ${v.text}`}>{v.word}</p>
        <p className="mt-1">{a.verdictReason}</p>
      </div>

      <div className="flex-1 basis-[320px]">
        <ScheduleBar label="Time used" value={timeUsed} detail={`${s.daysUsed} of ${s.daysTotal} days`} />
        <ScheduleBar label="Tasks done" value={tasksDone} detail={`${s.tasksDone} of ${s.tasksTotal} tasks`} />
        <p className="mt-2 text-xs text-muted">
          {gap > 0 ? `Tasks are ${gap} points behind time.` : "Tasks are keeping up with time."}
          {s.projectedFinish &&
            (s.daysLate > 0
              ? ` At the current pace the work finishes ${shortDate(s.projectedFinish)}, ${s.daysLate} days late.`
              : ` At the current pace the work finishes ${shortDate(s.projectedFinish)}, on time.`)}
        </p>
      </div>
    </div>
  );
}

function ScheduleBar({ label, value, detail }: { label: string; value: number; detail: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs">
        <span className="text-muted">{label}</span>
        <span className="font-mono">
          {Math.round(value * 100)}% <span className="text-subtle">{detail}</span>
        </span>
      </div>
      <div className="mt-1 h-2 rounded-sm bg-surface-2">
        <div className="h-2 rounded-sm bg-g-main" style={{ width: `${Math.min(100, value * 100)}%` }} />
      </div>
    </div>
  );
}
