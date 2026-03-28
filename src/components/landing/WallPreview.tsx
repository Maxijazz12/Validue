import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { mockWallIdeas } from "@/lib/constants";

type PreviewIdea = (typeof mockWallIdeas)[number];

function BadgeLabel({ badge }: { badge: PreviewIdea["badge"] }) {
  if (badge === "new") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#34D399]/10 text-[#059669]">
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

function PreviewCard({ idea }: { idea: PreviewIdea }) {
  const progress =
    idea.targetResponses > 0
      ? Math.min((idea.currentResponses / idea.targetResponses) * 100, 100)
      : 0;

  return (
    <div className="bg-white rounded-2xl p-[20px] shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E2E8F0] hover:shadow-[0_4px_12px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1] transition-all duration-200 group relative overflow-hidden">

      {/* Top row: category, tags, time estimate */}
      <div className="flex items-center justify-between gap-[8px] mb-[12px]">
        <div className="flex items-center gap-[6px] flex-wrap min-w-0">
          {idea.category && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#C8DBD9]/25 text-[#8FAFAD] shrink-0">
              {idea.category}
            </span>
          )}
          {idea.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#E2E8F0] text-[#94A3B8] shrink-0"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[#94A3B8] shrink-0">
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
      <h3 className="text-[16px] font-semibold text-[#111111] mb-[6px]">
        {idea.title}
      </h3>

      {/* Description */}
      {idea.description && (
        <p className="text-[13px] text-[#64748B] leading-[1.5] mb-[16px] line-clamp-2">
          {idea.description}
        </p>
      )}

      {/* Progress + Reward row */}
      <div className="flex items-center gap-[16px] mb-[16px]">
        <div className="flex-1 min-w-0">
          <div className="h-[5px] rounded-full bg-[#F1F5F9] overflow-hidden relative">
            <div
              className="h-full transition-all duration-500"
              style={{
                width: `${progress}%`,
                background: `repeating-linear-gradient(90deg, #34D399 0px, #34D399 4px, transparent 4px, transparent 5px)`,
              }}
            />
          </div>
          <div className="text-[12px] text-[#94A3B8] mt-[6px]">
            <span className="font-mono font-semibold text-[#111111]">
              {idea.currentResponses}
            </span>
            /{idea.targetResponses} responses
          </div>
        </div>
        {idea.rewardAmount > 0 && (
          <div className="shrink-0 text-right">
            <div className="font-mono text-[13px] font-semibold text-[#111111]">
              ${idea.rewardAmount}
            </div>
            <div className="text-[11px] text-[#94A3B8]">reward</div>
          </div>
        )}
      </div>

      {/* Bottom row: founder + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px] min-w-0">
          <Avatar name={idea.creatorName} size={18} />
          <span className="text-[12px] text-[#64748B] truncate">
            {idea.creatorName}
          </span>
          <span className="text-[12px] text-[#94A3B8]">
            · {idea.timeAgo}
          </span>
        </div>
        <BadgeLabel badge={idea.badge} />
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
        <h2 className="text-[clamp(30px,4.5vw,46px)] font-bold tracking-[-0.02em] leading-[1.1] text-[#222222] mb-[16px]">
          See what founders are building{" "}
          <span className="italic font-light tracking-[-1px] text-gradient-warm">
            right now
          </span>
        </h2>
        <p className="text-[16px] text-[#64748B] max-w-[500px] mx-auto leading-[1.7]">
          Live startup ideas, open for feedback. Browse, respond
          thoughtfully, and get paid for your perspective.
        </p>
      </div>

      {/* Card grid with fade overlay */}
      <div className="relative">
        <div className="grid grid-cols-2 max-md:grid-cols-1 gap-[12px]">
          {mockWallIdeas.map((idea) => (
            <PreviewCard key={idea.title} idea={idea} />
          ))}
        </div>

        {/* Bottom fade overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-b from-transparent via-[#FCFCFD]/80 to-[#FCFCFD] pointer-events-none" />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center gap-[12px] mt-[8px] relative z-10">
        <Button variant="primary" href="/dashboard/the-wall">
          Explore the Wall
        </Button>
        <Button variant="outline" href="/auth/signup">
          Post Your Idea
        </Button>
      </div>
    </section>
  );
}
