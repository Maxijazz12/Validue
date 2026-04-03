"use client";

import { useState } from "react";
import { completeCampaign, pauseCampaign, resumeCampaign } from "@/app/dashboard/ideas/[id]/campaign-actions";

export function CompleteCampaignButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleComplete() {
    if (!confirming) {
      setConfirming(true);
      return;
    }
    setLoading(true);
    setError(null);
    const result = await completeCampaign(campaignId);
    if ("error" in result) setError(result.error);
    setLoading(false);
    setConfirming(false);
  }

  return (
    <div>
      <button
        onClick={handleComplete}
        disabled={loading}
        className={`px-[16px] py-[8px] rounded-lg border text-[13px] font-medium transition-all cursor-pointer bg-white disabled:opacity-50 ${
          confirming
            ? "border-brand text-brand hover:bg-brand/5"
            : "border-border-light text-text-secondary hover:text-text-primary hover:border-border-muted"
        }`}
      >
        {loading ? "Completing..." : confirming ? "Are you sure?" : "Complete Campaign"}
      </button>
      {confirming && !loading && (
        <button
          onClick={() => setConfirming(false)}
          className="ml-[8px] text-[12px] text-slate hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors"
        >
          Cancel
        </button>
      )}
      {error && <p className="text-[12px] text-red-500 mt-[4px]">{error}</p>}
    </div>
  );
}

export function PauseCampaignButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handlePause() {
    setLoading(true);
    setError(null);
    const result = await pauseCampaign(campaignId);
    if ("error" in result) setError(result.error);
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handlePause}
        disabled={loading}
        className="px-[16px] py-[8px] rounded-xl border border-border-light text-[13px] font-medium text-text-secondary hover:text-text-primary hover:border-border-muted transition-all duration-200 cursor-pointer bg-white disabled:opacity-50"
      >
        {loading ? "Pausing..." : "Pause Campaign"}
      </button>
      {error && <p className="text-[12px] text-red-500 mt-[4px]">{error}</p>}
    </div>
  );
}

export function ResumeCampaignButton({ campaignId }: { campaignId: string }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleResume() {
    setLoading(true);
    setError(null);
    const result = await resumeCampaign(campaignId);
    if ("error" in result) setError(result.error);
    setLoading(false);
  }

  return (
    <div>
      <button
        onClick={handleResume}
        disabled={loading}
        className="px-[20px] py-[10px] rounded-xl bg-success text-white text-[14px] font-medium hover:bg-[#16a34a] transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
      >
        {loading ? "Resuming..." : "Resume Campaign"}
      </button>
      {error && <p className="text-[12px] text-red-500 mt-[4px]">{error}</p>}
    </div>
  );
}
