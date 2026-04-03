"use client";

import { useState, useTransition } from "react";
import { deleteAccount } from "./account-actions";

export default function DeleteAccountButton() {
  const [isPending, startTransition] = useTransition();
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (confirmText !== "DELETE") return;
    setError(null);
    startTransition(async () => {
      const result = await deleteAccount();
      if (result && "error" in result) {
        setError(result.error);
      }
    });
  }

  if (!showConfirm) {
    return (
      <div>
        {error && (
          <p className="text-[13px] text-red-600 font-medium mb-[12px]">{error}</p>
        )}
        <button
          onClick={() => setShowConfirm(true)}
          className="inline-flex items-center justify-center px-[24px] py-[12px] rounded-full text-[13px] font-bold tracking-wide border border-transparent bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-300 cursor-pointer"
        >
          Delete Account
        </button>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="text-[13px] text-red-600 font-medium mb-[12px]">{error}</p>
      )}
      <p className="text-[13px] font-medium text-red-900/70 mb-[12px]">
        Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm:
      </p>
      <div className="flex items-center gap-[12px]">
        <input
          type="text"
          value={confirmText}
          onChange={(e) => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="px-[14px] py-[10px] rounded-[12px] border border-red-200 bg-white text-[14px] font-mono font-bold text-red-600 outline-none focus:border-red-400 focus:ring-1 focus:ring-red-400 w-[120px]"
          autoComplete="off"
        />
        <button
          onClick={handleDelete}
          disabled={confirmText !== "DELETE" || isPending}
          className="inline-flex items-center justify-center px-[24px] py-[10px] rounded-full text-[13px] font-bold tracking-wide bg-red-600 text-white hover:bg-red-700 transition-all duration-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isPending ? "Deleting…" : "Permanently Delete"}
        </button>
        <button
          onClick={() => { setShowConfirm(false); setConfirmText(""); }}
          className="text-[13px] font-medium text-text-muted hover:text-text-primary transition-colors"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
