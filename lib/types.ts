import type { MappedLead } from "@/lib/mapColumns";

export type InferredFacts = {
  industry: string;
  employee_range: string;
  is_b2b_saas: boolean | "unknown";
};

export type ScoringResult = {
  input: MappedLead;
  tier?: string;
  score?: number;
  confidence?: string;
  rationale?: string;
  signals_matched?: string[];
  disqualifiers?: string[];
  inferred_facts?: InferredFacts;
  timestamp?: string;
  error?: string;
};
