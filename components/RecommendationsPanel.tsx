"use client";

import type { ScoringResult } from "@/lib/types";
import {
  exportMarkdown,
  type RecommendationsResponse,
} from "@/lib/exportCsv";
import { Panel } from "@/components/ui/Panel";

export function RecommendationsPanel({
  results,
  recommendations,
  loading,
  error,
  onAnalyze,
}: {
  results: ScoringResult[];
  recommendations: RecommendationsResponse | null;
  loading: boolean;
  error: string | null;
  onAnalyze: () => void;
}) {
  const lowQuality = results.filter(
    (r) => !r.error && (r.tier === "3" || r.tier === "DQ")
  );
  if (lowQuality.length === 0) return null;

  return (
    <Panel
      title="Search refinement"
      subtitle={`${lowQuality.length} Tier 3 + DQ leads — find the upstream pattern`}
      action={
        <button
          onClick={onAnalyze}
          disabled={loading}
          className="rounded-lg bg-accent px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {loading ? "Analyzing…" : recommendations ? "Re-analyze" : "Analyze & recommend"}
        </button>
      }
    >
      {error && (
        <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
          <span>Recommendations error: {error}</span>
          <button
            onClick={onAnalyze}
            className="ml-4 underline hover:text-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {!recommendations && !error && !loading && (
        <p className="text-sm text-slate-500">
          Analyze why these leads missed your ICP — get specific sourcing filters
          for LinkedIn Sales Nav / Apollo and suggested rubric tightenings.
        </p>
      )}

      {recommendations && (
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm text-slate-700">{recommendations.summary}</p>
            <button
              onClick={() => exportMarkdown(recommendations, lowQuality.length)}
              className="shrink-0 rounded-lg border border-border px-3 py-1 text-xs font-medium text-slate-700 transition-colors hover:bg-surface-muted"
            >
              ⬇ .md
            </button>
          </div>

          {recommendations.sourcing_suggestions.length > 0 && (
            <details open>
              <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900">
                Sourcing suggestions ({recommendations.sourcing_suggestions.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {recommendations.sourcing_suggestions.map((s, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-accent/30 pl-3 text-sm text-slate-700"
                  >
                    <span className="font-medium text-slate-900">
                      {s.category}:
                    </span>{" "}
                    {s.finding}
                    <div className="mt-0.5 text-accent">→ {s.action}</div>
                  </li>
                ))}
              </ul>
            </details>
          )}

          {recommendations.rubric_gaps.length > 0 && (
            <details open>
              <summary className="cursor-pointer select-none text-sm font-semibold text-slate-900">
                Rubric gaps ({recommendations.rubric_gaps.length})
              </summary>
              <ul className="mt-2 space-y-2">
                {recommendations.rubric_gaps.map((g, i) => (
                  <li
                    key={i}
                    className="border-l-2 border-amber-300 pl-3 text-sm text-slate-700"
                  >
                    <span className="font-medium capitalize text-slate-900">
                      {g.type.replace(/_/g, " ")}:
                    </span>{" "}
                    {g.finding}
                    <div className="mt-1 rounded bg-amber-50 px-2 py-1 font-mono text-xs text-amber-800">
                      {g.suggested_text}
                    </div>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </Panel>
  );
}
