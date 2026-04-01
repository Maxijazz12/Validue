import type { WallCardProps } from "@/components/dashboard/WallCard";

/* ─── 3-tone accent map (matches landing page palette) ─── */
const COOL_CATEGORIES = new Set(["SaaS / Software", "Finance & FinTech", "AI & Machine Learning", "Mobile Apps", "Education", "Real Estate"]);
const WARM_CATEGORIES = new Set(["Consumer Products", "Health & Wellness", "Food & Beverage", "Fashion & Apparel", "Social Impact", "Sustainability", "Travel & Hospitality"]);

type Props =
  | { type: "hot-category"; hotIdea: WallCardProps; matchCount?: never; totalVelocity?: never }
  | { type: "match-power"; matchCount: number; hotIdea?: never; totalVelocity?: never }
  | { type: "social-proof"; totalVelocity: number; hotIdea?: never; matchCount?: never };

export default function FeedInterstitial(props: Props) {
  if (props.type === "hot-category" && props.hotIdea) {
    const cat = props.hotIdea.category;
    const accent = cat && COOL_CATEGORIES.has(cat) ? "#9BC4C8" : cat && WARM_CATEGORIES.has(cat) ? "#E8C1B0" : "#94A3B8";
    return (
      <div className="col-span-full">
        <a
          href={`/dashboard/the-wall/${props.hotIdea.id}`}
          className="wall-glass-surface flex items-center gap-[16px] p-[16px] no-underline hover:border-white/[0.12] transition-all duration-200 group"
          style={{ background: `radial-gradient(ellipse at left, ${accent}08, transparent)` }}
        >
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[1px] mb-[4px]" style={{ color: accent }}>
              Hot in {props.hotIdea.category}
            </p>
            <p className="text-[14px] font-semibold text-white/80 truncate group-hover:text-white/95 transition-colors">
              {props.hotIdea.title}
            </p>
          </div>
          {props.hotIdea.rewardAmount > 0 && (
            <span className="font-mono font-bold text-[12px] px-[10px] py-[4px] rounded-full bg-white/[0.08] border border-white/[0.06] text-white/60 shrink-0">
              ${props.hotIdea.rewardAmount}
            </span>
          )}
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="shrink-0 text-white/20 group-hover:text-white/50 transition-colors"
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </a>
      </div>
    );
  }

  if (props.type === "match-power") {
    return (
      <div className="col-span-full">
        <div className="wall-glass-surface flex items-center gap-[16px] p-[16px]">
          <div className="w-[40px] h-[40px] rounded-full bg-gradient-to-br from-[#E5654E]/20 to-[#E8C1B0]/20 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E8C1B0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-white/50">
              You match <span className="font-bold text-[#E8C1B0] text-[15px]">{props.matchCount}</span> active campaigns
            </p>
            <p className="text-[11px] text-white/25">Based on your expertise and interests</p>
          </div>
        </div>
      </div>
    );
  }

  if (props.type === "social-proof") {
    return (
      <div className="col-span-full">
        <div className="wall-glass-surface flex items-center gap-[16px] p-[16px]">
          <div className="w-[40px] h-[40px] rounded-full bg-[#34D399]/10 flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-[13px] text-white/50">
              <span className="font-bold text-[#34D399] text-[15px]">{props.totalVelocity}</span> responses this hour across The Wall
            </p>
            <p className="text-[11px] text-white/25">Join the conversation</p>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
