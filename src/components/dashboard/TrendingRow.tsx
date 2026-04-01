"use client";

import Avatar from "@/components/ui/Avatar";
import type { WallCardProps } from "@/components/dashboard/WallCard";

/* ─── 3-tone accent map (matches landing page palette) ─── */
const COOL_CATEGORIES = new Set(["SaaS / Software", "Finance & FinTech", "AI & Machine Learning", "Mobile Apps", "Education", "Real Estate"]);
const WARM_CATEGORIES = new Set(["Consumer Products", "Health & Wellness", "Food & Beverage", "Fashion & Apparel", "Social Impact", "Sustainability", "Travel & Hospitality"]);

function getAccent(category: string | null): string {
  if (!category) return "#94A3B8";
  if (COOL_CATEGORIES.has(category)) return "#9BC4C8";
  if (WARM_CATEGORIES.has(category)) return "#E8C1B0";
  return "#94A3B8";
}

export default function TrendingRow({ ideas }: { ideas: WallCardProps[] }) {
  if (ideas.length < 4) return null;

  const items = ideas.slice(0, 8);

  function scrollToCard(id: string) {
    const el = document.getElementById(`wall-card-${id}`);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return (
    <div className="mb-[20px]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-[#A8A29E] mb-[10px] px-[2px]">
        Trending now
      </p>
      <div className="trending-row flex gap-[16px] overflow-x-auto pb-[4px]" style={{ scrollSnapType: "x mandatory" }}>
        {items.map((idea) => {
          const accent = getAccent(idea.category);
          const firstName = idea.creatorName.split(" ")[0];
          return (
            <button
              key={idea.id}
              onClick={() => scrollToCard(idea.id)}
              className="flex flex-col items-center gap-[6px] shrink-0 bg-transparent border-none cursor-pointer group/story"
              style={{ scrollSnapAlign: "start" }}
            >
              {/* Avatar with glass bubble + warm accent ring on hover */}
              <div
                className="rounded-full p-[2px] transition-all duration-200 group-hover/story:scale-105"
                style={{
                  background: `#FFFFFF`,
                  border: `1px solid rgba(0,0,0,0.06)`,
                  boxShadow: `0 2px 6px rgba(0,0,0,0.03)`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${accent}60`;
                  e.currentTarget.style.boxShadow = `0 4px 12px ${accent}30`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = `rgba(0,0,0,0.06)`;
                  e.currentTarget.style.boxShadow = `0 2px 6px rgba(0,0,0,0.03)`;
                }}
              >
                <Avatar name={idea.creatorName} imageUrl={idea.creatorAvatar} size={44} />
              </div>

              {/* Name */}
              <span className="text-[11px] text-[#78716C] font-medium w-[56px] text-center truncate">
                {firstName}
              </span>

              {/* Reward overlay — glass pill */}
              {idea.rewardAmount > 0 && (
                <span className="text-[9px] font-bold text-[#E5654E] bg-[#FCFAFA] border border-[#E8C1B0] backdrop-blur-sm px-[5px] py-[1px] rounded-full -mt-[4px] shadow-sm">
                  ${idea.rewardAmount}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
