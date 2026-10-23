export default async function TeamPage({ params }: PageProps<"/team/[id]">) {
  const { id } = await params;
  return <p className="text-muted">Team page: {id}.</p>;
}
