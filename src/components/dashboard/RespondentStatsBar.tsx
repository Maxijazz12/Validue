import { TIER_CONFIG, type ReputationTier } from "@/lib/reputation-config";

export type WallUserProfile = {
  reputation_score: number;
  reputation_tier: ReputationTier;
  total_responses_completed: number;
  average_quality_score: number;
  total_earned: number;
  interests: string[];
  expertise: string[];
  has_responded: boolean;
};

function getActivityLevel(count: number): { label: string; color: string } {
  if (count >= 30) return { label: "Power User", color: "#8B5CF6" };
  if (count >= 15) return { label: "Committed", color: "#22C55E" };
  if (count >= 5) return { label: "Active", color: "#4F7BE8" };
  return { label: "Getting Started", color: "#94A3B8" };
}

function getQualityTrend(score: number): { icon: string; color: string } {
  if (score >= 60) return { icon: "↑", color: "#22C55E" };
  if (score >= 40) return { icon: "→", color: "#F59E0B" };
  return { icon: "↓", color: "#EF4444" };
}

export default function RespondentStatsBar({
  userProfile,
  matchCount,
}: {
  userProfile: WallUserProfile;
  matchCount: number;
}) {
  if (!userProfile.has_responded) return null;

  const tierConfig = TIER_CONFIG[userProfile.reputation_tier];
  const activity = getActivityLevel(userProfile.total_responses_completed);
  const quality = getQualityTrend(userProfile.average_quality_score);

  return (
    <div className="wall-stats-bar flex items-center gap-[6px] p-[12px_16px] bg-[#FAF9FA] rounded-xl border border-[#E2E8F0] mb-[12px] overflow-x-auto max-h-[60px]">
      {/* Tier */}
      <div className="flex items-center gap-[6px] shrink-0 pr-[12px] border-r border-[#E2E8F0]">
        <span className="w-[8px] h-[8px] rounded-full shrink-0" style={{ backgroundColor: tierConfig.color }} />
        <span className="text-[12px] font-semibold text-[#111111]">{tierConfig.label}</span>
        <span className="text-[11px] text-[#94A3B8] font-mono">{Math.round(userProfile.reputation_score)}</span>
      </div>

      {/* Activity */}
      <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
        <span className="w-[6px] h-[6px] rounded-full shrink-0" style={{ backgroundColor: activity.color }} />
        <span className="text-[12px] text-[#64748B]">{activity.label}</span>
      </div>

      {/* Quality */}
      <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
        <span className="text-[14px] font-bold" style={{ color: quality.color }}>{quality.icon}</span>
        <span className="text-[12px] text-[#64748B]">Quality</span>
        <span className="text-[11px] font-mono text-[#111111]">{Math.round(userProfile.average_quality_score)}</span>
      </div>

      {/* Earnings */}
      <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
        </svg>
        <span className="text-[12px] font-mono font-semibold text-[#111111]">${Math.round(userProfile.total_earned)}</span>
      </div>

      {/* Matches */}
      <div className="flex items-center gap-[4px] shrink-0 pl-[12px]">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
        <span className="text-[12px] text-[#64748B]">{matchCount} matches</span>
      </div>
    </div>
  );
}
