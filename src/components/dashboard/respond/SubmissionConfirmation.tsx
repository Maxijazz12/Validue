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
  campaignDescription: _campaignDescription,
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
      <div className="bg-white rounded-[28px] border border-border-light shadow-card p-[48px] relative overflow-hidden max-w-[480px] w-full text-left">
        <div className="absolute top-0 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-success/40 to-transparent" />

        {/* Branded command checkmark */}
        <div
          className="w-[48px] h-[48px] flex items-center justify-center mb-[24px] border border-border-light rounded-[16px] bg-bg-muted"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>

        <h2 className="font-mono text-[14px] font-medium text-text-primary tracking-wide uppercase mb-[12px]">
          {"// "}SYS: PAYLOAD_TRANSFERRED
        </h2>

        {/* Personalized title */}
        {campaignTitle && (
          <p className="text-[14px] text-text-muted mb-[24px] font-mono leading-[1.6]">
            DATA FOR <span className="font-bold text-text-primary">[{campaignTitle.toUpperCase()}]</span> SECURELY WRITTEN.
          </p>
        )}

        {/* V2 money state callout */}
        {hasReward && (
          <div className="bg-accent border border-transparent rounded-[20px] p-[20px] mb-[24px] shadow-[0_4px_16px_rgba(28,25,23,0.1)] relative">
            <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-warning/40 to-transparent" />
            <div className="flex items-center gap-[8px] mb-[12px]">
              <div className="w-[6px] h-[6px] rounded-full bg-warning animate-pulse" />
              <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-warning">SYS_STATE: PENDING_QUALIFICATION</span>
            </div>
            <p className="font-mono text-[11px] text-text-muted leading-[1.6] uppercase tracking-widest">
              BASE YIELD MOVES TO <span className="text-white font-bold">LOCKED</span> IF QUALIFIED.<br />
              LOCKED YIELDS BECOME <span className="text-white font-bold">AVAILABLE</span> UPON CAMPAIGN TERMINAL CLOSE (T+7d).
            </p>
          </div>
        )}

        {/* Stats summary */}
        {(questionCount || totalTimeMs) && (
          <p className="font-mono text-[11px] uppercase tracking-wide text-text-primary font-medium mb-[24px] bg-bg-muted inline-flex px-[8px] py-[4px] rounded-md">
            [ METRICS: {questionCount && `${questionCount} NODES`}
            {questionCount && totalTimeMs && ` | `}
            {totalTimeMs && `T-${formatTime(totalTimeMs)}`} ]
          </p>
        )}

        {/* Suggested next campaigns */}
        {suggestedCampaigns && suggestedCampaigns.length > 0 ? (
          <div className="text-left mt-[24px] pt-[24px] border-t border-border-light">
            <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-secondary mb-[16px]">
              {potentialEarnings > 0 ? (
                <>YIELD ACCRUED. <span className="text-success-mid">MULTIPLY YIELD</span> VIA SUBSEQUENT ACTIVE NODES:</>
              ) : (
                <>SYSTEM READY. DISCOVER ADDITIONAL NODES:</>
              )}
            </p>
            <div className="flex flex-col gap-[8px] mb-[32px]">
              {suggestedCampaigns.map((c) => (
                <a
                  key={c.id}
                  href={`/dashboard/the-wall/${c.id}`}
                  className="flex items-center gap-[12px] p-[16px] rounded-[20px] bg-white border border-border-light shadow-card hover:border-border-muted hover:shadow-card-hover transition-all duration-300 no-underline group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary truncate group-hover:text-brand transition-colors mb-[4px]">
                      {"// "}{c.title}
                    </div>
                    <div className="font-mono text-[9px] uppercase tracking-[1px] text-text-muted">
                      ROOT.{c.creatorName.split(" ")[0].toUpperCase()} {c.category ? `[ ${c.category.toUpperCase()} ]` : ""} T-{c.estimatedMinutes}M
                    </div>
                  </div>
                  {c.rewardAmount > 0 && (
                    <span className="font-mono text-[10px] font-bold text-success-mid bg-success-mid/10 px-[6px] py-[4px] rounded-md shrink-0">
                      +${c.rewardAmount}
                    </span>
                  )}
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-text-muted group-hover:text-text-primary transition-colors">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </a>
              ))}
            </div>
            
            <div className="flex max-sm:flex-col gap-[12px]">
              <Button href="/dashboard/the-wall" className="flex-1 py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide !bg-accent !text-white rounded-xl shadow-none hover:shadow-[0_4px_16px_rgba(28,25,23,0.15)] justify-center flex transition-all">
                [ BROWSE_WALL ]
              </Button>
              <Button href="/dashboard/my-responses" variant="outline" className="flex-1 py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide border-border-light hover:bg-bg-muted justify-center flex transition-all text-text-primary">
                [ VIEW_LOGS ]
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex gap-[12px] max-sm:flex-col pt-[24px] mt-[24px] border-t border-border-light">
            <Button href="/dashboard/the-wall" className="flex-1 py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide !bg-accent !text-white rounded-xl shadow-none justify-center flex transition-all">
               [ NEXT_NODE ]
            </Button>
            <Button
              href="/dashboard/my-responses"
              variant="outline"
              className="flex-1 py-[12px] font-mono text-[11px] font-medium uppercase tracking-wide border-border-light hover:bg-bg-muted justify-center flex transition-all text-text-primary"
            >
              [ VIEW_LOGS ]
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
