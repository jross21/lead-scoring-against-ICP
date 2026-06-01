import type { ScoringResult } from "@/lib/types";
import { TIER_ORDER, TIERS, type Tier } from "@/lib/tiers";

export type Kpis = {
  total: number; // successfully scored (non-error)
  errors: number;
  tier1: number;
  tier2: number;
  tier3: number;
  dq: number;
  qualified: number; // tier 1 + tier 2
  qualifiedPct: number; // 0-100, rounded
  avgScore: number; // rounded, over non-error results that carry a score
};

export type TierDatum = { tier: Tier; label: string; count: number; hex: string };
export type ConfidenceDatum = { name: string; key: string; count: number; hex: string };
export type FunnelDatum = { stage: string; count: number; hex: string };

const CONFIDENCE_META: { key: string; name: string; hex: string }[] = [
  { key: "high", name: "High", hex: "#16a34a" },
  { key: "medium", name: "Medium", hex: "#d97706" },
  { key: "low", name: "Low", hex: "#94a3b8" },
];

function scored(results: ScoringResult[]): ScoringResult[] {
  return results.filter((r) => !r.error);
}

export function computeKpis(results: ScoringResult[]): Kpis {
  const ok = scored(results);
  const errors = results.length - ok.length;
  const count = (t: Tier) => ok.filter((r) => r.tier === t).length;

  const tier1 = count("1");
  const tier2 = count("2");
  const tier3 = count("3");
  const dq = count("DQ");
  const qualified = tier1 + tier2;

  const withScore = ok.filter((r) => typeof r.score === "number");
  const avgScore =
    withScore.length > 0
      ? Math.round(
          withScore.reduce((sum, r) => sum + (r.score as number), 0) /
            withScore.length
        )
      : 0;

  return {
    total: ok.length,
    errors,
    tier1,
    tier2,
    tier3,
    dq,
    qualified,
    qualifiedPct: ok.length > 0 ? Math.round((qualified / ok.length) * 100) : 0,
    avgScore,
  };
}

export function tierDistribution(results: ScoringResult[]): TierDatum[] {
  const ok = scored(results);
  return TIER_ORDER.map((tier) => ({
    tier,
    label: TIERS[tier].label,
    count: ok.filter((r) => r.tier === tier).length,
    hex: TIERS[tier].hex,
  }));
}

export function confidenceBreakdown(results: ScoringResult[]): ConfidenceDatum[] {
  const ok = scored(results);
  return CONFIDENCE_META.map((c) => ({
    name: c.name,
    key: c.key,
    hex: c.hex,
    count: ok.filter((r) => (r.confidence ?? "").toLowerCase() === c.key).length,
  })).filter((c) => c.count > 0);
}

export function fitFunnel(results: ScoringResult[]): FunnelDatum[] {
  const k = computeKpis(results);
  return [
    { stage: "Uploaded", count: results.length, hex: "#94a3b8" },
    { stage: "Scored", count: k.total, hex: "#6366f1" },
    { stage: "Qualified", count: k.qualified, hex: "#d97706" },
    { stage: "Tier 1", count: k.tier1, hex: "#16a34a" },
  ];
}
