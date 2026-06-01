const STEPS = [
  {
    n: "1",
    title: "ICP lives in a markdown rubric",
    body: "Scoring criteria sit in a version-controlled RUBRIC.md — tiers, disqualifiers, buying signals, and economic buyers. Anyone on the team edits it without touching code, and the model reads it verbatim.",
  },
  {
    n: "2",
    title: "Every lead is tiered, with a hard DQ screen",
    body: "Each lead is evaluated into Tier 1 / 2 / 3 or Disqualified. DQ is a first-class outcome — knowing who not to pursue (wrong geography, too small, B2C, personal email) prevents wasted outreach.",
  },
  {
    n: "3",
    title: "Output becomes pipeline insight",
    body: "Raw scores roll up into a qualification rate, a fit funnel, and a confidence breakdown — so a list of leads reads like a pipeline, not a spreadsheet.",
  },
  {
    n: "4",
    title: "The loop closes upstream",
    body: "Low-fit leads are analyzed for patterns, producing concrete sourcing filters and suggested rubric tightenings — fixing list quality at the source, not one lead at a time.",
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="scroll-mt-20">
      <div className="mb-5">
        <h2 className="text-xl font-semibold text-slate-900">
          How the scoring works
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          An LLM reads between the lines of incomplete CRM data the way a
          rules engine can&apos;t — &ldquo;Head of People at a Series B SaaS
          company&rdquo; carries context about stage, HR maturity, and budget
          authority that no keyword match surfaces.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {STEPS.map((s) => (
          <div
            key={s.n}
            className="rounded-xl border border-border bg-surface p-5 shadow-sm"
          >
            <div className="flex items-center gap-2.5">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">
                {s.n}
              </span>
              <h3 className="text-sm font-semibold text-slate-900">
                {s.title}
              </h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">
              {s.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
