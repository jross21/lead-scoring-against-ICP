"use client";

import { useRef, useState } from "react";

export function DropZone({
  onFile,
  onLoadSample,
}: {
  onFile: (file: File) => void;
  onLoadSample: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files[0];
        if (file) onFile(file);
      }}
      className={`rounded-2xl border-2 border-dashed p-10 text-center transition-colors ${
        dragging
          ? "border-accent bg-accent-soft"
          : "border-slate-300 bg-surface hover:border-slate-400"
      }`}
    >
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-surface-muted text-2xl">
        📂
      </div>
      <p className="font-medium text-slate-800">Drop a CSV export here</p>
      <p className="mt-1 text-sm text-slate-500">
        Any column structure works — name, email, company, and title are
        auto-detected.
      </p>
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-700"
        >
          Choose file
        </button>
        <button
          onClick={onLoadSample}
          className="rounded-lg border border-accent/30 bg-accent-soft px-5 py-2.5 text-sm font-medium text-accent transition-colors hover:bg-indigo-100"
        >
          ✨ Try sample data
        </button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
        }}
      />
    </div>
  );
}
