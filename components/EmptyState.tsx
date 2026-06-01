const STEPS = [
  {
    n: "1",
    title: "Upload a CRM export",
    body: "Any CSV — columns are auto-detected and everything extra becomes signal for the model.",
  },
  {
    n: "2",
    title: "Score against your ICP",
    body: "Each lead is tiered (1 / 2 / 3 / DQ) against a plain-markdown rubric, with rationale and matched signals.",
  },
  {
    n: "3",
    title: "Read the pipeline",
    body: "Fit charts, a qualification funnel, and a sortable lead table — plus sourcing recommendations.",
  },
];

export function EmptyState({ onLoadSample }: { onLoadSample: () => void }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-muted/50 p-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {STEPS.map((s) => (
          <div key={s.n} className="flex gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
              {s.n}
            </span>
            <div>
              <div className="text-sm font-semibold text-slate-900">
                {s.title}
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                {s.body}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-3 border-t border-border pt-4 text-sm text-slate-500">
        <span>No Anthropic API key handy?</span>
        <button
          onClick={onLoadSample}
          className="font-medium text-accent hover:underline"
        >
          Load a pre-scored sample batch →
        </button>
      </div>
    </div>
  );
}
