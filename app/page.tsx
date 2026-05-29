"use client";

import { useRef, useState } from "react";
import { useLocalStorage } from "@/lib/useLocalStorage";
import Papa from "papaparse";
import { mapColumns, applyMap, type ColumnMap, type MappedLead } from "@/lib/mapColumns";
import { exportToCsv, exportMarkdown, type RecommendationsResponse } from "@/lib/exportCsv";

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
  const [fileName, setFileName] = useLocalStorage<string | null>("lt:fileName", null);
  const [parsedLeads, setParsedLeads] = useLocalStorage<MappedLead[]>("lt:parsedLeads", []);
  const [rawRows, setRawRows] = useLocalStorage<Record<string, string>[]>("lt:rawRows", []);
  const [columnMap, setColumnMap] = useLocalStorage<ColumnMap | null>("lt:columnMap", null);
  const [results, setResults] = useLocalStorage<ScoringResult[]>("lt:results", []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [visibleTiers, setVisibleTiers] = useState<Set<string>>(
    new Set(["1", "2", "3", "DQ"])
  );
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [recommendations, setRecommendations] = useLocalStorage<RecommendationsResponse | null>("lt:recommendations", null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [hubspotResult, setHubspotResult] = useState<{ pushed: number } | null>(null);
  const [hubspotError, setHubspotError] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; status: number } | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);

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

  const toggleTier = (tier: string) => {
    setVisibleTiers(prev => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier); else next.add(tier);
      return next;
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
    setRecommendations(null);
    setRecommendationsError(null);
    setSelectedLeads(new Set());
    setHubspotResult(null);
    setHubspotError(null);
    setWebhookResult(null);
    setWebhookError(null);

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

  const handleRecommend = async () => {
    const lowQualityLeads = results.filter(
      (r) => !r.error && (r.tier === "3" || r.tier === "DQ")
    );
    if (lowQualityLeads.length === 0) return;

    setRecommendationsLoading(true);
    setRecommendationsError(null);
    setRecommendations(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: lowQualityLeads }),
      });

      const data = await response.json();

      if (!response.ok) {
        setRecommendationsError(data.error || "Something went wrong");
      } else {
        setRecommendations(data);
      }
    } catch (e: unknown) {
      setRecommendationsError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setRecommendationsLoading(false);
    }
  };

  const toggleLeadSelection = (email: string) => {
    setSelectedLeads(prev => {
      const next = new Set(prev);
      if (next.has(email)) next.delete(email); else next.add(email);
      return next;
    });
  };

  const handleHubspotPush = async () => {
    const leadsToSend = results.filter(r => !r.error && r.input.email && selectedLeads.has(r.input.email));
    if (leadsToSend.length === 0) return;
    if (leadsToSend.length > 100) {
      setHubspotError("HubSpot batch limit is 100 contacts. Deselect some leads and try again.");
      return;
    }
    setHubspotLoading(true);
    setHubspotResult(null);
    setHubspotError(null);
    try {
      const res = await fetch("/api/hubspot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: leadsToSend }),
      });
      const data = await res.json();
      if (!res.ok) setHubspotError(data.error || "HubSpot push failed");
      else setHubspotResult({ pushed: data.pushed });
    } catch (e: unknown) {
      setHubspotError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setHubspotLoading(false);
    }
  };

  const handleWebhook = async () => {
    if (results.length === 0) return;
    setWebhookLoading(true);
    setWebhookResult(null);
    setWebhookError(null);
    const tiers: Record<string, number> = {};
    for (const r of results) { if (r.tier) tiers[r.tier] = (tiers[r.tier] ?? 0) + 1; }
    try {
      const res = await fetch("/api/webhook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: results,
          meta: { fileName: fileName ?? "unknown", total: results.length, tiers },
        }),
      });
      const data = await res.json();
      if (!res.ok) setWebhookError(data.error || "Webhook failed");
      else setWebhookResult({ ok: data.ok, status: data.status });
    } catch (e: unknown) {
      setWebhookError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setWebhookLoading(false);
    }
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

  const filteredResults = results.filter(r =>
    r.error || (r.tier && visibleTiers.has(r.tier))
  );

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
            <div className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg">
              <div className="flex items-center gap-3">
                <span className="text-lg">✅</span>
                <div>
                  <div className="font-medium text-sm text-gray-900">{fileName}</div>
                  <div className="text-xs text-gray-500">{parsedLeads.length} leads detected</div>
                </div>
              </div>
              <button
                onClick={() => {
                  setFileName(null);
                  setParsedLeads([]);
                  setRawRows([]);
                  setColumnMap(null);
                  setResults([]);
                  setRecommendations(null);
                  setSelectedLeads(new Set());
                  setHubspotResult(null);
                  setHubspotError(null);
                  setWebhookResult(null);
                  setWebhookError(null);
                }}
                className="text-xs text-gray-400 hover:text-gray-700 underline"
              >
                Clear
              </button>
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
              <div className="flex gap-2">
                {results.some((r) => !r.error && (r.tier === "3" || r.tier === "DQ")) && (
                  <button
                    onClick={handleRecommend}
                    disabled={recommendationsLoading}
                    className="px-4 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed"
                  >
                    {recommendationsLoading ? "Analyzing…" : "Analyze & Recommend"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleHubspotPush}
                  disabled={hubspotLoading || selectedLeads.size === 0}
                  className="px-4 py-1.5 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:bg-orange-300 disabled:cursor-not-allowed"
                >
                  {hubspotLoading ? "Pushing…" : `Push to HubSpot (${selectedLeads.size})`}
                </button>

                <button
                  type="button"
                  onClick={handleWebhook}
                  disabled={webhookLoading || results.length === 0}
                  className="px-4 py-1.5 text-sm bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:bg-violet-300 disabled:cursor-not-allowed"
                >
                  {webhookLoading ? "Sending…" : "Send to Webhook"}
                </button>

                <button
                  onClick={() => {
                    const filteredPairs = results
                      .map((r, i) => ({ r, raw: rawRows[i] }))
                      .filter(({ r }) => !r.error && r.tier && visibleTiers.has(r.tier));
                    exportToCsv(filteredPairs.map(p => p.raw), filteredPairs.map(p => p.r));
                  }}
                  className="px-4 py-1.5 text-sm bg-black text-white rounded-md hover:bg-gray-800"
                >
                  ⬇ Export CSV
                </button>
              </div>
            </div>

            {hubspotResult && (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                Pushed {hubspotResult.pushed} contact{hubspotResult.pushed !== 1 ? "s" : ""} to HubSpot
              </div>
            )}
            {hubspotError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center justify-between">
                <span>HubSpot error: {hubspotError}</span>
                {!hubspotError.includes("batch limit") && (
                  <button type="button" onClick={handleHubspotPush} className="ml-4 underline text-red-700 hover:text-red-900">Retry</button>
                )}
              </div>
            )}
            {webhookResult && (
              <div className={`p-3 border rounded-md text-sm flex items-center justify-between ${webhookResult.ok ? "bg-green-50 border-green-200 text-green-800" : "bg-yellow-50 border-yellow-200 text-yellow-800"}`}>
                <span>{webhookResult.ok ? `Sent (${webhookResult.status})` : `Webhook responded with ${webhookResult.status}`}</span>
                {!webhookResult.ok && (
                  <button type="button" onClick={handleWebhook} className="ml-4 underline text-yellow-700 hover:text-yellow-900">Retry</button>
                )}
              </div>
            )}
            {webhookError && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center justify-between">
                <span>Webhook error: {webhookError}</span>
                <button type="button" onClick={handleWebhook} className="ml-4 underline text-red-700 hover:text-red-900">Retry</button>
              </div>
            )}

            {recommendationsError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm flex items-center justify-between">
                <span>Recommendations error: {recommendationsError}</span>
                <button onClick={handleRecommend} className="ml-4 underline text-red-700 hover:text-red-900">
                  Retry
                </button>
              </div>
            )}

            {recommendations && (
              <div className="bg-white border border-indigo-200 rounded-lg p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-gray-900">Search Refinement Recommendations</h3>
                  <button
                    onClick={() => {
                      const lowCount = results.filter(
                        (r) => !r.error && (r.tier === "3" || r.tier === "DQ")
                      ).length;
                      exportMarkdown(recommendations, lowCount);
                    }}
                    className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                  >
                    ⬇ Download .md
                  </button>
                </div>

                <p className="text-sm text-gray-700">{recommendations.summary}</p>

                {recommendations.sourcing_suggestions.length > 0 && (
                  <details open>
                    <summary className="font-medium text-sm text-gray-900 cursor-pointer select-none">
                      Sourcing Suggestions ({recommendations.sourcing_suggestions.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {recommendations.sourcing_suggestions.map((s, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-indigo-200">
                          <span className="font-medium text-gray-900">{s.category}:</span> {s.finding}
                          <div className="text-indigo-700 mt-0.5">→ {s.action}</div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}

                {recommendations.rubric_gaps.length > 0 && (
                  <details open>
                    <summary className="font-medium text-sm text-gray-900 cursor-pointer select-none">
                      Rubric Gaps ({recommendations.rubric_gaps.length})
                    </summary>
                    <ul className="mt-2 space-y-2">
                      {recommendations.rubric_gaps.map((g, i) => (
                        <li key={i} className="text-sm text-gray-700 pl-3 border-l-2 border-yellow-300">
                          <span className="font-medium text-gray-900 capitalize">{g.type.replace(/_/g, " ")}:</span> {g.finding}
                          <div className="text-yellow-700 mt-0.5 font-mono text-xs bg-yellow-50 rounded px-2 py-1">{g.suggested_text}</div>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1">
              <div className="flex flex-wrap gap-2 items-center">
                {(["1", "2", "3", "DQ"] as const).map((tier) => {
                  const active = visibleTiers.has(tier);
                  const activeClass =
                    tier === "1" ? "bg-green-100 text-green-800" :
                    tier === "2" ? "bg-yellow-100 text-yellow-800" :
                    tier === "3" ? "bg-gray-100 text-gray-800" :
                    "bg-red-100 text-red-800";
                  const inactiveClass =
                    tier === "1" ? "bg-white text-green-800 border border-green-300 opacity-50" :
                    tier === "2" ? "bg-white text-yellow-800 border border-yellow-300 opacity-50" :
                    tier === "3" ? "bg-white text-gray-800 border border-gray-300 opacity-50" :
                    "bg-white text-red-800 border border-red-300 opacity-50";
                  return (
                    <button
                      key={tier}
                      onClick={() => toggleTier(tier)}
                      className={`px-3 py-1 rounded-full text-sm font-medium cursor-pointer ${active ? activeClass : inactiveClass}`}
                    >
                      {tier === "DQ" ? "DQ" : `Tier ${tier}`}
                    </button>
                  );
                })}
              </div>
              <span className="text-xs text-gray-500">
                Showing {filteredResults.filter(r => !r.error).length} of {results.filter(r => !r.error).length} leads
                {results.some(r => r.error) && ` · ${results.filter(r => r.error).length} error(s)`}
              </span>
            </div>

            <h2 className="text-xl font-semibold text-gray-900">Results ({filteredResults.length})</h2>

            {filteredResults.map((r, i) => (
              <div key={r.input.email || i} className="bg-white p-5 rounded-md border border-gray-200 shadow-sm">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-semibold">{r.input.name || "(no name)"}</div>
                    <div className="text-sm text-gray-600">
                      {r.input.email} · {r.input.company}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {r.tier && (
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${tierColor(r.tier)}`}>
                        Tier {r.tier} · {r.score}
                      </span>
                    )}
                    {!r.error && r.input.email && (
                      <input
                        type="checkbox"
                        className="w-4 h-4 cursor-pointer accent-black"
                        checked={selectedLeads.has(r.input.email)}
                        onChange={() => toggleLeadSelection(r.input.email)}
                        aria-label={`Select ${r.input.name || r.input.email}`}
                      />
                    )}
                  </div>
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
