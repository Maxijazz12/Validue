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
  current_streak?: number;
};

function getActivityLevel(count: number): { label: string; color: string } {
  if (count >= 30) return { label: "Power User", color: "#8B5CF6" };
  if (count >= 15) return { label: "Committed", color: "#22C55E" };
  if (count >= 5) return { label: "Active", color: "#4F7BE8" };
  return { label: "Getting Started", color: "#94A3B8" };
}

function getQualityTrend(score: number): { direction: "up" | "flat" | "down"; color: string } {
  if (score >= 60) return { direction: "up", color: "#22C55E" };
  if (score >= 40) return { direction: "flat", color: "#F59E0B" };
  return { direction: "down", color: "#94A3B8" };
}

function QualityIcon({ direction, color }: { direction: "up" | "flat" | "down"; color: string }) {
  if (direction === "up") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="18 15 12 9 6 15" />
    </svg>
  );
  if (direction === "flat") return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round">
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function StreakIcon({ pulse }: { pulse: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" strokeLinecap="round" strokeLinejoin="round" className={pulse ? "animate-[pulse_2.5s_ease_infinite]" : ""}>
      <path d="M12 2c0 4-4 6-4 10a4 4 0 0 0 8 0c0-4-4-6-4-10z" fill="#E8C1B0" stroke="#D4A494" strokeWidth="1.5" />
      <path d="M12 10c0 2-1.5 3-1.5 5a1.5 1.5 0 0 0 3 0c0-2-1.5-3-1.5-5z" fill="#E5654E" stroke="#CC5340" strokeWidth="1" />
    </svg>
  );
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

      {/* Streak */}
      {(userProfile.current_streak ?? 0) > 0 && (
        <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
          <StreakIcon pulse={(userProfile.current_streak ?? 0) >= 3} />
          <span className="text-[12px] text-[#64748B]">{userProfile.current_streak}-day</span>
        </div>
      )}

      {/* Quality */}
      <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
        <QualityIcon direction={quality.direction} color={quality.color} />
        <span className="text-[12px] text-[#64748B]">Quality</span>
        <span className="text-[11px] text-[#94A3B8]">{Math.round(userProfile.average_quality_score)}</span>
      </div>

      {/* Earnings */}
      <div className="flex items-center gap-[4px] shrink-0 px-[12px] border-r border-[#E2E8F0]">
        <span className="text-[12px] text-[#64748B]">Earned</span>
        <span className="text-[12px] text-[#111111]">${Math.round(userProfile.total_earned)}</span>
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
