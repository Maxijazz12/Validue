"use client";

import Button from "@/components/ui/Button";
import type { SuggestedCampaign } from "./ResponseFlow";
import { FEATURES } from "@/lib/feature-flags";

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
  const hasReward = FEATURES.RESPONDENT_PAYOUTS && rewardAmount && rewardAmount > 0;
  const potentialEarnings = (suggestedCampaigns || []).reduce((sum, c) => sum + c.rewardAmount, 0);

  return (
    <div className="flex items-center justify-center py-[48px]">
      <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] p-[48px] relative overflow-hidden max-w-[480px] w-full text-left">
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[#2ca05a]/40 to-transparent" />

        {/* Branded command checkmark */}
        <div
          className="w-[48px] h-[48px] flex items-center justify-center mb-[24px] border border-black/10 rounded-xl bg-black/5"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2ca05a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="font-mono text-[14px] font-bold text-[#1C1917] tracking-widest uppercase mb-[12px]">
          {"// "}SYS: PAYLOAD_TRANSFERRED
        </h2>

        {/* Personalized title */}
        {campaignTitle && (
          <p className="text-[14px] text-[#A8A29E] mb-[24px] font-mono leading-[1.6]">
            DATA FOR <span className="font-bold text-[#1C1917]">[{campaignTitle.toUpperCase()}]</span> SECURELY WRITTEN.
          </p>
        )}

        {/* V2 money state callout */}
        {hasReward && (
          <div className="bg-[#1C1917] border border-transparent rounded-[16px] p-[20px] mb-[24px] shadow-[0_4px_16px_rgba(28,25,23,0.1)] relative">
            <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#F59E0B]/40 to-transparent" />
            <div className="flex items-center gap-[8px] mb-[12px]">
              <div className="w-[6px] h-[6px] rounded-full bg-[#F59E0B] animate-pulse" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#F59E0B]">SYS_STATE: PENDING_QUALIFICATION</span>
            </div>
            <p className="font-mono text-[10px] text-[#A8A29E] leading-[1.6] uppercase tracking-widest">
              BASE YIELD MOVES TO <span className="text-white font-bold">LOCKED</span> IF QUALIFIED.<br />
              LOCKED YIELDS BECOME <span className="text-white font-bold">AVAILABLE</span> UPON CAMPAIGN TERMINAL CLOSE (T+7d).
            </p>
          </div>
        )}

        {/* Stats summary */}
        {(questionCount || totalTimeMs) && (
          <p className="font-mono text-[10px] uppercase tracking-widest text-[#1C1917] font-bold mb-[24px] bg-black/5 inline-flex px-[8px] py-[4px] rounded-md">
            [ METRICS: {questionCount && `${questionCount} NODES`}
            {questionCount && totalTimeMs && ` | `}
            {totalTimeMs && `T-${formatTime(totalTimeMs)}`} ]
          </p>
        )}

        {/* Suggested next campaigns */}
        {suggestedCampaigns && suggestedCampaigns.length > 0 ? (
          <div className="text-left mt-[24px] pt-[24px] border-t border-black/10">
            <p className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#78716C] mb-[16px]">
              {potentialEarnings > 0 ? (
                <>YIELD ACCRUED. <span className="text-[#34D399]">MULTIPLY YIELD</span> VIA SUBSEQUENT ACTIVE NODES:</>
              ) : (
                <>SYSTEM READY. DISCOVER ADDITIONAL NODES:</>
              )}
            </p>
            <div className="flex flex-col gap-[8px] mb-[32px]">
              {suggestedCampaigns.map((c) => (
                <a
                  key={c.id}
                  href={`/dashboard/the-wall/${c.id}`}
                  className="flex items-center gap-[12px] p-[16px] rounded-[16px] bg-white border border-black/10 hover:border-black/30 hover:shadow-[0_4px_16px_rgba(0,0,0,0.03)] transition-all duration-300 no-underline group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] font-bold uppercase tracking-widest text-[#1C1917] truncate group-hover:text-[#E5654E] transition-colors mb-[4px]">
                      {"// "}{c.title}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[1px] text-[#A8A29E]">
                      ROOT.{c.creatorName.split(" ")[0].toUpperCase()} {c.category ? `[ ${c.category.toUpperCase()} ]` : ""} T-{c.estimatedMinutes}M
                    </div>
                  </div>
                  {c.rewardAmount > 0 && (
                    <span className="font-mono text-[10px] font-bold text-[#34D399] bg-[#34D399]/10 px-[6px] py-[4px] rounded-md shrink-0">
                      +${c.rewardAmount}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-[#A8A29E] group-hover:text-[#1C1917] transition-colors">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              ))}
            </div>
            
            <div className="flex max-sm:flex-col gap-[12px]">
              <Button href="/dashboard/the-wall" className="flex-1 py-[12px] font-mono text-[11px] font-bold tracking-widest uppercase !bg-[#1C1917] !text-white rounded-xl shadow-none hover:shadow-[0_4px_16px_rgba(28,25,23,0.15)] justify-center flex transition-all">
                [ BROWSE_WALL ]
              </Button>
              <Button href="/dashboard/my-responses" variant="outline" className="flex-1 py-[12px] font-mono text-[11px] font-bold tracking-widest uppercase border-black/10 hover:bg-black/5 justify-center flex transition-all text-[#1C1917]">
                [ VIEW_LOGS ]
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-[12px] max-sm:flex-col pt-[24px] mt-[24px] border-t border-black/10">
            <Button href="/dashboard/the-wall" className="flex-1 py-[12px] font-mono text-[11px] font-bold tracking-widest uppercase !bg-[#1C1917] !text-white rounded-xl shadow-none justify-center flex transition-all">
               [ NEXT_NODE ]
            </Button>
            <Button
              href="/dashboard/my-responses"
              variant="outline"
              className="flex-1 py-[12px] font-mono text-[11px] font-bold tracking-widest uppercase border-black/10 hover:bg-black/5 justify-center flex transition-all text-[#1C1917]"
            >
              [ VIEW_LOGS ]
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
