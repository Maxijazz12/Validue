"use client";

import Button from "@/components/ui/Button";

export default function SubmissionConfirmation() {
  return (
    <div className="flex flex-col items-center justify-center text-center py-[48px]">
      {/* Checkmark */}
      <div className="w-[64px] h-[64px] rounded-full bg-[#65a30d]/10 flex items-center justify-center mb-[20px]">
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#65a30d"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>

      <h2 className="text-[24px] font-bold text-[#111111] tracking-[-0.3px] mb-[8px]">
        Response submitted
      </h2>
      <p className="text-[15px] text-[#555555] max-w-[360px] mb-[32px]">
        Your feedback helps founders build better products. If this campaign
        rewards top answers, you&apos;ll be notified when results are in.
      </p>

      <div className="flex gap-[12px] max-sm:flex-col max-sm:w-full">
        <Button href="/dashboard/the-wall" className="px-[24px] py-[12px] text-[14px]">
          Back to The Wall
        </Button>
        <Button
          href="/dashboard/my-responses"
          variant="outline"
          className="px-[24px] py-[12px] text-[14px]"
        >
          View My Responses
        </Button>
      </div>
    </div>
  );
}
