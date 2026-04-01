"use client";

import { useState } from "react";

type ExportResponsesButtonProps = {
  campaignId: string;
  hasExport: boolean;
};

export default function ExportResponsesButton({
  campaignId,
  hasExport,
}: ExportResponsesButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleExport() {
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`/api/export/responses?campaignId=${campaignId}`);

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Export failed");
        setLoading(false);
        return;
      }

      // Trigger download
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ||
        "responses.csv";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      setError("Export failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!hasExport) {
    return (
      <div className="relative group">
        <button
          type="button"
          disabled
          className="inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-xl text-[12px] font-medium border border-[#E2E8F0] text-[#CBD5E1] bg-white cursor-not-allowed"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export CSV
        </button>
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-[6px] px-[10px] py-[4px] rounded-lg bg-[#111111] text-white text-[11px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
          Requires Pro plan
        </div>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={loading}
        className={`inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-xl text-[12px] font-medium border border-[#E2E8F0] text-[#64748B] bg-white hover:bg-[#FCFCFD] hover:border-[#CBD5E1] hover:text-[#111111] transition-all duration-200 cursor-pointer ${
          loading ? "opacity-50 cursor-not-allowed" : ""
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
        </svg>
        {loading ? "Exporting..." : "Export CSV"}
      </button>
      {error && (
        <p className="text-[11px] text-[#ef4444] mt-[4px]">{error}</p>
      )}
    </div>
  );
}
