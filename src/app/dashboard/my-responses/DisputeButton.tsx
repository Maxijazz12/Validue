"use client";

import { useState, useTransition } from "react";
import { fileDispute } from "./dispute-actions";

type Props = {
  responseId: string;
  alreadyDisputed: boolean;
};

export default function DisputeButton({ responseId, alreadyDisputed }: Props) {
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (alreadyDisputed || success) {
    return (
      <span className="text-[10px] font-medium text-text-muted uppercase tracking-wide">
        {success ? "Dispute filed" : "Disputed"}
      </span>
    );
  }

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="text-[10px] font-medium text-text-muted uppercase tracking-wide hover:text-accent transition-colors"
      >
        Appeal
      </button>
    );
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const result = await fileDispute(responseId, reason);
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(true);
      }
    });
  }

  return (
    <div className="mt-[8px] p-[12px] bg-[#FAFAF9] rounded-[12px] border border-border-light">
      <p className="text-[12px] text-text-secondary font-medium mb-[8px]">
        Why do you disagree with this score?
      </p>
      <textarea
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Explain what was wrong with the scoring (min 20 characters)…"
        className="w-full px-[12px] py-[8px] rounded-[8px] border border-border-light bg-white text-[13px] text-text-primary outline-none focus:border-accent resize-none h-[60px]"
        maxLength={1000}
      />
      {error && <p className="text-[11px] text-error font-medium mt-[4px]">{error}</p>}
      <div className="flex items-center gap-[8px] mt-[8px]">
        <button
          onClick={handleSubmit}
          disabled={isPending || reason.trim().length < 20}
          className="px-[14px] py-[6px] rounded-lg bg-accent text-white text-[12px] font-medium hover:bg-accent-dark transition-colors disabled:opacity-40"
        >
          {isPending ? "Filing…" : "Submit Appeal"}
        </button>
        <button
          onClick={() => { setShowForm(false); setReason(""); setError(null); }}
          className="text-[12px] text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
