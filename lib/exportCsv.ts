type ScoringResult = {
  input: { name: string; email: string; company: string; title: string; extra?: Record<string, string> };
  tier?: string;
  score?: number;
  confidence?: string;
  rationale?: string;
  signals_matched?: string[];
  disqualifiers?: string[];
  error?: string;
};

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportToCsv(
  rawRows: Record<string, string>[],
  results: ScoringResult[],
  filename?: string
): void {
  if (rawRows.length === 0 || results.length === 0) return;

  const originalHeaders = Object.keys(rawRows[0]);
  const scoringHeaders = ["tier", "score", "confidence", "rationale", "signals_matched", "disqualifiers"];
  const allHeaders = [...originalHeaders, ...scoringHeaders];

  const csvRows = [allHeaders.map(escapeCsvCell).join(",")];

  const count = Math.min(rawRows.length, results.length);
  for (let i = 0; i < count; i++) {
    const raw = rawRows[i];
    const r = results[i];

    const row = [
      ...originalHeaders.map((h) => escapeCsvCell(raw[h] ?? "")),
      escapeCsvCell(r.tier ?? ""),
      escapeCsvCell(r.score != null ? String(r.score) : ""),
      escapeCsvCell(r.confidence ?? ""),
      escapeCsvCell(r.rationale ?? (r.error ? `Error: ${r.error}` : "")),
      escapeCsvCell((r.signals_matched ?? []).join("; ")),
      escapeCsvCell((r.disqualifiers ?? []).join("; ")),
    ];
    csvRows.push(row.join(","));
  }

  const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename ?? `scored-leads-${date}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
