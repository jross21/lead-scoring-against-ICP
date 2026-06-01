import type { ScoringResult } from "@/lib/types";
import {
  computeKpis,
  confidenceBreakdown,
  fitFunnel,
  tierDistribution,
} from "@/lib/insights";
import { StatCards } from "@/components/StatCards";
import { Panel } from "@/components/ui/Panel";
import { TierBarChart } from "@/components/charts/TierBarChart";
import { ConfidenceDonut } from "@/components/charts/ConfidenceDonut";
import { FitFunnel } from "@/components/charts/FitFunnel";

export function ResultsDashboard({ results }: { results: ScoringResult[] }) {
  const kpis = computeKpis(results);
  const tiers = tierDistribution(results);
  const confidence = confidenceBreakdown(results);
  const funnel = fitFunnel(results);

  return (
    <div className="space-y-4 animate-fade-in-up">
      <StatCards kpis={kpis} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel title="Tier distribution" subtitle="Fit across the batch">
          <TierBarChart data={tiers} />
        </Panel>
        <Panel title="Scoring confidence" subtitle="Data completeness signal">
          {confidence.length > 0 ? (
            <ConfidenceDonut data={confidence} />
          ) : (
            <p className="py-10 text-center text-sm text-slate-400">
              No confidence data
            </p>
          )}
        </Panel>
        <Panel title="Fit funnel" subtitle="Uploaded → Tier 1">
          <FitFunnel data={funnel} />
        </Panel>
      </div>
    </div>
  );
}
