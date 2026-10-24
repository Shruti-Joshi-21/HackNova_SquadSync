import ConnectForm from "@/components/ConnectForm";

// One centred card, like a sign-in page. The empty layer behind it is where the
// landing page's animated background can go later.
export default function ConnectPage() {
  return (
    <div className="relative flex min-h-[calc(100vh-48px-64px)] items-center justify-center py-8">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10" data-bg="connect" />
      <div className="w-full max-w-[460px] rounded-md border border-border bg-surface p-8">
        <h1 className="text-center text-2xl font-semibold">Check a repo</h1>
        <p className="mt-2 mb-8 text-center text-muted">Paste a GitHub link. No sign-in needed.</p>
        <ConnectForm />
      </div>
    </div>
  );
}
