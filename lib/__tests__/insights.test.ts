import { describe, it, expect } from "vitest";
import {
  computeKpis,
  tierDistribution,
  confidenceBreakdown,
  fitFunnel,
} from "../insights";
import { SAMPLE_RESULTS } from "../sampleData";
import type { ScoringResult } from "../types";

function make(partial: Partial<ScoringResult>): ScoringResult {
  return {
    input: { name: "", email: "", company: "", title: "", extra: {} },
    ...partial,
  };
}

describe("computeKpis", () => {
  it("counts tiers, qualified, and excludes errors", () => {
    const results: ScoringResult[] = [
      make({ tier: "1", score: 90, confidence: "high" }),
      make({ tier: "2", score: 70, confidence: "medium" }),
      make({ tier: "3", score: 40, confidence: "low" }),
      make({ tier: "DQ", score: 10, confidence: "high" }),
      make({ error: "Claude returned invalid JSON" }),
    ];
    const k = computeKpis(results);
    expect(k.total).toBe(4);
    expect(k.errors).toBe(1);
    expect(k.tier1).toBe(1);
    expect(k.qualified).toBe(2);
    expect(k.qualifiedPct).toBe(50);
    expect(k.avgScore).toBe(53); // (90+70+40+10)/4 = 52.5 -> 53
  });

  it("returns zeros for an empty batch", () => {
    const k = computeKpis([]);
    expect(k.total).toBe(0);
    expect(k.qualifiedPct).toBe(0);
    expect(k.avgScore).toBe(0);
  });
});

describe("tierDistribution", () => {
  it("always returns all four tiers in order with hex colors", () => {
    const dist = tierDistribution([make({ tier: "1" })]);
    expect(dist.map((d) => d.tier)).toEqual(["1", "2", "3", "DQ"]);
    expect(dist[0].count).toBe(1);
    expect(dist[0].hex).toMatch(/^#/);
  });
});

describe("confidenceBreakdown", () => {
  it("buckets by confidence and drops empty buckets", () => {
    const b = confidenceBreakdown([
      make({ tier: "1", confidence: "high" }),
      make({ tier: "2", confidence: "HIGH" }),
      make({ tier: "3", confidence: "low" }),
    ]);
    const high = b.find((x) => x.key === "high");
    expect(high?.count).toBe(2);
    expect(b.find((x) => x.key === "medium")).toBeUndefined();
  });
});

describe("fitFunnel", () => {
  it("produces a monotonically narrowing funnel", () => {
    const f = fitFunnel(SAMPLE_RESULTS);
    expect(f.map((s) => s.stage)).toEqual([
      "Uploaded",
      "Scored",
      "Qualified",
      "Tier 1",
    ]);
    for (let i = 1; i < f.length; i++) {
      expect(f[i].count).toBeLessThanOrEqual(f[i - 1].count);
    }
  });
});

describe("SAMPLE_RESULTS", () => {
  it("is a well-formed, non-trivial demo batch", () => {
    expect(SAMPLE_RESULTS.length).toBeGreaterThanOrEqual(18);
    for (const r of SAMPLE_RESULTS) {
      expect(r.input.email).toBeTruthy();
      expect(["1", "2", "3", "DQ"]).toContain(r.tier);
      expect(typeof r.score).toBe("number");
    }
    const k = computeKpis(SAMPLE_RESULTS);
    // spans every tier so the dashboard has something in each bucket
    expect(k.tier1).toBeGreaterThan(0);
    expect(k.dq).toBeGreaterThan(0);
  });
});
