import TeamView from "@/components/team/TeamView";

export default async function TeamPage({ params }: PageProps<"/team/[id]">) {
  const { id } = await params;
  return <TeamView id={decodeURIComponent(id)} />;
}
