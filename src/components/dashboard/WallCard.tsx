import Avatar from "@/components/ui/Avatar";

export type WallCardProps = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  estimatedMinutes: number;
  rewardAmount: number;
  currentResponses: number;
  targetResponses: number;
  createdAt: string;
  deadline: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  bonusAvailable: boolean;
  rewardsTopAnswers: boolean;
  rewardType: string | null;
  matchScore: number;
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function isNew(dateStr: string): boolean {
  return Date.now() - new Date(dateStr).getTime() < 24 * 60 * 60 * 1000;
}

function isClosingSoon(current: number, target: number, deadline: string | null): boolean {
  if (target > 0 && current / target >= 0.8) return true;
  if (deadline) {
    return new Date(deadline).getTime() - Date.now() < 48 * 60 * 60 * 1000;
  }
  return false;
}

function getRewardLabel(amount: number, type: string | null): string {
  switch (type) {
    case "fixed": return `$${amount} per response`;
    case "pool": return `$${amount} reward pool`;
    case "top_only": return `$${amount} for top answers`;
    default: return `$${amount} reward`;
  }
}

export default function WallCard({
  id,
  title,
  description,
  category,
  tags,
  estimatedMinutes,
  rewardAmount,
  currentResponses,
  targetResponses,
  createdAt,
  deadline,
  creatorName,
  creatorAvatar,
  bonusAvailable,
  rewardsTopAnswers,
  rewardType,
  matchScore,
}: WallCardProps) {
  const progress = targetResponses > 0 ? Math.min((currentResponses / targetResponses) * 100, 100) : 0;
  const showNew = isNew(createdAt);
  const showClosingSoon = isClosingSoon(currentResponses, targetResponses, deadline);
  const showHighReward = rewardAmount >= 20;
  const isHighTier = rewardAmount >= 50;
  const hasReward = rewardAmount > 0;
  const showGoodMatch = matchScore >= 70;

  return (
    <a href={`/dashboard/the-wall/${id}`} className="block bg-white border border-[#ebebeb] rounded-xl p-[20px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200 no-underline group">
      {/* Top row: category, tags, time estimate */}
      <div className="flex items-center justify-between gap-[8px] mb-[12px]">
        <div className="flex items-center gap-[6px] flex-wrap min-w-0">
          {category && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#f5f2ed] text-[#555555] shrink-0">
              {category}
            </span>
          )}
          {tags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#ebebeb] text-[#999999] shrink-0"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[#999999] shrink-0">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
          </svg>
          {estimatedMinutes} min
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-semibold text-[#111111] mb-[6px] group-hover:text-[#000000] transition-colors">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[13px] text-[#555555] leading-[1.5] mb-[16px] line-clamp-2">
          {description}
        </p>
      )}

      {/* Progress + Reward section */}
      <div className={`mb-[16px] ${isHighTier ? "bg-[#faf8f5] rounded-lg p-[12px] -mx-[4px]" : ""}`}>
        {/* Progress bar */}
        <div className="mb-[10px]">
          <div className="h-[4px] rounded-full bg-[#f5f2ed] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#65a30d] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[12px] text-[#999999] mt-[6px]">
            <span className="font-mono font-semibold text-[#111111]">{currentResponses}</span>
            /{targetResponses} responses
          </div>
        </div>

        {/* Reward signals */}
        {hasReward && (
          <div className="flex flex-col gap-[4px]">
            {/* Reward amount + type + bonus */}
            <div className="flex items-center gap-[6px] flex-wrap">
              <span className={`font-mono ${rewardAmount >= 25 ? "font-semibold" : "font-medium"} text-[12px] text-[#111111]`}>
                {getRewardLabel(rewardAmount, rewardType)}
              </span>
              {bonusAvailable && (
                <>
                  <span className="text-[#d4d4d4]">&middot;</span>
                  <span className="text-[11px] font-semibold px-[6px] py-[2px] rounded-full bg-[#e8b87a]/12 text-[#c4883a]">
                    Bonus available
                  </span>
                </>
              )}
            </div>
            {/* Quality signal */}
            {rewardsTopAnswers && (
              <span className="text-[11px] text-[#65a30d] italic">
                Thoughtful responses earn more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom row: founder + badges */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px] min-w-0">
          <Avatar name={creatorName} imageUrl={creatorAvatar} size={24} />
          <span className="text-[12px] text-[#555555] truncate">
            {creatorName}
          </span>
          <span className="text-[12px] text-[#999999]">
            · {timeAgo(createdAt)}
          </span>
        </div>
        <div className="flex items-center gap-[6px] shrink-0">
          {showGoodMatch && (
            <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#06b6d4]/10 text-[#0891b2]">
              Matched for you
            </span>
          )}
          {showNew && (
            <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#22c55e]/10 text-[#22c55e]">
              New
            </span>
          )}
          {showClosingSoon && (
            <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#e8b87a]/15 text-[#c4883a]">
              Closing Soon
            </span>
          )}
          {showHighReward && !showNew && !showClosingSoon && (
            <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#a855f7]/10 text-[#a855f7]">
              High Reward
            </span>
          )}
        </div>
      </div>
    </a>
  );
}
