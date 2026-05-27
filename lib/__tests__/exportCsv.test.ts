// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { exportToCsv, exportMarkdown } from "../exportCsv";

let capturedContent = "";
let capturedFilename = "";

beforeEach(() => {
  capturedContent = "";
  capturedFilename = "";

  vi.stubGlobal("URL", {
    createObjectURL: vi.fn(() => "blob:fake"),
    revokeObjectURL: vi.fn(),
  });

  // Intercept Blob to capture the CSV string without needing FileReader
  const NativeBlob = globalThis.Blob;
  vi.stubGlobal("Blob", function (parts: BlobPart[]) {
    capturedContent = (parts as string[]).join("");
    return new NativeBlob(parts);
  });

  // Capture the filename from a.download when a.click() is called
  vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) {
    capturedFilename = this.download;
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const sampleRaw = [{ Name: "Jane Doe", Email: "jane@acme.com", Company: "Acme" }];
const sampleResult = [{
  input: { name: "Jane Doe", email: "jane@acme.com", company: "Acme", title: "VP Sales" },
  tier: "1",
  score: 85,
  confidence: "high",
  rationale: "Strong ICP match",
  signals_matched: ["B2B SaaS", "Series B"],
  disqualifiers: [],
}];

describe("exportToCsv", () => {
  it("returns early without throwing when rawRows is empty", () => {
    expect(() => exportToCsv([], sampleResult)).not.toThrow();
    expect(capturedContent).toBe("");
  });

  it("returns early without throwing when results is empty", () => {
    expect(() => exportToCsv(sampleRaw, [])).not.toThrow();
    expect(capturedContent).toBe("");
  });

  it("includes original + scoring headers", () => {
    exportToCsv(sampleRaw, sampleResult);
    const headers = capturedContent.split("\n")[0];
    expect(headers).toContain("Name");
    expect(headers).toContain("Email");
    expect(headers).toContain("tier");
    expect(headers).toContain("score");
    expect(headers).toContain("confidence");
    expect(headers).toContain("rationale");
    expect(headers).toContain("signals_matched");
    expect(headers).toContain("disqualifiers");
  });

  it("writes scoring values in the data row", () => {
    exportToCsv(sampleRaw, sampleResult);
    const dataRow = capturedContent.split("\n")[1];
    expect(dataRow).toContain("1");
    expect(dataRow).toContain("85");
    expect(dataRow).toContain("high");
    expect(dataRow).toContain("Strong ICP match");
    expect(dataRow).toContain("B2B SaaS; Series B");
  });

  it("escapes commas inside cell values", () => {
    const raw = [{ Name: "Doe, Jane", Email: "jane@acme.com", Company: "Acme" }];
    const result = [{ ...sampleResult[0], rationale: "Good, very good" }];
    exportToCsv(raw, result);
    expect(capturedContent).toContain('"Doe, Jane"');
    expect(capturedContent).toContain('"Good, very good"');
  });

  it("escapes double-quotes inside cell values", () => {
    const raw = [{ Name: 'He said "hi"', Email: "a@b.com", Company: "X" }];
    exportToCsv(raw, sampleResult);
    expect(capturedContent).toContain('"He said ""hi"""');
  });

  it("uses error message as rationale fallback", () => {
    const result = [{ input: sampleResult[0].input, error: "timeout" }];
    exportToCsv(sampleRaw, result);
    expect(capturedContent).toContain("Error: timeout");
  });

  it("uses provided filename", () => {
    exportToCsv(sampleRaw, sampleResult, "my-export.csv");
    expect(capturedFilename).toBe("my-export.csv");
  });

  it("generates a date-based filename when none provided", () => {
    exportToCsv(sampleRaw, sampleResult);
    expect(capturedFilename).toMatch(/^scored-leads-\d{4}-\d{2}-\d{2}\.csv$/);
  });
});

const sampleRecommendations = {
  summary: "Most leads are small B2C companies.",
  sourcing_suggestions: [
    {
      category: "Industry",
      finding: "60% of DQ leads are B2C retail",
      action: "Exclude retail SIC codes in Apollo",
    },
  ],
  rubric_gaps: [
    {
      type: "new_disqualifier",
      finding: "Retail companies consistently DQ",
      suggested_text: "DQ: Retail companies (SIC 5200-5999)",
    },
  ],
};

describe("exportMarkdown", () => {
  it("includes the summary in the output", () => {
    exportMarkdown(sampleRecommendations, 5);
    expect(capturedContent).toContain("Most leads are small B2C companies.");
  });

  it("includes the batch lead count", () => {
    exportMarkdown(sampleRecommendations, 5);
    expect(capturedContent).toContain("5 Tier 3 + DQ leads analyzed");
  });

  it("includes sourcing suggestion category, finding, and action", () => {
    exportMarkdown(sampleRecommendations, 5);
    expect(capturedContent).toContain("**Industry**");
    expect(capturedContent).toContain("60% of DQ leads are B2C retail");
    expect(capturedContent).toContain("Exclude retail SIC codes in Apollo");
  });

  it("includes rubric gap type, finding, and suggested text", () => {
    exportMarkdown(sampleRecommendations, 5);
    expect(capturedContent).toContain("**new_disqualifier**");
    expect(capturedContent).toContain("Retail companies consistently DQ");
    expect(capturedContent).toContain("DQ: Retail companies (SIC 5200-5999)");
  });

  it("uses provided filename", () => {
    exportMarkdown(sampleRecommendations, 3, "my-recs.md");
    expect(capturedFilename).toBe("my-recs.md");
  });

  it("generates a date-based filename when none provided", () => {
    exportMarkdown(sampleRecommendations, 3);
    expect(capturedFilename).toMatch(/^lead-recommendations-\d{4}-\d{2}-\d{2}\.md$/);
  });
});
