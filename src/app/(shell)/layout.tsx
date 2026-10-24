import { Suspense } from "react";
import BackButton from "@/components/BackButton";
import TopBar from "@/components/TopBar";

// Shell for every page except /embed (the extension side panel has its own narrow layout).
export default function ShellLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {/* The top bar reads ?view=, so it needs a Suspense boundary on static pages. */}
      <Suspense fallback={<div className="h-12 border-b border-border bg-bg" />}>
        <TopBar />
      </Suspense>
      <main className="mx-auto max-w-[1440px] px-6 py-8 lg:px-10">
        <BackButton />
        {children}
      </main>
    </>
  );
}
