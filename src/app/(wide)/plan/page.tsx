import PlanSplitter from "@/components/plan/PlanSplitter";

export default function PlanPage() {
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <h1 className="text-xl font-semibold">Split the work</h1>
        <p className="text-sm text-muted">
          Paste the project description. SquadSync proposes owners, folders and a merge order that keep people out of
          each other&apos;s files.
        </p>
      </div>
      <PlanSplitter />
    </div>
  );
}
