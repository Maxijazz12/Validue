"use client";

import { useState } from "react";

export default function ProfilePrompt() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="flex items-center justify-between gap-[16px] bg-[#E5654E]/6 border border-[#E5654E]/15 rounded-xl p-[16px] mb-[24px]">
      <div className="flex items-center gap-[12px] min-w-0">
        <div className="w-[36px] h-[36px] rounded-full bg-[#E5654E]/10 flex items-center justify-center shrink-0">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#CC5340" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#111111]">
            Complete your profile to unlock matched ideas
          </p>
          <p className="text-[12px] text-[#64748B] mt-[2px]">
            We surface campaigns where your background makes you the ideal respondent.
          </p>
        </div>
      </div>
      <div className="flex items-center gap-[8px] shrink-0">
        <a
          href="/dashboard/settings"
          className="inline-flex items-center justify-center px-[16px] py-[8px] rounded-xl text-[13px] font-medium bg-[#111111] text-white hover:bg-[#1a1a1a] hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)] transition-all duration-200 no-underline"
        >
          Complete Profile
        </a>
        <button
          onClick={() => setDismissed(true)}
          className="text-[#94A3B8] hover:text-[#64748B] bg-transparent border-none cursor-pointer p-[4px]"
          aria-label="Dismiss"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
