type FloatingCardProps = {
  text: string;
  className?: string;
  accent?: "warm" | "blue";
};

function MiniPeach({ accent }: { accent: "warm" | "blue" }) {
  const s0 = accent === "blue" ? "#9BC4C8" : "#E5654E";
  const s1 = accent === "blue" ? "#B5D5D8" : "#E8C1B0";

  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[18px] h-[18px] shrink-0">
      <defs>
        <linearGradient id={`fp-${accent}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s0} />
          <stop offset="100%" stopColor={s1} />
        </linearGradient>
        <linearGradient id={`fp-${accent}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s0} stopOpacity="0.12" />
          <stop offset="100%" stopColor={s1} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="27" ry="27" fill={`url(#fp-${accent}-f)`} stroke={`url(#fp-${accent}-s)`} strokeWidth="3" />
      <path d="M32 6 Q29 30 32 58" stroke={`url(#fp-${accent}-s)`} strokeWidth="1.8" fill="none" opacity="0.3" />
    </svg>
  );
}

export default function FloatingCard({ text, className = "", accent = "warm" }: FloatingCardProps) {
  return (
    <div
      className={`absolute flex items-center gap-[8px] bg-white/90 backdrop-blur-xl rounded-2xl px-[12px] py-[8px] shadow-[0_2px_8px_rgba(0,0,0,0.05)] border border-[#E2E8F0]/40 will-change-transform ${className}`}
    >
      <MiniPeach accent={accent} />
      <span className="text-[12px] text-[#94A3B8] whitespace-nowrap font-medium">
        {text}
      </span>
    </div>
  );
}
