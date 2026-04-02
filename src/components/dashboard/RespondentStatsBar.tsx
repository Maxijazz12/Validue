import { TIER_CONFIG, type ReputationTier } from "@/lib/reputation-config";
import { FEATURES } from "@/lib/feature-flags";

export type WallUserProfile = {
  reputation_score: number;
  reputation_tier: ReputationTier;
  total_responses_completed: number;
  average_quality_score: number;
  total_earned: number;
  interests: string[];
  expertise: string[];
  has_responded: boolean;
  current_streak?: number;
};

export default function RespondentStatsBar({
  userProfile,
  matchCount,
}: {
  userProfile: WallUserProfile;
  matchCount: number;
}) {
  if (!userProfile.has_responded) return null;

  const tierConfig = TIER_CONFIG[userProfile.reputation_tier];

  return (
    <div className="wall-stats-bar flex items-center gap-[16px] p-[12px_24px] bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] rounded-full mb-[24px] max-w-fit mx-auto">
      {/* Tier — hidden when reputation tiers are mothballed */}
      {FEATURES.REPUTATION_TIERS && (
        <div className="flex items-center gap-[6px] shrink-0">
          <span className="text-[12px] font-semibold text-[#1A1A1A] dark:text-[#FAFAFA]">{tierConfig.label}</span>
          <span className="text-[11px] text-[#A1A1AA] font-mono">{Math.round(userProfile.reputation_score)}</span>
        </div>
      )}

      {/* Responses */}
      <div className="flex items-center gap-[4px] shrink-0">
        <span className="text-[12px] text-[#71717A]">{userProfile.total_responses_completed} responses</span>
      </div>

      {/* Earnings — hidden when payouts are mothballed */}
      {FEATURES.RESPONDENT_PAYOUTS && (
        <div className="flex items-center gap-[4px] shrink-0">
          <span className="text-[12px] text-[#71717A]">Earned</span>
          <span className="text-[12px] font-medium text-[#1A1A1A] dark:text-[#FAFAFA]">${Math.round(userProfile.total_earned)}</span>
        </div>
      )}

      {/* Matches */}
      {matchCount > 0 && (
        <div className="flex items-center gap-[4px] shrink-0">
          <span className="text-[12px] text-[#A1A1AA]">{matchCount} matches</span>
        </div>
      )}
    </div>
  );
}
