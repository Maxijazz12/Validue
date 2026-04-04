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

    if (tierKey !== "pro") {
      setError("Unsupported plan.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = await createSubscriptionSession("pro");
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
        className={`w-full py-3 rounded-full text-[14px] font-medium cursor-pointer transition-all duration-300 text-center disabled:opacity-50 disabled:cursor-not-allowed ${
          featured
            ? "bg-white text-text-primary hover:bg-white/90 shadow-sm"
            : "bg-text-primary text-white hover:bg-text-primary/90 shadow-sm"
        }`}
      >
        {loading ? "Processing..." : cta}
      </button>
      {error && (
        <p className="text-[13px] text-red-500 mt-2 text-center">{error}</p>
      )}
    </div>
  );
}
