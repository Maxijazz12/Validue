"use client";

import { useState, useCallback } from "react";
import Avatar from "@/components/ui/Avatar";

const CATEGORY_BGS: Record<string, { bg: string; accent: string }> = {
  "Technology": { bg: "linear-gradient(135deg, #1E3A8A, #3B82F6)", accent: "bg-[#93C5FD]" },
  "Design": { bg: "linear-gradient(135deg, #831843, #EC4899)", accent: "bg-[#FBCFE8]" },
  "Business & Finance": { bg: "linear-gradient(135deg, #78350F, #F97316)", accent: "bg-[#FDBA74]" },
  "Founders": { bg: "linear-gradient(135deg, #4C1D95, #8B5CF6)", accent: "bg-[#C4B5FD]" },
  "Health & Wellness": { bg: "linear-gradient(135deg, #064E3B, #10B981)", accent: "bg-[#6EE7B7]" },
  "Marketing": { bg: "linear-gradient(135deg, #701A75, #D946EF)", accent: "bg-[#F0ABFC]" },
  "Gaming": { bg: "linear-gradient(135deg, #0B0F19, #4F46E5)", accent: "bg-[#818CF8]" },
  "Lifestyle": { bg: "linear-gradient(135deg, #9A3412, #F59E0B)", accent: "bg-[#FDE68A]" },
};

function getCategoryVisuals(cat?: string | null) {
  return CATEGORY_BGS[cat || ""] || { bg: "linear-gradient(135deg, #F3F4F6, #E5E7EB)", accent: "bg-[#D1D5DB]" };
}

