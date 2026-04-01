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
            ? "border-[#E5654E] text-[#E5654E] hover:bg-[#E5654E]/5"
            : "border-[#E2E8F0] text-[#64748B] hover:text-[#111111] hover:border-[#CBD5E1]"
        }`}
      >
        {loading ? "Completing..." : confirming ? "Are you sure?" : "Complete Campaign"}
      </button>
      {confirming && !loading && (
        <button
          onClick={() => setConfirming(false)}
          className="ml-[8px] text-[12px] text-[#94A3B8] hover:text-[#111111] bg-transparent border-none cursor-pointer transition-colors"
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
        className="px-[16px] py-[8px] rounded-xl border border-[#E2E8F0] text-[13px] font-medium text-[#64748B] hover:text-[#111111] hover:border-[#CBD5E1] transition-all duration-200 cursor-pointer bg-white disabled:opacity-50"
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
        className="px-[20px] py-[10px] rounded-xl bg-[#22c55e] text-white text-[14px] font-medium hover:bg-[#16a34a] transition-all duration-200 cursor-pointer border-none disabled:opacity-50"
      >
        {loading ? "Resuming..." : "Resume Campaign"}
      </button>
      {error && <p className="text-[12px] text-red-500 mt-[4px]">{error}</p>}
    </div>
  );
}
