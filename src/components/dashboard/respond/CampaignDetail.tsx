"use client";

import Link from "next/link";
import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";

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
  const hasReward = campaign.rewardAmount > 0;

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
        className="inline-flex items-center gap-[6px] text-[13px] text-[#94A3B8] hover:text-[#64748B] transition-colors no-underline mb-[16px]"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back to The Wall
      </Link>

      {/* Title */}
      <div className="bg-[#FAF9FA] rounded-2xl border border-[#E2E8F0] p-[24px_32px] max-md:p-[20px] mb-[16px] relative overflow-hidden">
        <div className="absolute top-0 left-[15%] right-[15%] h-[2px] bg-gradient-to-r from-transparent via-[#E8C1B0]/25 to-transparent" />
        <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111111]">{campaign.title}</h1>
      </div>

      {/* Creator */}
      <div className="flex items-center gap-[8px] mb-[20px]">
        <Avatar
          name={campaign.creatorName}
          imageUrl={campaign.creatorAvatar}
          size={20}
        />
        <span className="text-[13px] text-[#64748B]">
          {campaign.creatorName}
        </span>
      </div>

      {/* Category + tags only — founder pitch hidden to avoid anchoring bias */}
      {campaign.tags.length > 0 && (
        <div className="flex flex-wrap gap-[6px] mb-[16px]">
          {campaign.tags.map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[3px] rounded-full bg-[#F3F4F6] text-[#64748B]"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-3 gap-[12px] mb-[16px] max-md:grid-cols-1">
        {/* Questions */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px]">
            Questions
          </span>
          <div className="font-mono text-[20px] font-bold text-[#111111] mt-[4px]">
            {questionCount}
          </div>
          <div className="text-[11px] text-[#94A3B8] mt-[2px]">
            {openCount} open · {mcCount} multiple choice
          </div>
        </div>

        {/* Time */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px]">
            Est. Time
          </span>
          <div className="font-mono text-[20px] font-bold text-[#111111] mt-[4px]">
            {campaign.estimatedMinutes} min
          </div>
        </div>

        {/* Progress */}
        <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] relative overflow-hidden">
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
          <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px]">
            Responses
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[20px] font-bold text-[#111111]">
              {campaign.currentResponses}
            </span>
            <span className="text-[13px] text-[#94A3B8]">
              /{campaign.targetResponses}
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[#F3F4F6] overflow-hidden mt-[6px]">
            <div
              className="h-full rounded-full bg-[#34D399]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Reward section */}
      {hasReward && (
        <div className="bg-[#FCFCFD] border border-[#E5654E]/20 rounded-xl p-[16px] mb-[24px]">
          <div className="flex items-center gap-[8px] flex-wrap">
            <span className="font-mono font-semibold text-[14px] text-[#111111]">
              {getRewardLabel(campaign.rewardAmount, campaign.rewardType)}
            </span>
            {campaign.bonusAvailable && (
              <span className="text-[11px] font-semibold px-[6px] py-[2px] rounded-full bg-[#E5654E]/12 text-[#CC5340]">
                Bonus available
              </span>
            )}
          </div>
          <p className="text-[12px] text-[#64748B] mt-[6px]">
            Rewards are allocated by the founder after reviewing ranked
            responses. Higher quality = higher earnings.
          </p>
          {campaign.rewardsTopAnswers && (
            <p className="text-[12px] text-[#22c55e] italic mt-[4px]">
              Thoughtful responses earn more
            </p>
          )}
        </div>
      )}

      {/* Blocker or CTA */}
      {blockerMessage ? (
        <div className="text-center p-[20px] rounded-xl bg-[#F3F4F6]">
          <p className="text-[14px] text-[#64748B]">{blockerMessage}</p>
          {hasSubmitted && (
            <Link
              href="/dashboard/my-responses"
              className="inline-block mt-[8px] text-[13px] text-[#111111] font-medium underline"
            >
              View My Responses
            </Link>
          )}
        </div>
      ) : (
        <Button
          onClick={onStart}
          disabled={!canStart || isLoading}
          className={`w-full py-[16px] text-[16px] ${
            !canStart || isLoading ? "opacity-50 cursor-not-allowed" : "hover:shadow-[0_4px_20px_rgba(232,193,176,0.15),0_1px_4px_rgba(232,193,176,0.08)]"
          }`}
        >
          {isLoading ? "Starting..." : "Start Responding"}
        </Button>
      )}
    </>
  );
}
