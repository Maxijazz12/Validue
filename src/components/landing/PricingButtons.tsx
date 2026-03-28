"use client";

import { useState } from "react";
import { createSubscriptionSession } from "@/app/dashboard/ideas/new/payment-actions";

export default function PricingButton({
  tierKey,
  cta,
  featured,
}: {
  tierKey: string;
  cta: string;
  featured: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClick() {
    if (tierKey === "free") {
      window.location.href = "/auth/signup";
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createSubscriptionSession(
        tierKey as "starter" | "pro" | "scale"
      );
      if ("error" in result) {
        setError(result.error);
        setLoading(false);
        return;
      }
      window.location.href = result.url;
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={loading}
        className={`w-full py-[12px] rounded-xl text-[14px] font-semibold font-sans cursor-pointer transition-all duration-200 text-center disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? "bg-[#111111] text-white hover:bg-[#1a1a1a] shadow-[0_1px_3px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_20px_rgba(229,101,78,0.12),0_1px_4px_rgba(229,101,78,0.06)]"
            : "bg-transparent text-[#111111] border border-[#E2E8F0] hover:border-[#CBD5E1]"
        }`}
      >
        {loading ? "Redirecting to checkout..." : cta}
      </button>
      {error && (
        <p className="text-[12px] text-red-500 mt-[6px] text-center">{error}</p>
      )}
    </div>
  );
}
