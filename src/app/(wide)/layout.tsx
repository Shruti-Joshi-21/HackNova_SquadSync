import BackButton from "@/components/BackButton";
import TopBar from "@/components/TopBar";

// Like the (shell) layout, but full width: for pages that are one big picture
// (the PRD splitter). URLs are unchanged.
export default function WideLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <TopBar wide />
      <main className="mx-auto w-full max-w-[1800px] px-6 py-4 lg:px-10">
        <BackButton />
        {children}
      </main>
    </>
  );
}
