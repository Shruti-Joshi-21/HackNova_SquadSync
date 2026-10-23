import MentorTable from "@/components/MentorTable";

export default function MentorPage() {
  return (
    <div>
      <h1 className="text-xl font-semibold">All teams</h1>
      <p className="mt-1 text-muted">Sorted by who needs help first.</p>
      <MentorTable />
    </div>
  );
}
