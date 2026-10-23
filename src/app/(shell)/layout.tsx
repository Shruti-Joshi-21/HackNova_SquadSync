import TopBar from "@/components/TopBar";
import { getTeams } from "@/lib/data";

// Shell for every page except /embed (the extension side panel has its own narrow layout).
export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const teams = await getTeams();
  return (
    <>
      <TopBar teams={teams} />
      <main className="mx-auto max-w-[1200px] px-6 py-6">{children}</main>
    </>
  );
}
