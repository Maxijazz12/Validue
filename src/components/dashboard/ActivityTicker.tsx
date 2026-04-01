"use client";

export type ActivityItem = {
  text: string;
  accent?: "green" | "warm" | "blue";
};

const ACCENT_COLORS = {
  green: "#34D399",
  warm: "#E8C1B0",
  blue: "#4F7BE8",
};

export default function ActivityTicker({ items }: { items: ActivityItem[] }) {
  if (items.length === 0) return null;

  // Duplicate for seamless loop
  const doubled = [...items, ...items];

  return (
    <div className="overflow-hidden relative rounded-xl wall-glass-surface mb-[12px]">
      <div className="flex w-max animate-[ticker_40s_linear_infinite]">
        {doubled.map((item, i) => (
          <div
            key={i}
            className="shrink-0 px-[24px] py-[8px] flex items-center gap-[8px] text-[12px] text-white/35 whitespace-nowrap"
          >
            <span
              className="w-[5px] h-[5px] rounded-full shrink-0"
              style={{ background: ACCENT_COLORS[item.accent || "warm"] }}
            />
            {item.text}
          </div>
        ))}
      </div>
    </div>
  );
}
