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
      <p className="text-[11px] font-semibold uppercase tracking-[1px] text-[#94A3B8] mb-[10px] px-[2px]">
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
              {/* Avatar with category-colored gradient ring */}
              <div
                className="rounded-full p-[2px] transition-transform group-hover/story:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}88)`,
                }}
              >
                <div className="rounded-full bg-white p-[2px]">
                  <Avatar name={idea.creatorName} imageUrl={idea.creatorAvatar} size={44} />
                </div>
              </div>

              {/* Name */}
              <span className="text-[11px] text-[#64748B] font-medium w-[56px] text-center truncate">
                {firstName}
              </span>

              {/* Reward overlay */}
              {idea.rewardAmount > 0 && (
                <span
                  className="text-[9px] font-bold text-white px-[5px] py-[1px] rounded-full -mt-[4px]"
                  style={{ backgroundColor: accent }}
                >
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
