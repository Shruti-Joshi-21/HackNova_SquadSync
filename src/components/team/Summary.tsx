import type { Analysis } from "@/lib/types";
import GitGraph from "@/components/GitGraph";
import { SEVERITY, Tag, VERDICT, shortDate } from "@/components/ui";

// The hero: verdict, sentence and schedule on the left; on the right, the
// branch picture of the biggest risk that has one, so the page opens on what is wrong.
export default function Summary({ a }: { a: Analysis }) {
  const v = VERDICT[a.verdict];
  const s = a.schedule;
  const timeUsed = s.daysTotal ? s.daysUsed / s.daysTotal : 0;
  const tasksDone = s.tasksTotal ? s.tasksDone / s.tasksTotal : 0;
  const top = a.risks.find((r) => r.scene);
  const colors = Object.fromEntries(a.team.people.map((p) => [p.id, p.colorIndex]));

  return (
    <section className="grid gap-8 rounded-md border border-border bg-surface p-6 lg:grid-cols-12 lg:gap-12">
      <div className={top ? "lg:col-span-5" : "lg:col-span-7"}>
        <p className={`text-[32px] leading-tight font-semibold ${v.text}`}>{v.word}</p>
        <p className="mt-2 max-w-[60ch] text-base">{a.verdictReason}</p>

        {top && <Schedule className="mt-8" timeUsed={timeUsed} tasksDone={tasksDone} a={a} />}
      </div>

      {top?.scene ? (
        <div className="min-w-0 lg:col-span-7">
          <p className="flex flex-wrap items-center gap-2">
            <Tag tone={SEVERITY[top.severity].tone}>{SEVERITY[top.severity].word}</Tag>
            <span className="font-semibold">{top.title}</span>
          </p>
          <div className="mt-3">
            <GitGraph scene={top.scene} colorByPerson={colors} />
          </div>
        </div>
      ) : (
        <Schedule className="lg:col-span-5" timeUsed={timeUsed} tasksDone={tasksDone} a={a} />
      )}
    </section>
  );
}

function Schedule({ a, timeUsed, tasksDone, className = "" }: { a: Analysis; timeUsed: number; tasksDone: number; className?: string }) {
  const s = a.schedule;
  return (
    <div className={`space-y-4 ${className}`}>
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
