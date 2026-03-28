"use client";

export type Achievement = {
  key: string;
  title: string;
  subtitle: string;
  accent: string;
  icon: React.ReactNode;
};

export default function AchievementBanner({
  achievement,
  onDismiss,
}: {
  achievement: Achievement;
  onDismiss: () => void;
}) {
  return (
    <div
      className="achievement-enter flex items-center gap-[14px] p-[14px_18px] rounded-xl border border-[#E2E8F0] mb-[12px] relative overflow-hidden"
      style={{ borderLeftWidth: 3, borderLeftColor: achievement.accent, background: `linear-gradient(90deg, ${achievement.accent}08, transparent)` }}
    >
      <div
        className="w-[36px] h-[36px] rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${achievement.accent}15` }}
      >
        {achievement.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-semibold text-[#111111]">{achievement.title}</p>
        <p className="text-[12px] text-[#64748B]">{achievement.subtitle}</p>
      </div>
      <button
        onClick={onDismiss}
        className="text-[#94A3B8] hover:text-[#64748B] bg-transparent border-none cursor-pointer p-[4px] transition-colors shrink-0"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>
    </div>
  );
}
