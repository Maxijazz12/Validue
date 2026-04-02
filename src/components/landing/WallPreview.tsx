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
    <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[20px] shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] border border-white/80 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-[2px] transition-all duration-500 group relative overflow-hidden">

      {/* Top row: category, tags, time estimate */}
      <div className="flex items-center justify-between gap-[8px] mb-[16px]">
        <div className="flex items-center gap-[8px] flex-wrap min-w-0">
          {idea.category && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-widest px-[8px] py-[4px] rounded-md bg-[#1C1917] text-white shrink-0">
              [{idea.category}]
            </span>
          )}
          {idea.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="font-mono text-[9px] font-bold uppercase tracking-widest px-[8px] py-[3px] rounded-md border border-black/10 text-[#A8A29E] shrink-0"
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
      <div className="text-center mb-[64px]">
        <div className="font-mono text-[10px] uppercase font-bold tracking-widest mb-[16px] text-[#A8A29E]">
          {"// "}LIVE_NETWORK_NODES
        </div>
        <h2 className="text-[clamp(32px,5vw,56px)] font-bold tracking-tight leading-[1.05] text-[#1C1917] mb-[24px]">
          Inspect current{" "}
          <span className="italic font-light tracking-[-0.02em] text-[#1C1917]/50 font-sans">
            validations
          </span>
        </h2>
        <p className="font-mono text-[11px] uppercase tracking-widest text-[#A8A29E] max-w-[500px] mx-auto leading-[1.8]">
          LIVE STARTUP CONSTRAINTS, OPEN FOR REVIEW. SYNTHESIZE FEEDBACK TO EARN YIELD.
        </p>
      </div>

      {/* Card grid with fade overlay */}
      <div className="relative">
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-[16px]">
          {mockWallIdeas.map((idea, i) => (
            <ScrollReveal key={idea.title} animation="slide-up" staggerIndex={i}>
              <PreviewCard idea={idea} showViewing={i === 0} />
            </ScrollReveal>
          ))}
        </div>

        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
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
