"use client";

import { useEffect } from "react";
import Button from "@/components/ui/Button";
import { captureError } from "@/lib/sentry";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    captureError(error, { boundary: "dashboard" });
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-[80px] px-[24px]">
      <div className="w-[56px] h-[56px] rounded-2xl bg-error/10 flex items-center justify-center mb-[20px]">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
      <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">
        Something went wrong
      </h2>
      <p className="text-[14px] text-text-secondary max-w-[360px] text-center mb-[24px]">
        We hit an unexpected error loading this page. Our team has been notified.
      </p>
      {error.message && process.env.NODE_ENV === "development" && (
        <pre className="text-[12px] text-error bg-error/5 rounded-xl p-[12px] mb-[16px] max-w-[480px] overflow-auto whitespace-pre-wrap">
          {error.message}
        </pre>
      )}
      <Button onClick={reset} variant="primary">
        Try again
      </Button>
    </div>
  );
}
