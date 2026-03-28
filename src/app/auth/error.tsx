"use client";

import Link from "next/link";

export default function AuthError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#FCFCFD] flex items-center justify-center px-[24px]">
      <div className="w-full max-w-[400px] text-center">
        <div className="w-[56px] h-[56px] rounded-2xl bg-[#ef4444]/10 flex items-center justify-center mx-auto mb-[20px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
          Authentication error
        </h2>
        <p className="text-[14px] text-[#64748B] mb-[24px]">
          Something went wrong during authentication. Please try again.
        </p>
        <div className="flex items-center justify-center gap-[12px]">
          <button
            onClick={reset}
            className="px-[20px] py-[10px] text-[14px] font-semibold text-white bg-[#111111] rounded-xl cursor-pointer border-none hover:bg-[#333333] transition-colors"
          >
            Try again
          </button>
          <Link
            href="/auth/login"
            className="text-[14px] font-medium text-[#64748B] hover:text-[#111111] no-underline transition-colors"
          >
            Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
