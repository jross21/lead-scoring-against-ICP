"use client";

import type { FunnelDatum } from "@/lib/insights";

// A lightweight CSS funnel — robust across widths and avoids chart-lib funnel
// label quirks. Each stage is a centered bar whose width is proportional to
// the top-of-funnel count.
export function FitFunnel({ data }: { data: FunnelDatum[] }) {
  const max = Math.max(1, data[0]?.count ?? 1);

  return (
    <div className="space-y-2">
      {data.map((stage) => {
        const pct = Math.round((stage.count / max) * 100);
        const ofTop = data[0]?.count
          ? Math.round((stage.count / data[0].count) * 100)
          : 0;
        return (
          <div key={stage.stage} className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-right text-xs font-medium text-slate-500">
              {stage.stage}
            </span>
            <div className="flex h-8 flex-1 items-center justify-center rounded-md">
              <div
                className="flex h-8 items-center justify-center rounded-md text-xs font-semibold text-white transition-all"
                style={{
                  width: `${Math.max(pct, 12)}%`,
                  backgroundColor: stage.hex,
                }}
              >
                {stage.count}
              </div>
            </div>
            <span className="w-10 shrink-0 text-right text-xs tabular-nums text-slate-400">
              {ofTop}%
            </span>
          </div>
        );
      })}
    </div>
  );
}
