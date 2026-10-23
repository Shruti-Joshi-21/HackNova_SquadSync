import PlanSplitter from "@/components/plan/PlanSplitter";

export default function PlanPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">Split the work</h1>
      <p className="mt-1 mb-6 text-muted">
        Paste the project description. SquadSync proposes owners, folders and a merge order that keep people out of
        each other&apos;s files.
      </p>
      <PlanSplitter />
    </div>
  );
}
