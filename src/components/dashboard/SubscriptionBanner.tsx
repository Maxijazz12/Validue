"use client";

import { useSearchParams } from "next/navigation";
import { useState, useEffect } from "react";

export default function SubscriptionBanner() {
  const searchParams = useSearchParams();
  const subscribed = searchParams.get("subscribed");
  const shouldShow = !!subscribed && subscribed !== "false";
  const [visible, setVisible] = useState(shouldShow);

  useEffect(() => {
    if (shouldShow) {
      const timer = setTimeout(() => setVisible(false), 6000);
      return () => clearTimeout(timer);
    }
  }, [shouldShow]);

  if (!visible || !subscribed || subscribed === "false") return null;

  return (
    <div className="mb-[24px] p-[14px_20px] bg-success-mid/10 border border-success-mid/20 rounded-xl flex items-center justify-between">
      <p className="text-[14px] text-text-primary">
        <span className="font-semibold">Welcome to {subscribed.charAt(0).toUpperCase() + subscribed.slice(1)}!</span>{" "}
        Your plan is now active.
      </p>
      <button
        onClick={() => setVisible(false)}
        className="text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer p-[4px]"
        aria-label="Dismiss"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
