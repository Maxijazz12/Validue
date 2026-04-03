"use client";

import { useState, useTransition } from "react";
import { retryCashout } from "./cashout-actions";

export default function RetryCashoutButton({ cashoutId }: { cashoutId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function handleRetry() {
    setError(null);
    startTransition(async () => {
      const result = await retryCashout(cashoutId);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  if (success) {
    return (
      <span className="font-mono text-[11px] font-medium text-success">Retry successful!</span>
    );
  }

  return (
    <span className="inline-flex items-center gap-[8px]">
      <button
        onClick={handleRetry}
        disabled={isPending}
        className="font-mono text-[11px] font-medium text-accent hover:text-accent-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "Retrying…" : "Retry"}
      </button>
      {error && <span className="font-mono text-[10px] text-error">{error}</span>}
    </span>
  );
}
