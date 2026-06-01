const REPO_URL = "https://github.com/jross21/lead-triage";

export function TopBar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-surface/80 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-sm font-bold text-white">
            L
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-semibold text-slate-900">
              LeadFit
            </span>
            <span className="block text-[11px] text-slate-400">
              ICP scoring engine
            </span>
          </div>
        </div>
        <nav className="flex items-center gap-4 text-sm text-slate-500">
          <a
            href="#how-it-works"
            className="hidden hover:text-slate-900 sm:inline"
          >
            How it works
          </a>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md border border-border px-3 py-1.5 font-medium text-slate-700 transition-colors hover:border-slate-300 hover:bg-surface-muted"
          >
            GitHub ↗
          </a>
        </nav>
      </div>
    </header>
  );
}
