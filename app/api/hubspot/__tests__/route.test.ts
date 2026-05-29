import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockFetch = vi.hoisted(() => vi.fn());
vi.stubGlobal("fetch", mockFetch);

const { POST } = await import("../route.js");

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/hubspot", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const validLead = {
  input: { name: "Jane Doe", email: "jane@acme.com", company: "Acme Corp", title: "VP Sales", extra: {} },
  tier: "1",
  score: 85,
  rationale: "Strong ICP match",
  signals_matched: ["B2B SaaS"],
  disqualifiers: [],
  timestamp: "2026-01-01T00:00:00.000Z",
};

beforeEach(() => {
  mockFetch.mockReset();
  process.env.HUBSPOT_ACCESS_TOKEN = "test-token-abc";
});

afterEach(() => {
  delete process.env.HUBSPOT_ACCESS_TOKEN;
});

describe("POST /api/hubspot", () => {
  it("returns 400 when HUBSPOT_ACCESS_TOKEN is not set", async () => {
    delete process.env.HUBSPOT_ACCESS_TOKEN;
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/HUBSPOT_ACCESS_TOKEN/i);
  });

  it("returns 400 for empty leads array", async () => {
    const res = await POST(makeRequest({ leads: [] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/non-empty/i);
  });

  it("returns 400 when leads exceeds 100 (HubSpot batch limit)", async () => {
    const res = await POST(makeRequest({ leads: Array(101).fill(validLead) }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/100/);
  });

  it("returns 400 when leads is not an array", async () => {
    const res = await POST(makeRequest({ leads: "not an array" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when leads key is missing", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
  });

  it("calls HubSpot batch upsert with correct payload and auth header", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: "123" }], errors: [] }) });

    await POST(makeRequest({ leads: [validLead] }));

    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("https://api.hubapi.com/crm/v3/objects/contacts/batch/upsert");
    expect(init.method).toBe("POST");
    expect(init.headers["Authorization"]).toBe("Bearer test-token-abc");
    expect(init.headers["Content-Type"]).toBe("application/json");

    const body = JSON.parse(init.body);
    expect(body.idProperty).toBe("email");
    expect(body.inputs).toHaveLength(1);
    const c = body.inputs[0];
    expect(c.id).toBe("jane@acme.com");
    expect(c.properties.email).toBe("jane@acme.com");
    expect(c.properties.firstname).toBe("Jane");
    expect(c.properties.lastname).toBe("Doe");
    expect(c.properties.company).toBe("Acme Corp");
    expect(c.properties.jobtitle).toBe("VP Sales");
    expect(c.properties.lead_score).toBe(85);
    expect(c.properties.lead_tier).toBe("1");
  });

  it("deduplicates leads with the same email — only sends one", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: "123" }], errors: [] }) });

    const res = await POST(makeRequest({ leads: [validLead, { ...validLead, score: 99 }] }));
    expect(res.status).toBe(200);

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.inputs).toHaveLength(1);
  });

  it("splits multi-word name: first word = firstname, rest = lastname", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{}], errors: [] }) });
    const lead = { ...validLead, input: { ...validLead.input, name: "Mary Jane Watson" } };
    await POST(makeRequest({ leads: [lead] }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.inputs[0].properties.firstname).toBe("Mary");
    expect(body.inputs[0].properties.lastname).toBe("Jane Watson");
  });

  it("handles single-word name — lastname is empty string", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{}], errors: [] }) });
    const lead = { ...validLead, input: { ...validLead.input, name: "Prince" } };
    await POST(makeRequest({ leads: [lead] }));
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.inputs[0].properties.firstname).toBe("Prince");
    expect(body.inputs[0].properties.lastname).toBe("");
  });

  it("returns { pushed, errors } on success", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{}, {}], errors: [] }) });
    const secondLead = { ...validLead, input: { ...validLead.input, email: "bob@acme.com" } };
    const res = await POST(makeRequest({ leads: [validLead, secondLead] }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.pushed).toBe(2);
    expect(body.errors).toEqual([]);
  });

  it("returns 502 when HubSpot responds non-ok", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false, status: 401, json: async () => ({ message: "Unauthorized" }) });
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(502);
    expect((await res.json()).error).toMatch(/401/);
  });

  it("returns 500 when fetch throws", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));
    const res = await POST(makeRequest({ leads: [validLead] }));
    expect(res.status).toBe(500);
    expect((await res.json()).error).toBe("Internal error");
  });
});
