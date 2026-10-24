import TeamView from "@/components/team/TeamView";

// ?view=mentor (from the mentor list or the Mentor toggle) adds the mentor-only parts.
export default async function TeamPage({ params, searchParams }: PageProps<"/team/[id]">) {
  const { id } = await params;
  const { view } = await searchParams;
  return <TeamView id={decodeURIComponent(id)} mentor={view === "mentor"} />;
}
