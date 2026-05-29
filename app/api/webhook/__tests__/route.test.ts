import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

const { POST } = await import("../route.js");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/webhook", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validLead = {
  input: { name: "Jane Doe", email: "jane@acme.com", company: "Acme Corp", title: "VP Sales", extra: {} },
  tier: "1", score: 85, rationale: "Strong ICP match",
  signals_matched: ["B2B SaaS"], disqualifiers: [], timestamp: "2026-01-01T00:00:00.000Z",
};
const validMeta = { fileName: "leads.csv", total: 5, tiers: { "1": 2, "2": 1, "3": 1, DQ: 1 } };

beforeEach(() => {
  mockFetch.mockReset();
  process.env.WEBHOOK_URL = "https://hooks.example.com/lead-triage";
});

afterEach(() => {
  delete process.env.WEBHOOK_URL;
});

describe("POST /api/webhook", () => {
  it("returns 400 when WEBHOOK_URL is not set", async () => {
    delete process.env.WEBHOOK_URL;
    const res = await POST(makeRequest({ leads: [validLead], meta: validMeta }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/WEBHOOK_URL/i);
  });

  it("returns 400 for empty leads array", async () => {
    const res = await POST(makeRequest({ leads: [], meta: validMeta }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/non-empty/i);
  });

  it("returns 400 when leads is not an array", async () => {
    const res = await POST(makeRequest({ leads: "bad", meta: validMeta }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when leads key is missing", async () => {
    const res = await POST(makeRequest({ meta: validMeta }));
    expect(res.status).toBe(400);
  });

  it("POSTs full payload to WEBHOOK_URL with correct headers", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await POST(makeRequest({ leads: [validLead], meta: validMeta }));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://hooks.example.com/lead-triage");
    expect(init.method).toBe("POST");
    expect(init.headers["Content-Type"]).toBe("application/json");
    const body = JSON.parse(init.body);
    expect(body.leads).toHaveLength(1);
    expect(body.leads[0].input.email).toBe("jane@acme.com");
    expect(body.meta.fileName).toBe("leads.csv");
    expect(body.meta.total).toBe(5);
  });

  it("returns { ok: true, status: 200 } on success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    const res = await POST(makeRequest({ leads: [validLead], meta: validMeta }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.status).toBe(200);
  });

  it("returns { ok: false, status: 422 } when webhook responds non-ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 422 });
    const res = await POST(makeRequest({ leads: [validLead], meta: validMeta }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(false);
    expect(body.status).toBe(422);
  });

  it("meta defaults to null when omitted", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 200 });
    await POST(makeRequest({ leads: [validLead] }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.meta).toBeNull();
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await POST(makeRequest({ leads: [validLead], meta: validMeta }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("ECONNREFUSED");
  });
});
