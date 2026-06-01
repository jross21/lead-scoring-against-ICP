// Single source of truth for tier presentation across chips, charts, KPIs, and table.

export type Tier = "1" | "2" | "3" | "DQ";

export const TIER_ORDER: Tier[] = ["1", "2", "3", "DQ"];

export type TierToken = {
  /** Short display label, e.g. "Tier 1" or "DQ" */
  label: string;
  /** Longer descriptor for legends / tooltips */
  description: string;
  /** Hex used by Recharts and other SVG fills */
  hex: string;
  /** Solid chip (filled) */
  chip: string;
  /** Outlined / inactive chip */
  chipOutline: string;
  /** Soft text color for inline emphasis */
  text: string;
  /** Left accent border for cards/rows */
  accentBorder: string;
};

export const TIERS: Record<Tier, TierToken> = {
  "1": {
    label: "Tier 1",
    description: "Ideal customer",
    hex: "#16a34a",
    chip: "bg-green-100 text-green-800",
    chipOutline: "bg-white text-green-700 border border-green-300",
    text: "text-green-700",
    accentBorder: "border-l-green-500",
  },
  "2": {
    label: "Tier 2",
    description: "Workable",
    hex: "#d97706",
    chip: "bg-amber-100 text-amber-800",
    chipOutline: "bg-white text-amber-700 border border-amber-300",
    text: "text-amber-700",
    accentBorder: "border-l-amber-500",
  },
  "3": {
    label: "Tier 3",
    description: "Marginal",
    hex: "#64748b",
    chip: "bg-slate-200 text-slate-700",
    chipOutline: "bg-white text-slate-600 border border-slate-300",
    text: "text-slate-600",
    accentBorder: "border-l-slate-400",
  },
  DQ: {
    label: "DQ",
    description: "Disqualified",
    hex: "#dc2626",
    chip: "bg-red-100 text-red-800",
    chipOutline: "bg-white text-red-700 border border-red-300",
    text: "text-red-700",
    accentBorder: "border-l-red-500",
  },
};

export function tierToken(tier?: string): TierToken | null {
  if (!tier) return null;
  return TIERS[tier as Tier] ?? null;
}

export function isTier(value: string): value is Tier {
  return value in TIERS;
}
