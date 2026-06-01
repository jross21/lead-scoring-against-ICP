import type { ColumnMap } from "@/lib/mapColumns";

export function ColumnMapBadges({
  fileName,
  columnMap,
  leadCount,
  onClear,
}: {
  fileName: string;
  columnMap: ColumnMap;
  leadCount: number;
  onClear: () => void;
}) {
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
    badges.push({
      label: `+ ${columnMap.extra.length} extra column${columnMap.extra.length === 1 ? "" : "s"} → Claude`,
      isExtra: true,
    });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-100 text-base">
            ✅
          </span>
          <div>
            <div className="text-sm font-medium text-slate-900">{fileName}</div>
            <div className="text-xs text-slate-500">
              {leadCount} lead{leadCount === 1 ? "" : "s"} detected
            </div>
          </div>
        </div>
        <button
          onClick={onClear}
          className="text-xs text-slate-400 underline transition-colors hover:text-slate-700"
        >
          Clear
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-xs text-slate-500">Auto-mapped:</span>
        {badges.map((b, i) => (
          <span
            key={i}
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              b.isExtra
                ? "bg-amber-100 text-amber-800"
                : "bg-green-100 text-green-800"
            }`}
          >
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
