const REPO_URL = "https://github.com/jross21/lead-triage";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-6 py-8 text-sm text-slate-500 sm:flex-row sm:items-center">
        <div>
          <span className="font-medium text-slate-700">LeadFit</span> — a RevOps
          lead-scoring demo. Built with Next.js, React, and the Claude API.
        </div>
        <div className="flex items-center gap-4">
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs text-slate-500">
            Next.js · TypeScript · Recharts · Claude
          </span>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-accent hover:underline"
          >
            Source ↗
          </a>
        </div>
      </div>
    </footer>
  );
}
