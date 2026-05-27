import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.hoisted ensures this is available inside the vi.mock factory (which is hoisted)
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
  return new Request("http://localhost/api/score", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validLead = { name: "Jane Doe", email: "jane@acme.com", company: "Acme", title: "VP Sales" };

const validClaudeResponse = {
  content: [{
    text: JSON.stringify({
      tier: "1",
      score: 85,
      confidence: "high",
      rationale: "Strong ICP match",
      signals_matched: ["B2B SaaS"],
      disqualifiers: [],
      inferred_facts: { industry: "SaaS", employee_range: "50-200", is_b2b_saas: true },
    }),
  }],
};

beforeEach(() => {
  mockCreate.mockReset();
});

describe("POST /api/score", () => {
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

  it("returns 200 with scored results for valid leads", async () => {
    mockCreate.mockResolvedValue(validClaudeResponse);
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(1);
    expect(body.results[0].tier).toBe("1");
    expect(body.results[0].score).toBe(85);
    expect(body.results[0].input).toMatchObject(validLead);
  });

  it("scores multiple leads in parallel", async () => {
    mockCreate.mockResolvedValue(validClaudeResponse);
    const res = await POST(makeRequest({ leads: [validLead, validLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results).toHaveLength(2);
    expect(mockCreate).toHaveBeenCalledTimes(2);
  });

  it("returns error object in result when Claude returns invalid JSON", async () => {
    mockCreate.mockResolvedValue({ content: [{ text: "not json at all" }] });
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.results[0].error).toBe("Claude returned invalid JSON");
  });

  it("strips markdown code fences before parsing JSON", async () => {
    const jsonStr = JSON.stringify({
      tier: "2", score: 60, confidence: "medium",
      rationale: "Partial match", signals_matched: [], disqualifiers: [],
      inferred_facts: { industry: "unknown", employee_range: "unknown", is_b2b_saas: "unknown" },
    });
    mockCreate.mockResolvedValue({ content: [{ text: "```json\n" + jsonStr + "\n```" }] });
    const res = await POST(makeRequest({ leads: [validLead] }));
    const body = await res.json();
    expect(body.results[0].tier).toBe("2");
  });

  it("returns 500 when Anthropic SDK throws", async () => {
    mockCreate.mockRejectedValue(new Error("rate limit"));
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("rate limit");
  });
});
