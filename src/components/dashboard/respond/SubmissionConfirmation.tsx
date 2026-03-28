"use client";

import Button from "@/components/ui/Button";

type SubmissionConfirmationProps = {
  campaignTitle?: string;
  rewardAmount?: number;
  rewardType?: string | null;
  questionCount?: number;
  totalTimeMs?: number;
};

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes === 0) return `${seconds} seconds`;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function SubmissionConfirmation({
  campaignTitle,
  rewardAmount,
  rewardType,
  questionCount,
  totalTimeMs,
}: SubmissionConfirmationProps) {
  const hasReward = rewardAmount && rewardAmount > 0;

  return (
    <div className="flex items-center justify-center py-[48px]">
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[48px] text-center relative overflow-hidden max-w-[480px] w-full">
        <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />

        {/* Confetti accent particles */}
        <div className="absolute top-[20px] left-[15%] w-[6px] h-[6px] rounded-full bg-[#E8C1B0]/40" style={{ animation: "confettiDrift 2s ease forwards 0.2s" }} />
        <div className="absolute top-[30px] right-[20%] w-[5px] h-[5px] rounded-full bg-[#9BC4C8]/40" style={{ animation: "confettiDrift 2.2s ease forwards 0.4s" }} />
        <div className="absolute top-[15px] left-[40%] w-[4px] h-[4px] rounded-full bg-[#E5654E]/30" style={{ animation: "confettiDrift 1.8s ease forwards 0.1s" }} />
        <div className="absolute top-[25px] right-[35%] w-[5px] h-[5px] rounded-full bg-[#E8C1B0]/30" style={{ animation: "confettiDrift 2.4s ease forwards 0.6s" }} />

        {/* Branded checkmark */}
        <div
          className="w-[64px] h-[64px] rounded-full flex items-center justify-center mx-auto mb-[20px]"
          style={{ background: "linear-gradient(135deg, rgba(229,101,78,0.12), rgba(232,193,176,0.15))" }}
        >
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="text-[24px] font-bold text-[#111111] tracking-[-0.3px] mb-[8px]">
          You&apos;re in
        </h2>

        {/* Personalized title */}
        {campaignTitle && (
          <p className="text-[14px] text-[#64748B] mb-[12px]">
            Your response to &ldquo;{campaignTitle}&rdquo; has been submitted.
          </p>
        )}

        {/* Reward callout */}
        {hasReward && (
          <div className="inline-flex items-center gap-[6px] px-[14px] py-[8px] rounded-xl bg-[#34D399]/8 border border-[#34D399]/15 mb-[12px]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
            </svg>
            <span className="text-[13px] font-semibold text-[#111111]">
              You&apos;re in the running for <span className="font-mono text-[#34D399]">${rewardAmount}</span>
              {rewardType === "top_only" && " (top answers)"}
            </span>
          </div>
        )}

        {/* Stats summary */}
        {(questionCount || totalTimeMs) && (
          <p className="text-[13px] text-[#94A3B8] mb-[8px]">
            {questionCount && <>You answered {questionCount} questions</>}
            {questionCount && totalTimeMs && <> in </>}
            {totalTimeMs && <>{formatTime(totalTimeMs)}</>}
          </p>
        )}

        <p className="text-[13px] text-[#94A3B8] mb-[32px]">
          {hasReward
            ? "Quality responses are ranked by the founder — thoughtful feedback earns more."
            : "Good feedback makes good products. Thanks for being part of it."}
        </p>

        <div className="flex gap-[12px] justify-center max-sm:flex-col max-sm:w-full">
          <Button href="/dashboard/the-wall" className="px-[24px] py-[12px] text-[14px]">
            Keep Responding
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
    </div>
  );
}
