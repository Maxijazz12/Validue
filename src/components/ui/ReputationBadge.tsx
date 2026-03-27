import { TIER_CONFIG, type ReputationTier } from "@/lib/reputation-config";

type ReputationBadgeProps = {
  tier: ReputationTier;
  score?: number;
  size?: "sm" | "md";
  showScore?: boolean;
};

export default function ReputationBadge({
  tier,
  score,
  size = "sm",
  showScore = false,
}: ReputationBadgeProps) {
  const config = TIER_CONFIG[tier] || TIER_CONFIG.new;

  if (tier === "new") return null;

  const isSmall = size === "sm";

  return (
    <span
      className={`inline-flex items-center gap-[4px] font-semibold rounded-full ${
        isSmall
          ? "text-[10px] px-[6px] py-[2px]"
          : "text-[12px] px-[10px] py-[4px]"
      }`}
      style={{
        color: config.color,
        background: `${config.color}15`,
      }}
    >
      <span
        className={`rounded-full ${isSmall ? "w-[5px] h-[5px]" : "w-[6px] h-[6px]"}`}
        style={{ background: config.color }}
      />
      {config.label}
      {showScore && score !== undefined && (
        <span className="font-mono opacity-70">{score}</span>
      )}
    </span>
  );
}
