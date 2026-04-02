const CATEGORY_COLORS: Record<string, [string, string]> = {
  SaaS: ["#6B8EA3", "#9BC4C8"],
  Consumer: ["#E8725C", "#E8C1B0"],
  Health: ["#5A9A5E", "#7BA67E"],
  Fintech: ["#B8953A", "#C4A86B"],
  Education: ["#7B6BB5", "#9B8EC4"],
  Marketplace: ["#D4543E", "#E8725C"],
  "AI/ML": ["#3B7DD5", "#5B9BD5"],
  Other: ["#7A8A9B", "#94A3B8"],
};

export default function MiniPeach({ accent = "warm", size = 18, category }: { accent?: "warm" | "blue"; size?: number; category?: string | null }) {
  let s0: string, s1: string;
  if (category && CATEGORY_COLORS[category]) {
    [s0, s1] = CATEGORY_COLORS[category];
  } else {
    s0 = accent === "blue" ? "#9BC4C8" : "#E5654E";
    s1 = accent === "blue" ? "#B5D5D8" : "#E8C1B0";
  }
  const id = (category || accent).replace(/[^a-zA-Z0-9]/g, "-");

  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="shrink-0" style={{ width: size, height: size }}>
      <defs>
        <linearGradient id={`fp-${id}-s`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s0} />
          <stop offset="100%" stopColor={s1} />
        </linearGradient>
        <linearGradient id={`fp-${id}-f`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={s0} stopOpacity="0.12" />
          <stop offset="100%" stopColor={s1} stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="27" ry="27" fill={`url(#fp-${id}-f)`} stroke={`url(#fp-${id}-s)`} strokeWidth="3" />
      <path d="M32 6 Q29 30 32 58" stroke={`url(#fp-${id}-s)`} strokeWidth="1.8" fill="none" opacity="0.3" />
    </svg>
  );
}
