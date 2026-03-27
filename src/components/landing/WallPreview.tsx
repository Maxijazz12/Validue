import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import { mockWallIdeas } from "@/lib/constants";

type PreviewIdea = (typeof mockWallIdeas)[number];

function BadgeLabel({ badge }: { badge: PreviewIdea["badge"] }) {
  if (badge === "new") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#22c55e]/10 text-[#22c55e]">
        New
      </span>
    );
  }
  if (badge === "closing-soon") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#e8b87a]/15 text-[#c4883a]">
        Closing Soon
      </span>
    );
  }
  if (badge === "high-reward") {
    return (
      <span className="text-[11px] font-semibold px-[8px] py-[3px] rounded-full bg-[#a855f7]/10 text-[#a855f7]">
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
    <div className="bg-white border border-[#ebebeb] rounded-xl p-[20px] hover:shadow-[0_4px_16px_rgba(0,0,0,0.06)] transition-all duration-200">
      {/* Top row: category, tags, time estimate */}
      <div className="flex items-center justify-between gap-[8px] mb-[12px]">
        <div className="flex items-center gap-[6px] flex-wrap min-w-0">
          {idea.category && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#f5f2ed] text-[#555555] shrink-0">
              {idea.category}
            </span>
          )}
          {idea.tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#ebebeb] text-[#999999] shrink-0"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-[4px] text-[12px] text-[#999999] shrink-0">
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
        <p className="text-[13px] text-[#555555] leading-[1.5] mb-[16px] line-clamp-2">
          {idea.description}
        </p>
      )}

      {/* Progress + Reward row */}
      <div className="flex items-center gap-[16px] mb-[16px]">
        <div className="flex-1 min-w-0">
          <div className="h-[4px] rounded-full bg-[#f5f2ed] overflow-hidden">
            <div
              className="h-full rounded-full bg-[#65a30d] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="text-[12px] text-[#999999] mt-[6px]">
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
            <div className="text-[11px] text-[#999999]">reward</div>
          </div>
        )}
      </div>

      {/* Bottom row: founder + badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-[8px] min-w-0">
          <Avatar name={idea.creatorName} size={24} />
          <span className="text-[12px] text-[#555555] truncate">
            {idea.creatorName}
          </span>
          <span className="text-[12px] text-[#999999]">
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
        <div className="text-[11px] text-[#999999] uppercase tracking-[1.5px] font-medium mb-[16px]">
          The Wall
        </div>
        <h2 className="text-[clamp(32px,5vw,52px)] font-extrabold tracking-[-2px] leading-[1.1] text-[#111111] mb-[16px]">
          See what founders are building{" "}
          <span className="text-[#e8b87a]/70 italic font-light tracking-[-1px]">
            right now
          </span>
        </h2>
        <p className="text-[17px] text-[#555555] max-w-[520px] mx-auto leading-[1.7]">
          Real startup ideas from real founders. Browse live ideas, give
          thoughtful feedback, and earn money for your insights.
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
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-b from-transparent to-[#faf8f5] pointer-events-none" />
      </div>

      {/* CTA */}
      <div className="flex items-center justify-center gap-[12px] mt-[8px] relative z-10">
        <Button variant="primary" href="/dashboard/the-wall">
          Explore the Wall
        </Button>
        <Button variant="secondary" href="/auth/signup">
          Post Your Idea
        </Button>
      </div>
    </section>
  );
}
