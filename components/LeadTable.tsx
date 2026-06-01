"use client";

import { useMemo, useState } from "react";
import type { ScoringResult } from "@/lib/types";
import { TIER_ORDER, TIERS, tierToken } from "@/lib/tiers";
import { exportToCsv } from "@/lib/exportCsv";

type SortKey = "company" | "tier" | "score" | "confidence";
type SortDir = "asc" | "desc";

const CONFIDENCE_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 };

export function LeadTable({
  results,
  rawRows,
  selectedLeads,
  onToggleSelection,
}: {
  results: ScoringResult[];
  rawRows: Record<string, string>[];
  selectedLeads?: Set<string>;
  onToggleSelection?: (email: string) => void;
}) {
  const selectable = Boolean(onToggleSelection);
  const [visibleTiers, setVisibleTiers] = useState<Set<string>>(
    new Set(TIER_ORDER)
  );
  const [sortKey, setSortKey] = useState<SortKey>("score");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggleTier = (tier: string) =>
    setVisibleTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir(key === "company" ? "asc" : "desc");
    }
  };

  const toggleExpand = (i: number) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  // Keep original index so we can line raw rows up for export.
  const indexed = useMemo(
    () => results.map((r, i) => ({ r, i })),
    [results]
  );

  const filtered = useMemo(
    () =>
      indexed.filter(({ r }) => r.error || (r.tier && visibleTiers.has(r.tier))),
    [indexed, visibleTiers]
  );

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      // errors always sink to the bottom regardless of direction
      if (a.r.error && !b.r.error) return 1;
      if (!a.r.error && b.r.error) return -1;
      let cmp = 0;
      switch (sortKey) {
        case "company":
          cmp = (a.r.input.company || "").localeCompare(b.r.input.company || "");
          break;
        case "tier":
          cmp =
            TIER_ORDER.indexOf((a.r.tier ?? "DQ") as never) -
            TIER_ORDER.indexOf((b.r.tier ?? "DQ") as never);
          break;
        case "score":
          cmp = (a.r.score ?? 0) - (b.r.score ?? 0);
          break;
        case "confidence":
          cmp =
            (CONFIDENCE_RANK[a.r.confidence ?? ""] ?? 0) -
            (CONFIDENCE_RANK[b.r.confidence ?? ""] ?? 0);
          break;
      }
      return cmp * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const handleExport = () => {
    const pairs = filtered.map(({ r, i }) => ({ r, raw: rawRows[i] }));
    exportToCsv(
      pairs.map((p) => p.raw),
      pairs.map((p) => p.r)
    );
  };

  const errorCount = results.filter((r) => r.error).length;
  const shownLeads = filtered.filter(({ r }) => !r.error).length;
  const totalLeads = results.filter((r) => !r.error).length;

  const arrow = (key: SortKey) =>
    sortKey === key ? (sortDir === "asc" ? "↑" : "↓") : "";

  return (
    <div className="space-y-3">
      {/* Toolbar: filter chips + export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {TIER_ORDER.map((tier) => {
            const active = visibleTiers.has(tier);
            const t = TIERS[tier];
            const count = results.filter((r) => r.tier === tier).length;
            return (
              <button
                key={tier}
                onClick={() => toggleTier(tier)}
                className={`rounded-full px-3 py-1 text-sm font-medium transition-opacity ${
                  active ? t.chip : `${t.chipOutline} opacity-50`
                }`}
              >
                {t.label} · {count}
              </button>
            );
          })}
        </div>
        <button
          onClick={handleExport}
          className="rounded-lg bg-slate-900 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          ⬇ Export CSV
        </button>
      </div>

      <div className="text-xs text-slate-500">
        Showing {shownLeads} of {totalLeads} leads
        {errorCount > 0 && ` · ${errorCount} error${errorCount === 1 ? "" : "s"}`}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-surface-muted/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-8 px-3 py-2.5" />
              <Th onClick={() => toggleSort("company")}>
                Company {arrow("company")}
              </Th>
              <th className="px-3 py-2.5 font-medium">Title</th>
              <Th onClick={() => toggleSort("tier")} className="w-24">
                Tier {arrow("tier")}
              </Th>
              <Th onClick={() => toggleSort("score")} className="w-20">
                Score {arrow("score")}
              </Th>
              <Th onClick={() => toggleSort("confidence")} className="hidden w-28 sm:table-cell">
                Confidence {arrow("confidence")}
              </Th>
              {selectable && (
                <th className="w-16 px-3 py-2.5 text-center font-medium">HubSpot</th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ r, i }) => {
              const t = tierToken(r.tier);
              const isOpen = expanded.has(i);
              return (
                <FragmentRow
                  key={i}
                  open={isOpen}
                  onToggle={() => toggleExpand(i)}
                  result={r}
                  selectable={selectable}
                  selected={Boolean(r.input.email && selectedLeads?.has(r.input.email))}
                  onToggleSelect={() =>
                    r.input.email && onToggleSelection?.(r.input.email)
                  }
                  detailColSpan={selectable ? 6 : 5}
                  tierChip={
                    r.error ? (
                      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                        Error
                      </span>
                    ) : t ? (
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${t.chip}`}>
                        {t.label}
                      </span>
                    ) : null
                  }
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Th({
  children,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  onClick: () => void;
  className?: string;
}) {
  return (
    <th
      onClick={onClick}
      className={`cursor-pointer select-none px-3 py-2.5 font-medium transition-colors hover:text-slate-800 ${className}`}
    >
      {children}
    </th>
  );
}

function FragmentRow({
  result: r,
  tierChip,
  open,
  onToggle,
  selectable,
  selected,
  onToggleSelect,
  detailColSpan,
}: {
  result: ScoringResult;
  tierChip: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  selectable: boolean;
  selected: boolean;
  onToggleSelect: () => void;
  detailColSpan: number;
}) {
  return (
    <>
      <tr
        onClick={onToggle}
        className="cursor-pointer border-b border-border last:border-0 hover:bg-surface-muted/40"
      >
        <td className="px-3 py-2.5 text-slate-400">{open ? "▾" : "▸"}</td>
        <td className="px-3 py-2.5">
          <div className="font-medium text-slate-900">
            {r.input.company || "—"}
          </div>
          <div className="text-xs text-slate-500">
            {r.input.name || "(no name)"}
          </div>
        </td>
        <td className="px-3 py-2.5 text-slate-600">{r.input.title || "—"}</td>
        <td className="px-3 py-2.5">{tierChip}</td>
        <td className="px-3 py-2.5 font-semibold tabular-nums text-slate-800">
          {r.score ?? "—"}
        </td>
        <td className="hidden px-3 py-2.5 capitalize text-slate-500 sm:table-cell">
          {r.confidence ?? "—"}
        </td>
        {selectable && (
          <td
            className="px-3 py-2.5 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            {r.error || !r.input.email ? null : (
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-orange-600"
                checked={selected}
                onChange={onToggleSelect}
                aria-label={`Select ${r.input.name || r.input.email} for HubSpot`}
              />
            )}
          </td>
        )}
      </tr>
      {open && (
        <tr className="border-b border-border bg-surface-muted/30">
          <td />
          <td colSpan={detailColSpan} className="px-3 py-4">
            {r.error ? (
              <p className="text-sm text-red-600">Error: {r.error}</p>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="text-slate-700">{r.rationale}</p>
                {r.signals_matched && r.signals_matched.length > 0 && (
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Matched:</span>{" "}
                    {r.signals_matched.join(", ")}
                  </p>
                )}
                {r.disqualifiers && r.disqualifiers.length > 0 && (
                  <p className="text-xs text-red-600">
                    <span className="font-semibold">DQ flags:</span>{" "}
                    {r.disqualifiers.join(", ")}
                  </p>
                )}
                {r.inferred_facts && (
                  <p className="text-xs text-slate-400">
                    Inferred: {r.inferred_facts.industry} ·{" "}
                    {r.inferred_facts.employee_range} employees · B2B SaaS:{" "}
                    {String(r.inferred_facts.is_b2b_saas)}
                  </p>
                )}
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
