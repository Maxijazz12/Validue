"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { FEATURES } from "@/lib/feature-flags";

type CampaignDetailProps = {
  campaign: {
    title: string;
    description: string | null;
    category: string | null;
    tags: string[];
    estimatedMinutes: number;
    rewardAmount: number;
    currentResponses: number;
    targetResponses: number;
    creatorName: string;
    creatorAvatar: string | null;
    bonusAvailable: boolean;
    rewardsTopAnswers: boolean;
    rewardType: string | null;
  };
  questionCount: number;
  openCount: number;
  mcCount: number;
  isOwnCampaign: boolean;
  isFull: boolean;
  hasSubmitted: boolean;
  isActive: boolean;
  isLoading: boolean;
  onStart: () => void;
};

function getRewardLabel(amount: number, type: string | null): string {
  switch (type) {
    case "fixed":
      return `$${amount} per response`;
    case "pool":
      return `$${amount} reward pool`;
    case "top_only":
      return `$${amount} for top answers`;
    default:
      return `$${amount} reward`;
  }
}

export default function CampaignDetail({
  campaign,
  questionCount,
  openCount,
  mcCount,
  isOwnCampaign,
  isFull,
  hasSubmitted,
  isActive,
  isLoading,
  onStart,
}: CampaignDetailProps) {
  const progress =
    campaign.targetResponses > 0
      ? Math.min(
          (campaign.currentResponses / campaign.targetResponses) * 100,
          100
        )
      : 0;
  const hasReward = FEATURES.RESPONDENT_PAYOUTS && campaign.rewardAmount > 0;

  const canStart = isActive && !isOwnCampaign && !isFull && !hasSubmitted;

  let blockerMessage: string | null = null;
  if (isOwnCampaign) blockerMessage = "You can't respond to your own campaign.";
  else if (hasSubmitted)
    blockerMessage = "You've already submitted a response to this campaign.";
  else if (isFull) blockerMessage = "This campaign has reached its response target.";
  else if (!isActive) blockerMessage = "This campaign is no longer active.";

  return (
    <>
      {/* Back link */}
      <Link
        href="/dashboard/the-wall"
        className="inline-flex items-center gap-[6px] font-mono text-[11px] uppercase tracking-wide font-medium text-text-muted hover:text-text-primary transition-colors no-underline mb-[24px]"
      >
        <svg fill="currentColor" viewBox="0 0 24 24" className="w-[12px] h-[12px]">
            <path d="M15 18l-6-6 6-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        [ BACK_TO_WALL ]
      </Link>

      {/* Title */}
      <div className="bg-white rounded-[24px] border border-border-light p-[32px] max-md:p-[20px] mb-[16px] relative overflow-hidden shadow-card-sm">
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
        <h1 className="text-[28px] font-bold tracking-tight text-text-primary">{campaign.title}</h1>
      </div>

      {/* Creator */}
      <div className="flex items-center gap-[8px] mb-[24px] px-[8px]">
        <Avatar
          name={campaign.creatorName}
          imageUrl={campaign.creatorAvatar}
          size={20}
        />
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-secondary">
          [ ROOT.{campaign.creatorName.split(" ")[0].toUpperCase()} ]
        </span>
      </div>

      {/* Category + tags only — founder pitch hidden to avoid anchoring bias */}
      {campaign.tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px] mb-[24px] px-[8px]">
          {campaign.tags.map((tag) => (
            <span
              key={tag}
              className="font-mono text-[11px] font-medium uppercase tracking-wide px-[8px] py-[4px] rounded-md border border-black/10 bg-black/5 text-text-muted"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-[16px] mb-[24px] max-md:grid-cols-1">
        {/* Questions */}
        <div className="bg-white border border-border-light rounded-[20px] p-[20px] relative overflow-hidden shadow-card-sm">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
          <span className="font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide block mb-[12px]">
            [ QUESTIONS ]
          </span>
          <div className="font-mono text-[24px] font-bold text-text-primary mt-[4px] leading-none mb-[8px]">
            {questionCount}
          </div>
          <div className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
            {openCount} OPEN / {mcCount} MC
          </div>
        </div>

        {/* Time */}
        <div className="bg-white border border-border-light rounded-[20px] p-[20px] relative overflow-hidden shadow-card-sm">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-accent/10 to-transparent" />
          <span className="font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide block mb-[12px]">
            [ EST_TIME ]
          </span>
          <div className="font-mono text-[24px] font-bold text-text-primary mt-[4px] leading-none">
            {campaign.estimatedMinutes}M
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white border border-border-light rounded-[20px] p-[20px] relative overflow-hidden shadow-card-sm">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-brand/20 to-transparent" />
          <span className="font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide block mb-[12px]">
            [ RESPONSES ]
          </span>
          <div className="mt-[4px] flex items-baseline gap-[4px]">
            <span className="font-mono text-[24px] font-bold text-text-primary leading-none">
              {campaign.currentResponses}
            </span>
            <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
              /{campaign.targetResponses}
            </span>
          </div>
          <div className="h-[2px] w-full bg-black/5 overflow-hidden mt-[16px]">
            <div
              className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.2,0.9,0.3,1)] ${
                progress >= 75 ? "bg-brand" : "bg-accent"
              }`}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reward section */}
      {hasReward && (
        <div className="bg-accent border border-transparent rounded-[20px] p-[20px] mb-[32px] relative overflow-hidden shadow-[0_8px_32px_rgba(28,25,23,0.15)]">
          <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-success/40 to-transparent" />
          <div className="flex items-center gap-[12px] flex-wrap mb-[12px]">
            <span className="font-mono font-bold text-[14px] text-white">
              {getRewardLabel(campaign.rewardAmount, campaign.rewardType).toUpperCase()}
            </span>
            {campaign.bonusAvailable && (
              <span className="font-mono text-[11px] font-medium px-[8px] py-[4px] rounded-md bg-success/20 text-success uppercase tracking-wide">
                [ BONUSES_ENABLED ]
              </span>
            )}
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-text-muted leading-[1.6]">
            REWARDS ALLOCATED TO HIGH QUALITY RESPONSES.
          </p>
          {campaign.rewardsTopAnswers && (
            <p className="font-mono text-[11px] uppercase tracking-wide text-success mt-[8px] font-medium">
              {"// "}SYS: THOUGHTFUL_RESPONSES_EARN_MORE
            </p>
          )}
        </div>
      )}

      {/* Blocker or CTA */}
      {blockerMessage ? (
        <div className="text-center p-[20px] rounded-[16px] bg-black/5 border border-black/5">
          <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">{blockerMessage}</p>
          {hasSubmitted && (
            <Link
              href="/dashboard/my-responses"
              className="inline-block mt-[12px] font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary underline hover:text-brand transition-colors"
            >
              [ VIEW_DATA_LOGS ]
            </Link>
          )}
        </div>
      ) : (
        <Button
          onClick={onStart}
          disabled={!canStart || isLoading}
          className={`w-full py-[16px] font-mono text-[12px] tracking-wide uppercase font-medium text-center !bg-accent !text-white transition-all duration-300 rounded-[16px] ${
            !canStart || isLoading ? "opacity-50 cursor-not-allowed" : "hover:!bg-accent-dark hover:shadow-[0_8px_24px_rgba(28,25,23,0.2)]"
          }`}
        >
          {isLoading ? "[ INITIALIZING... ]" : "[ START_RESPONDING ]"}
        </Button>
      )}
    </>
  );
}
