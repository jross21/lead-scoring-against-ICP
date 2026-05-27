"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { mapColumns, applyMap, type ColumnMap, type MappedLead } from "@/lib/mapColumns";
import { exportToCsv } from "@/lib/exportCsv";

type ScoringResult = {
  input: MappedLead;
  tier?: string;
  score?: number;
  confidence?: string;
  rationale?: string;
  signals_matched?: string[];
  disqualifiers?: string[];
  inferred_facts?: { industry: string; employee_range: string; is_b2b_saas: boolean | "unknown" };
  timestamp?: string;
  error?: string;
};

export default function Home() {
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedLeads, setParsedLeads] = useState<MappedLead[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [columnMap, setColumnMap] = useState<ColumnMap | null>(null);
  const [results, setResults] = useState<ScoringResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    setError(null);
    setResults([]);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const map = mapColumns(headers);
        const leads = (result.data as Record<string, string>[]).map((row) => applyMap(row, map));
        setColumnMap(map);
        setRawRows(result.data as Record<string, string>[]);
        setParsedLeads(leads);
        setFileName(file.name);
      },
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleScore = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    if (parsedLeads.length === 0) {
      setError("Upload a CSV file with at least one lead");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: parsedLeads }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Something went wrong");
      } else {
        setResults(data.results);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }

    setLoading(false);
  };

  const tierColor = (tier?: string) => {
    if (tier === "1") return "bg-green-100 text-green-800";
    if (tier === "2") return "bg-yellow-100 text-yellow-800";
    if (tier === "3") return "bg-gray-100 text-gray-800";
    if (tier === "DQ") return "bg-red-100 text-red-800";
    return "bg-gray-100 text-gray-800";
  };

  const mappedFieldBadges = (): { label: string; isExtra: boolean }[] => {
    if (!columnMap) return [];
    const badges: { label: string; isExtra: boolean }[] = [];
    if (columnMap.name) {
      const label = Array.isArray(columnMap.name)
        ? `${columnMap.name[0]} + ${columnMap.name[1]} → name`
        : `${columnMap.name} → name`;
      badges.push({ label, isExtra: false });
    }
    if (columnMap.email) badges.push({ label: `${columnMap.email} → email`, isExtra: false });
    if (columnMap.company) badges.push({ label: `${columnMap.company} → company`, isExtra: false });
    if (columnMap.title) badges.push({ label: `${columnMap.title} → title`, isExtra: false });
    if (columnMap.extra.length > 0) {
      badges.push({ label: `+ ${columnMap.extra.length} extra column${columnMap.extra.length === 1 ? "" : "s"} passed to Claude`, isExtra: true });
    }
    return badges;
  };

  const tierCount = (tier: string) => results.filter((r) => r.tier === tier).length;

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Lead Scoring Against ICP</h1>
        <p className="text-gray-600 mb-8">
          Upload a CSV export from your CRM — any column structure works. Each lead is scored against your ICP rubric using Claude.
        </p>

        {/* Drop zone */}
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors mb-4 ${
            dragging ? "border-blue-400 bg-blue-50" : "border-gray-300 bg-white hover:border-gray-400"
          }`}
        >
          <div className="text-4xl mb-3">📂</div>
          <p className="font-medium text-gray-800 mb-1">Drop a CSV file here</p>
          <p className="text-sm text-gray-500 mb-4">or click to browse — any columns work</p>
          <span className="px-4 py-2 bg-black text-white text-sm rounded-md">Choose File</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
          />
        </div>

        {/* File info + column mapping badges */}
        {fileName && columnMap && (
          <div className="mb-4 space-y-3">
            <div className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-lg">
              <span className="text-lg">✅</span>
              <div>
                <div className="font-medium text-sm text-gray-900">{fileName}</div>
                <div className="text-xs text-gray-500">{parsedLeads.length} leads detected</div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-gray-500 mr-1">Auto-mapped:</span>
              {mappedFieldBadges().map((b, i) => (
                <span
                  key={i}
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    b.isExtra ? "bg-yellow-100 text-yellow-800" : "bg-green-100 text-green-800"
                  }`}
                >
                  {b.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleScore}
          disabled={loading || parsedLeads.length === 0}
          className="px-6 py-2 bg-black text-white rounded-md hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "Scoring…" : parsedLeads.length > 0 ? `Score ${parsedLeads.length} Leads →` : "Score Leads"}
        </button>

        {error && (
          <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
            {error}
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-8 space-y-4">
            {/* Summary bar */}
            <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3">
              <div className="text-sm text-gray-600 space-x-3">
                <span className="text-green-700 font-medium">Tier 1: {tierCount("1")}</span>
                <span>·</span>
                <span className="text-yellow-700 font-medium">Tier 2: {tierCount("2")}</span>
                <span>·</span>
                <span className="text-gray-600 font-medium">Tier 3: {tierCount("3")}</span>
                <span>·</span>
                <span className="text-red-700 font-medium">DQ: {tierCount("DQ")}</span>
              </div>
              <button
                onClick={() => exportToCsv(rawRows, results)}
                className="px-4 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
              >
                ⬇ Export CSV
              </button>
            </div>

            <h2 className="text-xl font-semibold text-gray-900">Results ({results.length})</h2>

            {results.map((r, i) => (
              <div key={i} className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{r.input.name || "(no name)"}</div>
                    <div className="text-sm text-gray-600">
                      {r.input.email} · {r.input.company}
                    </div>
                  </div>
                  {r.tier && (
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColor(r.tier)}`}>
                      Tier {r.tier} · {r.score}
                    </span>
                  )}
                </div>

                {r.error ? (
                  <div className="text-sm text-red-600 mt-2">Error: {r.error}</div>
                ) : (
                  <>
                    <div className="text-sm text-gray-800 mt-2">{r.rationale}</div>
                    {r.signals_matched && r.signals_matched.length > 0 && (
                      <div className="text-xs text-gray-600 mt-3">
                        <strong>Matched:</strong> {r.signals_matched.join(", ")}
                      </div>
                    )}
                    {r.disqualifiers && r.disqualifiers.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        <strong>DQ flags:</strong> {r.disqualifiers.join(", ")}
                      </div>
                    )}
                    <div className="text-xs text-gray-500 mt-2">Confidence: {r.confidence}</div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
