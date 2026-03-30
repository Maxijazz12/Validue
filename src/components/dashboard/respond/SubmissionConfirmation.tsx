"use client";

import Button from "@/components/ui/Button";
import type { SuggestedCampaign } from "./ResponseFlow";

type SubmissionConfirmationProps = {
  campaignTitle?: string;
  campaignDescription?: string | null;
  rewardAmount?: number;
  rewardType?: string | null;
  questionCount?: number;
  totalTimeMs?: number;
  suggestedCampaigns?: SuggestedCampaign[];
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
  campaignDescription,
  rewardAmount,
  rewardType: _rewardType,
  questionCount,
  totalTimeMs,
  suggestedCampaigns,
}: SubmissionConfirmationProps) {
  const hasReward = rewardAmount && rewardAmount > 0;
  const potentialEarnings = (suggestedCampaigns || []).reduce((sum, c) => sum + c.rewardAmount, 0);

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

        {/* V2 money state callout */}
        {hasReward && (
          <div className="text-left bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-[16px] mb-[16px]">
            <div className="flex items-center gap-[8px] mb-[8px]">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="text-[13px] font-semibold text-[#111111]">Base status: Pending qualification</span>
            </div>
            <p className="text-[12px] text-[#64748B] leading-[1.5]">
              If qualified, your base payout will move to <span className="font-semibold">Locked</span>.
              Locked payouts become <span className="font-semibold">Available</span> when the campaign closes.
              This can take up to 7 days.
            </p>
            <p className="text-[12px] text-[#94A3B8] mt-[6px]">
              Bonus status: Pending until campaign closes
            </p>
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

        <p className="text-[13px] text-[#94A3B8] mb-[16px]">
          {hasReward
            ? "Higher quality responses earn more. Take your time and share real experiences."
            : "Good feedback makes good products. Thanks for being part of it."}
        </p>

        {/* Post-submission idea reveal */}
        {campaignDescription && (
          <div className="text-left bg-white border border-[#E2E8F0] rounded-xl p-[16px] mb-[24px]">
            <p className="text-[11px] uppercase tracking-[1px] text-[#94A3B8] font-semibold mb-[8px]">
              The idea you helped test
            </p>
            <p className="text-[13px] text-[#64748B] leading-[1.6]">
              {campaignDescription}
            </p>
          </div>
        )}

        {/* Suggested next campaigns */}
        {suggestedCampaigns && suggestedCampaigns.length > 0 ? (
          <div className="text-left">
            <p className="text-[12px] font-semibold text-[#64748B] mb-[12px]">
              {potentialEarnings > 0 ? (
                <>You earned {hasReward ? <span className="font-mono text-[#34D399]">${rewardAmount}</span> : "karma"}. Earn up to <span className="font-mono text-[#34D399]">${potentialEarnings}</span> more from these:</>
              ) : (
                <>Keep the momentum going</>
              )}
            </p>
            <div className="flex flex-col gap-[8px] mb-[20px]">
              {suggestedCampaigns.map((c) => (
                <a
                  key={c.id}
                  href={`/dashboard/the-wall/${c.id}`}
                  className="flex items-center gap-[12px] p-[12px] rounded-xl border border-[#E2E8F0] hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 no-underline group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-semibold text-[#111111] truncate group-hover:text-[#E5654E] transition-colors">
                      {c.title}
                    </div>
                    <div className="text-[11px] text-[#94A3B8] mt-[2px]">
                      {c.creatorName}{c.category ? ` · ${c.category}` : ""} · ~{c.estimatedMinutes}min
                    </div>
                  </div>
                  {c.rewardAmount > 0 && (
                    <span className="text-[12px] font-mono font-semibold text-[#34D399] bg-[#34D399]/8 px-[8px] py-[3px] rounded-lg shrink-0">
                      ${c.rewardAmount}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 group-hover:stroke-[#E5654E] transition-colors">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              ))}
            </div>
            <div className="flex gap-[12px] justify-center">
              <Button href="/dashboard/the-wall" variant="outline" className="px-[20px] py-[10px] text-[13px]">
                Browse The Wall
              </Button>
              <Button href="/dashboard/my-responses" variant="outline" className="px-[20px] py-[10px] text-[13px]">
                My Responses
              </Button>
            </div>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
}
