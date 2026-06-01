"use client";

import { useState } from "react";
import Papa from "papaparse";
import { useLocalStorage } from "@/lib/useLocalStorage";
import { mapColumns, applyMap, type ColumnMap, type MappedLead } from "@/lib/mapColumns";
import { type RecommendationsResponse } from "@/lib/exportCsv";
import type { ScoringResult } from "@/lib/types";
import {
  SAMPLE_COLUMN_MAP,
  SAMPLE_FILE_NAME,
  SAMPLE_LEADS,
  SAMPLE_RAW_ROWS,
  SAMPLE_RESULTS,
} from "@/lib/sampleData";

import { TopBar } from "@/components/TopBar";
import { SiteFooter } from "@/components/SiteFooter";
import { DropZone } from "@/components/DropZone";
import { ColumnMapBadges } from "@/components/ColumnMapBadges";
import { EmptyState } from "@/components/EmptyState";
import { LoadingState } from "@/components/LoadingState";
import { ResultsDashboard } from "@/components/ResultsDashboard";
import { RecommendationsPanel } from "@/components/RecommendationsPanel";
import { LeadTable } from "@/components/LeadTable";
import { HowItWorks } from "@/components/HowItWorks";

export default function Home() {
  const [fileName, setFileName] = useLocalStorage<string | null>("lt:fileName", null);
  const [parsedLeads, setParsedLeads] = useLocalStorage<MappedLead[]>("lt:parsedLeads", []);
  const [rawRows, setRawRows] = useLocalStorage<Record<string, string>[]>("lt:rawRows", []);
  const [columnMap, setColumnMap] = useLocalStorage<ColumnMap | null>("lt:columnMap", null);
  const [results, setResults] = useLocalStorage<ScoringResult[]>("lt:results", []);
  const [recommendations, setRecommendations] = useLocalStorage<RecommendationsResponse | null>("lt:recommendations", null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recommendationsLoading, setRecommendationsLoading] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(null);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [hubspotLoading, setHubspotLoading] = useState(false);
  const [hubspotResult, setHubspotResult] = useState<{ pushed: number } | null>(null);
  const [hubspotError, setHubspotError] = useState<string | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{ ok: boolean; status: number } | null>(null);
  const [webhookError, setWebhookError] = useState<string | null>(null);

  const resetDownstream = () => {
    setResults([]);
    setRecommendations(null);
    setRecommendationsError(null);
    setError(null);
  };

  const handleFile = (file: File) => {
    if (!file.name.endsWith(".csv")) {
      setError("Please upload a .csv file");
      return;
    }
    resetDownstream();
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const headers = result.meta.fields ?? [];
        const map = mapColumns(headers);
        const rows = result.data as Record<string, string>[];
        setColumnMap(map);
        setRawRows(rows);
        setParsedLeads(rows.map((row) => applyMap(row, map)));
        setFileName(file.name);
      },
    });
  };

  const handleLoadSample = () => {
    resetDownstream();
    setColumnMap(SAMPLE_COLUMN_MAP);
    setRawRows(SAMPLE_RAW_ROWS);
    setParsedLeads(SAMPLE_LEADS);
    setFileName(SAMPLE_FILE_NAME);
    // Sample mode is pre-scored — render the full dashboard with no API call.
    setResults(SAMPLE_RESULTS);
  };

  const handleClear = () => {
    setFileName(null);
    setParsedLeads([]);
    setRawRows([]);
    setColumnMap(null);
    resetDownstream();
  };

  const handleScore = async () => {
    if (parsedLeads.length === 0) {
      setError("Upload a CSV file with at least one lead");
      return;
    }
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

    try {
      const response = await fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: parsedLeads }),
      });
      const data = await response.json();
      if (!response.ok) setError(data.error || "Something went wrong");
      else setResults(data.results);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handleRecommend = async () => {
    const lowQuality = results.filter(
      (r) => !r.error && (r.tier === "3" || r.tier === "DQ")
    );
    if (lowQuality.length === 0) return;

    setRecommendationsLoading(true);
    setRecommendationsError(null);
    setRecommendations(null);

    try {
      const response = await fetch("/api/recommendations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads: lowQuality }),
      });
      const data = await response.json();
      if (!response.ok) setRecommendationsError(data.error || "Something went wrong");
      else setRecommendations(data);
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

  const hasResults = results.length > 0;
  const hasFile = Boolean(fileName && columnMap);

  return (
    <>
      <TopBar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        {/* Hero */}
        <section className="mb-8 max-w-2xl">
          <span className="inline-flex items-center rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
            RevOps · Lead scoring
          </span>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Score inbound leads against your ICP — in seconds.
          </h1>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            Upload a CRM export and get tiered fit scores, a pipeline-quality
            dashboard, and upstream sourcing recommendations. Scoring criteria
            live in a plain-markdown rubric the model reads verbatim.
          </p>
        </section>

        {/* Tool zone */}
        <div className="space-y-4">
          <DropZone onFile={handleFile} onLoadSample={handleLoadSample} />

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              {error}
            </div>
          )}

          {hasFile && (
            <ColumnMapBadges
              fileName={fileName!}
              columnMap={columnMap!}
              leadCount={parsedLeads.length}
              onClear={handleClear}
            />
          )}

          {hasFile && !hasResults && !loading && (
            <button
              onClick={handleScore}
              disabled={loading || parsedLeads.length === 0}
              className="rounded-lg bg-accent px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Score {parsedLeads.length} lead{parsedLeads.length === 1 ? "" : "s"} →
            </button>
          )}

          {!hasFile && !hasResults && !loading && (
            <EmptyState onLoadSample={handleLoadSample} />
          )}
        </div>

        {/* Loading */}
        {loading && (
          <div className="mt-8">
            <LoadingState count={Math.min(parsedLeads.length || 6, 8)} />
          </div>
        )}

        {/* Results */}
        {hasResults && !loading && (
          <div className="mt-10 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-900">
                Pipeline fit
              </h2>
              {fileName === SAMPLE_FILE_NAME && (
                <span className="rounded-full bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
                  Sample data
                </span>
              )}
            </div>

            <ResultsDashboard results={results} />

            <RecommendationsPanel
              results={results}
              recommendations={recommendations}
              loading={recommendationsLoading}
              error={recommendationsError}
              onAnalyze={handleRecommend}
            />

            <LeadTable
              results={results}
              rawRows={rawRows}
              selectedLeads={selectedLeads}
              onToggleSelection={toggleLeadSelection}
            />

            {/* Sync: push selected leads to HubSpot · forward full run to a webhook */}
            <div className="space-y-3 rounded-xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-slate-600">
                  Sync scored leads to your stack.{" "}
                  {selectedLeads.size > 0
                    ? `${selectedLeads.size} selected for HubSpot.`
                    : "Select rows above to push to HubSpot."}
                </p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleHubspotPush}
                    disabled={hubspotLoading || selectedLeads.size === 0}
                    className="rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-orange-700 disabled:cursor-not-allowed disabled:bg-orange-300"
                  >
                    {hubspotLoading ? "Pushing…" : `Push to HubSpot (${selectedLeads.size})`}
                  </button>
                  <button
                    type="button"
                    onClick={handleWebhook}
                    disabled={webhookLoading || results.length === 0}
                    className="rounded-lg bg-violet-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:cursor-not-allowed disabled:bg-violet-300"
                  >
                    {webhookLoading ? "Sending…" : "Send to webhook"}
                  </button>
                </div>
              </div>

              {hubspotResult && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-2.5 text-sm text-green-800">
                  Pushed {hubspotResult.pushed} contact{hubspotResult.pushed !== 1 ? "s" : ""} to HubSpot
                </div>
              )}
              {hubspotError && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                  <span>HubSpot error: {hubspotError}</span>
                  {!hubspotError.includes("batch limit") && (
                    <button type="button" onClick={handleHubspotPush} className="ml-4 underline hover:text-red-900">
                      Retry
                    </button>
                  )}
                </div>
              )}
              {webhookResult && (
                <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${webhookResult.ok ? "border-green-200 bg-green-50 text-green-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
                  <span>{webhookResult.ok ? `Sent (${webhookResult.status})` : `Webhook responded with ${webhookResult.status}`}</span>
                  {!webhookResult.ok && (
                    <button type="button" onClick={handleWebhook} className="ml-4 underline hover:text-amber-900">
                      Retry
                    </button>
                  )}
                </div>
              )}
              {webhookError && (
                <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-sm text-red-800">
                  <span>Webhook error: {webhookError}</span>
                  <button type="button" onClick={handleWebhook} className="ml-4 underline hover:text-red-900">
                    Retry
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* How it works */}
        <div className="mt-14">
          <HowItWorks />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
