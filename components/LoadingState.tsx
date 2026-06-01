export function LoadingState({ count = 6 }: { count?: number }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl border border-border bg-surface p-4 shadow-sm"
          >
            <div className="skeleton h-3 w-16 rounded" />
            <div className="skeleton mt-2 h-7 w-12 rounded" />
          </div>
        ))}
      </div>
      <div className="rounded-xl border border-border bg-surface p-5 shadow-sm">
        <div className="skeleton h-4 w-40 rounded" />
        <div className="mt-4 space-y-2">
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className="skeleton h-9 w-full rounded" />
          ))}
        </div>
      </div>
      <p className="text-center text-sm text-slate-400">
        Scoring leads against your ICP rubric…
      </p>
    </div>
  );
}
