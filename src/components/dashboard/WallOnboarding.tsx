"use client";

import { useState, useEffect, useTransition } from "react";
import { dismissOnboarding } from "@/app/dashboard/the-wall/actions";

type WallOnboardingProps = {
  userName: string;
  userRole: string;
  hasAvatar: boolean;
  hasPosted: boolean;
  hasResponded: boolean;
  ideaCount: number;
};

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <div className="w-[24px] h-[24px] rounded-full bg-[#22c55e] flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-[24px] h-[24px] rounded-full border-2 border-[#d4d4d4] shrink-0" />
  );
}

function ActionCard({
  done,
  title,
  description,
  cta,
  href,
  onClick,
}: {
  done: boolean;
  title: string;
  description: string;
  cta: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <div
      className={`flex gap-[12px] p-[16px] rounded-xl transition-all ${
        done
          ? "bg-[#22c55e]/5 border border-[#22c55e]/20"
          : "bg-[#faf8f5] border border-[#ebebeb] hover:border-[#d4d4d4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
      }`}
    >
      <CheckIcon done={done} />
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-semibold mb-[2px] ${done ? "text-[#22c55e]" : "text-[#111111]"}`}>
          {title}
        </div>
        <div className="text-[12px] text-[#999999] mb-[8px]">
          {description}
        </div>
        {!done && (
          <span className="text-[12px] font-semibold text-[#111111] inline-flex items-center gap-[4px]">
            {cta}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        )}
        {done && (
          <span className="text-[12px] font-medium text-[#22c55e]">Done</span>
        )}
      </div>
    </div>
  );

  if (href && !done) {
    return (
      <a href={href} className="no-underline block">
        {content}
      </a>
    );
  }
  if (onClick && !done) {
    return (
      <button onClick={onClick} className="w-full text-left bg-transparent border-none p-0 cursor-pointer">
        {content}
      </button>
    );
  }
  return content;
}

export default function WallOnboarding({
  userName,
  userRole,
  hasAvatar,
  hasPosted,
  hasResponded,
  ideaCount,
}: WallOnboardingProps) {
  const [dismissed, setDismissed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [, startTransition] = useTransition();

  const firstName = userName?.split(" ")[0] || "there";
  const profileComplete = hasAvatar && userName.trim().length > 0;
  const allDone = profileComplete && hasPosted && hasResponded;
  const completedCount = [profileComplete, hasResponded, hasPosted].filter(Boolean).length;

  // Check localStorage on mount for instant hide (avoids flash)
  useEffect(() => {
    const stored = localStorage.getItem("vldta-onboarding-dismissed");
    if (stored === "true") setDismissed(true);
    setMounted(true);
  }, []);

  // Auto-dismiss when all actions complete
  useEffect(() => {
    if (allDone && mounted) {
      handleDismiss();
    }
  }, [allDone, mounted]);

  function handleDismiss() {
    setDismissed(true);
    localStorage.setItem("vldta-onboarding-dismissed", "true");
    startTransition(() => {
      dismissOnboarding();
    });
  }

  // Don't render until mounted (prevents hydration mismatch with localStorage)
  if (!mounted || dismissed) return null;

  return (
    <div className="bg-white border border-[#ebebeb] rounded-2xl p-[24px] mb-[24px] relative border-l-[3px] border-l-[#e8b87a]">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-[16px] right-[16px] p-[4px] text-[#999999] hover:text-[#555555] bg-transparent border-none cursor-pointer transition-colors"
        aria-label="Dismiss onboarding"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-[20px] pr-[32px]">
        <h2 className="text-[20px] font-bold text-[#111111] tracking-[-0.3px] mb-[4px]">
          Welcome to the Wall, {firstName}
        </h2>
        <p className="text-[14px] text-[#555555]">
          {ideaCount > 0 ? (
            <>
              There {ideaCount === 1 ? "is" : "are"}{" "}
              <span className="font-semibold text-[#111111]">{ideaCount}</span>{" "}
              {ideaCount === 1 ? "idea" : "ideas"} being tested right now.
              {userRole === "respondent"
                ? " See ideas matched to your background. Earn for qualified feedback."
                : " Get feedback on your idea or explore what others are building."}
            </>
          ) : (
            <>
              The Wall is warming up.
              {userRole === "founder"
                ? " Be one of the first to post an idea and attract respondents."
                : " Complete your profile to be first in line when ideas go live."}
            </>
          )}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-[8px] mb-[16px]">
        <div className="flex-1 h-[3px] rounded-full bg-[#f5f2ed] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#65a30d] transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-[#999999] font-medium shrink-0">
          {completedCount}/3
        </span>
      </div>

      {/* Action cards */}
      <div className="grid grid-cols-3 gap-[12px] max-md:grid-cols-1">
        <ActionCard
          done={profileComplete}
          title="Complete your profile"
          description="Add a photo for better idea matching"
          cta="Go to settings"
          href="/dashboard/settings"
        />
        <ActionCard
          done={hasResponded}
          title="Answer your first idea"
          description="Earn money sharing your expertise"
          cta="View matched ideas"
          onClick={() => {
            document.getElementById("wall-feed")?.scrollIntoView({ behavior: "smooth" });
          }}
        />
        <ActionCard
          done={hasPosted}
          title="Post your first idea"
          description="Get real feedback from matched respondents"
          cta="Create an idea"
          href="/dashboard/ideas/new"
        />
      </div>
    </div>
  );
}
