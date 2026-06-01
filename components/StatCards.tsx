import type { Kpis } from "@/lib/insights";

type Stat = {
  label: string;
  value: string;
  hint?: string;
  emphasis?: boolean;
};

export function StatCards({ kpis }: { kpis: Kpis }) {
  const stats: Stat[] = [
    { label: "Leads scored", value: String(kpis.total), hint: kpis.errors ? `${kpis.errors} error${kpis.errors === 1 ? "" : "s"}` : undefined },
    { label: "Qualified (T1+T2)", value: `${kpis.qualifiedPct}%`, hint: `${kpis.qualified} of ${kpis.total}`, emphasis: true },
    { label: "Avg fit score", value: String(kpis.avgScore), hint: "out of 100" },
    { label: "Tier 1", value: String(kpis.tier1), hint: "ideal customers" },
    { label: "Disqualified", value: String(kpis.dq), hint: "do not pursue" },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div
          key={s.label}
          className={`rounded-xl border bg-surface p-4 shadow-sm ${
            s.emphasis ? "border-accent/30 ring-1 ring-accent/10" : "border-border"
          }`}
        >
          <div className="text-xs font-medium text-slate-500">{s.label}</div>
          <div
            className={`mt-1 text-2xl font-semibold tabular-nums ${
              s.emphasis ? "text-accent" : "text-slate-900"
            }`}
          >
            {s.value}
          </div>
          {s.hint && (
            <div className="mt-0.5 text-[11px] text-slate-400">{s.hint}</div>
          )}
        </div>
      ))}
    </div>
  );
}
