// app/api/recommendations/__tests__/route.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock("@anthropic-ai/sdk", () => ({
  default: vi.fn(function (this: Record<string, unknown>) {
    this.messages = { create: mockCreate };
  }),
}));

vi.mock("fs", async (importOriginal) => {
  const actual = await importOriginal<typeof import("fs")>();
  return { ...actual, readFileSync: vi.fn(() => "# Fake Rubric\nScore leads.") };
});

const { POST } = await import("../route.js");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/recommendations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validLead = {
  tier: "DQ",
  score: 10,
  confidence: "high",
  rationale: "B2C company",
  signals_matched: [],
  disqualifiers: ["B2C business model"],
  inferred_facts: { industry: "E-commerce", employee_range: "10-50", is_b2b_saas: false },
  input: { name: "John Smith", email: "john@shop.com", company: "ShopCo", title: "CEO" },
};

const validClaudeResponse = {
  content: [{
    text: JSON.stringify({
      summary: "Most leads are B2C e-commerce companies outside the ICP.",
      sourcing_suggestions: [
        {
          category: "Industry",
          finding: "80% of DQ leads are B2C e-commerce",
          action: "Exclude e-commerce and retail industries in Apollo filters",
        },
      ],
      rubric_gaps: [
        {
          type: "new_disqualifier",
          finding: "B2C e-commerce consistently triggers DQ",
          suggested_text: "DQ: B2C e-commerce companies (SIC 5900-5999)",
        },
      ],
    }),
  }],
};

beforeEach(() => {
  mockCreate.mockReset();
});

describe("POST /api/recommendations", () => {
  it("returns 400 for empty leads array", async () => {
    const res = await POST(makeRequest({ leads: [] }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/non-empty/i);
  });

  it("returns 400 when leads is not an array", async () => {
    const res = await POST(makeRequest({ leads: "not an array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when leads key is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("returns 200 with recommendations for valid leads", async () => {
    mockCreate.mockResolvedValue(validClaudeResponse);
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary).toBeTruthy();
    expect(Array.isArray(body.sourcing_suggestions)).toBe(true);
    expect(Array.isArray(body.rubric_gaps)).toBe(true);
    expect(body.sourcing_suggestions[0].category).toBe("Industry");
    expect(body.rubric_gaps[0].type).toBe("new_disqualifier");
  });

  it("returns 500 when Claude returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({ content: [{ text: "not json at all" }] });
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("Claude returned invalid JSON");
  });

  it("strips markdown code fences before parsing JSON", async () => {
    const jsonStr = JSON.stringify({
      summary: "Summary",
      sourcing_suggestions: [],
      rubric_gaps: [],
    });
    mockCreate.mockResolvedValue({ content: [{ text: "```json\n" + jsonStr + "\n```" }] });
    const res = await POST(makeRequest({ leads: [validLead] }));
    const body = await res.json();
    expect(body.summary).toBe("Summary");
  });

  it("returns 500 when Anthropic SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("rate limit"));
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("rate limit");
  });
});
