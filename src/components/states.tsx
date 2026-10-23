// Loading skeletons (plain bordered blocks) and the one-sentence error state.

export function Block({ className = "" }: { className?: string }) {
  return <div className={`rounded-md border border-border bg-surface ${className}`} aria-hidden />;
}

export function TeamSkeleton() {
  return (
    <div className="space-y-8" role="status" aria-label="Loading team data">
      <Block className="h-7 w-64" />
      <div className="flex flex-wrap gap-12">
        <Block className="h-20 flex-1 basis-[320px]" />
        <Block className="h-20 flex-1 basis-[320px]" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Block className="h-80" />
        <Block className="h-80" />
        <Block className="h-80" />
      </div>
      <Block className="h-48" />
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div role="alert" className="py-12">
      <p>{message}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 h-8 rounded-md border border-border px-3 hover:bg-surface-2"
      >
        Retry
      </button>
    </div>
  );
}
