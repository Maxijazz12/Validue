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
            ? "bg-[#1C1917] text-white hover:bg-[#292524] shadow-[0_2px_8px_rgba(28,25,23,0.12)] hover:shadow-[0_4px_20px_rgba(212,160,136,0.18),0_2px_6px_rgba(212,160,136,0.08)]"
            : "bg-transparent text-[#1C1917] border border-[#EDE8E3] hover:border-[#DDD6CE]"
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
