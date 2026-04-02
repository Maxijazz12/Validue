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
        tierKey as "starter" | "pro"
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
        className={`w-full py-[12px] rounded-xl font-mono text-[10px] tracking-widest uppercase font-bold cursor-pointer transition-all duration-300 text-center disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? "bg-[#1C1917] text-white hover:bg-[#292524] shadow-[0_4px_16px_rgba(0,0,0,0.12)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.2)]"
            : "bg-transparent text-[#1C1917] border border-black/10 hover:border-[#1C1917] hover:bg-black/5"
        }`}
      >
        {loading ? "[ INITIALIZING PROTOCOL... ]" : `[ ${cta.toUpperCase()} ]`}
      </button>
      {error && (
        <p className="font-mono text-[9px] uppercase tracking-widest text-red-500 mt-[8px] text-center">{error}</p>
      )}
    </div>
  );
}
