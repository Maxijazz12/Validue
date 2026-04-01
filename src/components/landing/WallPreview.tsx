"use client";

import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { mockWallIdeas } from "@/lib/constants";

type PreviewIdea = (typeof mockWallIdeas)[number];

function BadgeLabel({ badge }: { badge: PreviewIdea["badge"] }) {
  if (badge === "new") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#34D399]/10 text-[#059669] flex items-center gap-[5px]">
        <span className="w-[6px] h-[6px] rounded-full bg-[#34D399] live-pulse" />
        New
      </span>
    );
  }
  if (badge === "closing-soon") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#9BC4C8]/8 text-[#7BAAAE]">
        Closing Soon
      </span>
    );
  }
  if (badge === "high-reward") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#E8C1B0]/8 text-[#D4A494]">
        High Reward
      </span>
    );
  }
  return null;
}

function PreviewCard({ idea, showViewing }: { idea: PreviewIdea; showViewing?: boolean }) {
  const progress =
    idea.targetResponses > 0
      ? Math.min((idea.currentResponses / idea.targetResponses) * 100, 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl p-[20px] shadow-[0_2px_8px_rgba(180,140,110,0.07),0_1px_2px_rgba(0,0,0,0.03)] border border-[#EDE8E3] hover:shadow-[0_8px_32px_rgba(180,140,110,0.12),0_2px_8px_rgba(212,160,136,0.08)] hover:border-[#DDD6CE] hover:scale-[1.01] transition-all duration-250 group relative overflow-hidden">

      {/* Top row: category, tags, time estimate */}
      <div className="flex items-center justify-between gap-[8px] mb-[12px]">
        <div className="flex items-center gap-[6px] flex-wrap min-w-0">
          {idea.category && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#D4A088]/10 text-[#C4856E] shrink-0">
              {idea.category}
            </span>
          )}
          {idea.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#EDE8E3] text-[#A8A29E] shrink-0"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[#A8A29E] shrink-0">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {idea.estimatedMinutes} min
        </div>
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-semibold text-[#1C1917] mb-[6px]">
        {idea.title}
      </h3>

      {/* Description */}
      {idea.description && (
        <p className="text-[13px] text-[#78716C] leading-[1.5] mb-[16px] line-clamp-2">
          {idea.description}
        </p>
      )}

      {/* Progress + Reward row */}
      <div className="flex items-center gap-[16px] mb-[16px]">
        <div className="flex-1 min-w-0">
          <div className="h-[5px] rounded-full bg-[#EDE8E3] overflow-hidden relative">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `repeating-linear-gradient(90deg, #34D399 0px, #34D399 4px, transparent 4px, transparent 5px)`,
              }}
            />
          </div>
          <div className="text-[12px] text-[#A8A29E] mt-[6px]">
            <span className="font-mono font-semibold text-[#1C1917]">
              {idea.currentResponses}
            </span>
            /{idea.targetResponses} responses
          </div>
        </div>
        {idea.rewardAmount > 0 && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-[13px] font-semibold text-[#1C1917]">
              ${idea.rewardAmount}
            </div>
            <div className="text-[11px] text-[#A8A29E]">reward</div>
          </div>
        )}
      </div>

      {/* Bottom row: founder + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px] min-w-0">
          <Avatar name={idea.creatorName} size={18} />
          <span className="text-[12px] text-[#78716C] truncate">
            {idea.creatorName}
          </span>
          <span className="text-[12px] text-[#A8A29E]">
            · {idea.timeAgo}
          </span>
        </div>
        <div className="flex items-center gap-[8px]">
          {showViewing && (
            <span className="text-[11px] text-[#A8A29E] flex items-center gap-[4px]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#34D399] live-pulse" />
              3 viewing
            </span>
          )}
          <BadgeLabel badge={idea.badge} />
        </div>
      </div>
    </div>
  );
}

export default function WallPreview() {
  return (
    <section>
      {/* Section header */}
      <div className="text-center mb-[48px]">
        <div className="text-[12px] uppercase tracking-[0.06em] font-medium mb-[16px] text-gradient-warm">
          The Wall
        </div>
        <h2 className="text-[clamp(30px,4.5vw,46px)] font-bold tracking-[-0.04em] leading-[1.1] text-[#1C1917] mb-[16px]">
          See what founders are building{" "}
          <span className="italic font-light tracking-[-1px] text-gradient-animated font-heading">
            right now
          </span>
        </h2>
        <p className="text-[16px] text-[#78716C] max-w-[500px] mx-auto leading-[1.7]">
          Live startup ideas, open for feedback. Browse, respond
          thoughtfully, and get paid for your perspective.
        </p>
      </div>

      {/* Card grid with fade overlay */}
      <div className="relative">
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-[12px]">
          {mockWallIdeas.map((idea, i) => (
            <ScrollReveal key={idea.title} animation="scale" staggerIndex={i}>
              <PreviewCard idea={idea} showViewing={i === 0} />
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-b from-transparent via-[#FBF9F7]/80 to-[#FBF9F7] pointer-events-none" />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center mt-[8px] relative z-10">
        <Button variant="outline" href="/dashboard/the-wall">
          Explore the Wall
        </Button>
      </div>
    </section>
  );
}
