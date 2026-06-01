"use client";

import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import type { ConfidenceDatum } from "@/lib/insights";

export function ConfidenceDonut({ data }: { data: ConfidenceDatum[] }) {
  const total = data.reduce((sum, d) => sum + d.count, 0);

  return (
    <div className="flex items-center gap-4">
      <div className="relative h-[140px] w-[140px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="count"
              nameKey="name"
              innerRadius={44}
              outerRadius={64}
              paddingAngle={2}
              stroke="none"
            >
              {data.map((d) => (
                <Cell key={d.key} fill={d.hex} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-semibold text-slate-900">{total}</span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            leads
          </span>
        </div>
      </div>
      <ul className="space-y-1.5 text-sm">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2 text-slate-600">
            <span
              className="inline-block h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: d.hex }}
            />
            <span className="font-medium text-slate-800">{d.name}</span>
            <span className="text-slate-400">·</span>
            <span>{d.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