export type WallCardProps = {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  tags: string[];
  estimatedMinutes: number;
  rewardAmount: number;
  currentResponses: number;
  targetResponses: number;
  createdAt: string;
  deadline: string | null;
  creatorName: string;
  creatorAvatar: string | null;
  bonusAvailable: boolean;
  rewardsTopAnswers: boolean;
  rewardType: string | null;
  matchScore: number;
  variant?: "featured" | "standard";
  isVisible?: boolean;
  isSaved?: boolean;
  onToggleSave?: (id: string) => void;
  isExpanded?: boolean;
  onToggleExpand?: (id: string) => void;
  matchReasons?: string[];
  firstQuestion?: { id: string; text: string; type: string; options: string[] | null } | null;
  isFocused?: boolean;
  reactionCounts?: Record<string, number>;
  userReactions?: string[];
  recentRespondents?: Array<{ name: string; avatar: string | null }>;
  lastActivityLabel?: string | null;
  isSubsidized?: boolean;
  economicsVersion?: number;
  format?: string | null;

  /* Feature alignment prop from WallFeed */
  align?: 'left' | 'right';
};

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function WallCard({
  id, title, description, category,
  estimatedMinutes, rewardAmount,
  currentResponses, targetResponses,
  createdAt, creatorName, creatorAvatar,
  isSaved = false, onToggleSave,
  isExpanded = false, onToggleExpand,
  firstQuestion, align = 'left',
}: WallCardProps) {
  const progress = targetResponses > 0 ? Math.min((currentResponses / targetResponses) * 100, 100) : 0;
  const [inlineAnswer, setInlineAnswer] = useState("");

  const handleSave = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleSave?.(id);
  }, [id, onToggleSave]);

  const interFont: React.CSSProperties = { fontFamily: "var(--font-wall-body)" };
  const creatorShort = creatorName.split(" ").map((w, i) => i === 0 ? w : w[0] + ".").join(" ");
  const visuals = getCategoryVisuals(category);

  return (
    <div
      id={`wall-card-${id}`}
      className={`w-full flex flex-col gap-[48px] md:gap-[100px] md:flex-row items-center justify-between ${align === 'right' ? 'md:flex-row-reverse' : ''}`}
      style={interFont}
    >
      {/* ── TEXT CONTENT PANE ── */}
      <div className="flex-1 w-full max-w-[540px] flex flex-col justify-center">
        
        {/* Author & Meta Row */}
        <div className="flex items-center gap-[12px] mb-[32px]">
          <Avatar name={creatorName} imageUrl={creatorAvatar} size={48} />
          <div className="flex flex-col justify-center">
            <span className="text-[16px] font-bold text-[#111111] leading-tight">{creatorName}</span>
            <div className="flex items-center gap-[6px] text-[13px] font-semibold text-[#A8A29E] uppercase tracking-wide mt-[2px]">
              <span>{timeAgo(createdAt)}</span>
              {category && (
                <>
                  <span className="w-[4px] h-[4px] rounded-full bg-[#D6D3D1]" />
                  <span>{category}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Title */}
        <h2 className="text-[32px] md:text-[42px] font-medium leading-[1.15] text-[#111111] tracking-[-0.03em] mb-[20px]">
          {title}
        </h2>

        {/* Description / Subtext */}
        <p className="text-[16px] md:text-[18px] text-[#78716C] leading-[1.6] mb-[40px] max-w-[95%]">
          {description && description.length > 5 ? description : "Share your perspective on this idea and help shape its future."}
        </p>

        {/* Call to Action Row */}
        {!isExpanded ? (
          <div className="flex flex-wrap items-center gap-[16px]">
            <button
              onClick={() => onToggleExpand?.(id)}
              className="px-[32px] py-[18px] rounded-full bg-[#111111] hover:bg-[#292524] text-white font-medium text-[16px] transition-transform hover:-translate-y-[2px] shadow-[0_8px_24px_rgba(0,0,0,0.12)] flex items-center gap-[12px]"
            >
              Give feedback
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
            </button>

            <button
              onClick={handleSave}
              className={`p-[18px] rounded-full flex items-center justify-center transition-colors ${isSaved ? 'bg-[#FFF1F2] text-[#E5654E]' : 'bg-[#F5F5F4] text-[#78716C] hover:bg-[#E7E5E4]'}`}
              aria-label="Bookmark"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill={isSaved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
            </button>
          </div>
        ) : (
          /* Inline Expand Answering */
          <div className="w-full bg-[#F8FAFC] p-[24px] md:p-[32px] rounded-[24px] border border-[#E2E8F0] shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
            {firstQuestion && (
               <div className="flex flex-col gap-[16px]">
                  <h4 className="text-[18px] font-semibold text-[#1C1917] leading-[1.4]">{firstQuestion.text}</h4>
                  
                  {firstQuestion.type === "open" && (
                    <textarea
                      value={inlineAnswer}
                      onChange={(e) => setInlineAnswer(e.target.value)}
                      placeholder="Start typing your thoughts..."
                      autoFocus
                      className="w-full min-h-[120px] rounded-[16px] p-[20px] text-[16px] bg-white border border-[#E2E8F0] focus:border-[#111111] focus:ring-1 focus:ring-[#111111] outline-none resize-none shadow-inner"
                    />
                  )}
                  {firstQuestion.type === "multiple_choice" && firstQuestion.options && (
                    <div className="flex flex-col gap-[8px]">
                      {firstQuestion.options.map((opt, i) => (
                         <div key={i} className="px-[20px] py-[14px] bg-white border border-[#E2E8F0] rounded-[16px] text-[15px] font-medium text-[#475569]">{opt}</div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center gap-[12px] mt-[12px]">
                    <a
                      href={`/dashboard/the-wall/${id}${inlineAnswer.trim().length > 0 ? `?prefill=${encodeURIComponent(inlineAnswer.trim())}&qid=${firstQuestion.id}` : ''}`}
                      className="px-[28px] py-[14px] rounded-full bg-[#111111] text-white font-medium text-[15px] shadow-sm transition-transform hover:-translate-y-[1px] no-underline"
                    >
                      {inlineAnswer.trim().length > 0 ? "Continue" : "Start Answering"}
                    </a>
                    <button onClick={() => onToggleExpand?.(id)} className="px-[20px] py-[14px] text-[#A8A29E] font-medium text-[15px] hover:text-[#1C1917] transition-colors">
                      Cancel
                    </button>
                  </div>
               </div>
            )}
          </div>
        )}
      </div>

      {/* ── GRAPHIC / STATS PANE ── */}
      <div className="flex-1 w-full max-w-[540px]">
        {/* Massive aesthetic poster container (Kinso image style) */}
        <div className="w-full aspect-[4/3] rounded-[32px] shadow-[0_24px_48px_rgba(0,0,0,0.04)] relative overflow-hidden group">
          
          {/* Aesthetic Background */}
          <div className="absolute inset-0 transition-transform duration-700 group-hover:scale-105" style={{ background: visuals.bg }}>
            {/* Soft concentric layers for depth */}
            <div className={`absolute top-[-100px] right-[-100px] w-[300px] h-[300px] rounded-full blur-[60px] mix-blend-overlay ${visuals.accent}`} />
            <div className="absolute bottom-[-100px] left-[-100px] w-[400px] h-[400px] rounded-full blur-[80px] bg-white/20 mix-blend-soft-light" />
          </div>

          {/* Dots overlay for texture */}
          <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: "radial-gradient(#000 2px, transparent 2px)", backgroundSize: "24px 24px" }} />

          {/* Centerpiece Floating Glass Widget */}
          <div className="absolute left-[32px] right-[32px] bottom-[32px] md:left-[48px] md:right-[48px] md:bottom-[48px]">
             <div className="p-[32px] rounded-[24px] bg-white/90 backdrop-blur-xl border border-white/40 shadow-[0_16px_32px_rgba(0,0,0,0.05)] flex flex-col gap-[28px] transition-transform duration-500 group-hover:-translate-y-2">
                
                {/* Metrics Header */}
                <div className="flex justify-between items-start w-full">
                  {rewardAmount > 0 ? (
                    <div className="px-[16px] py-[8px] rounded-full bg-[#FFF1F2] text-[#E5654E] text-[14px] font-bold shadow-sm">
                      ${rewardAmount} Reward
                    </div>
                  ) : (
                    <div className="px-[16px] py-[8px] rounded-full bg-white text-[#111111] text-[14px] font-bold shadow-sm border border-gray-100">
                      Community
                    </div>
                  )}
                  <div className="px-[16px] py-[8px] rounded-full bg-black/5 text-[#44403C] text-[13px] font-semibold flex items-center gap-[6px]">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                    {estimatedMinutes} min
                  </div>
                </div>

                {/* Progress Bar Display */}
                <div className="flex flex-col gap-[14px]">
                   <div className="flex items-end justify-between">
                     <span className="text-[14px] font-bold text-[#78716C] uppercase tracking-wider">Validation Goal</span>
                     <span className="text-[36px] font-bold text-[#111111] leading-none tracking-tight">{progress.toFixed(0)}%</span>
                   </div>
                   <div className="w-full h-[8px] bg-[#E2E8F0] rounded-full overflow-hidden">
                     <div className="h-full rounded-full transition-all duration-1000 ease-out" style={{ width: `${Math.max(progress, 3)}%`, background: "linear-gradient(90deg, #111111 0%, #44403C 100%)" }} />
                   </div>
                   <span className="text-[14px] font-medium text-[#A8A29E]">
                     {currentResponses} of {targetResponses} target users joined
                   </span>
                </div>

             </div>
          </div>
        </div>
      </div>

    </div>
  );
}
