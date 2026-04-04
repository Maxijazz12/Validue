"use client";

import { useState, useEffect, useTransition, useCallback } from "react";
import { dismissOnboarding } from "@/app/dashboard/the-wall/actions";
import { FEATURES } from "@/lib/feature-flags";

type WallOnboardingProps = {
  userName: string;
  showRespondentExperience: boolean;
  hasAvatar: boolean;
  hasPosted: boolean;
  hasResponded: boolean;
  ideaCount: number;
};

function CheckIcon({ done }: { done: boolean }) {
  if (done) {
    return (
      <div className="w-[24px] h-[24px] rounded-full bg-accent flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
    );
  }
  return (
    <div className="w-[24px] h-[24px] rounded-full border-2 border-[#E5E5E5] shrink-0" />
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
          ? "bg-bg-muted border border-bg-muted"
          : "bg-white border border-bg-muted hover:border-border-light"
      }`}
    >
      <CheckIcon done={done} />
      <div className="flex-1 min-w-0">
        <div className={`text-[14px] font-semibold mb-[2px] ${done ? "text-text-muted" : "text-text-primary"}`}>
          {title}
        </div>
        <div className="text-[12px] text-text-muted mb-[8px]">
          {description}
        </div>
        {!done && (
          <span className="text-[12px] font-semibold text-text-primary inline-flex items-center gap-[4px]">
            {cta}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
            </svg>
          </span>
        )}
        {done && (
          <span className="text-[12px] font-medium text-text-muted">Done</span>
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
  showRespondentExperience,
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
    const stored = localStorage.getItem("validue-onboarding-dismissed");
    if (stored === "true") setDismissed(true); // eslint-disable-line react-hooks/set-state-in-effect -- localStorage sync
    setMounted(true);
  }, []);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
    localStorage.setItem("validue-onboarding-dismissed", "true");
    startTransition(() => {
      dismissOnboarding();
    });
  }, [startTransition]);

  // Auto-dismiss when all actions complete
  useEffect(() => {
    if (allDone && mounted) {
      handleDismiss(); // eslint-disable-line react-hooks/set-state-in-effect -- auto-dismiss callback
    }
  }, [allDone, mounted, handleDismiss]);

  // Don't render until mounted (prevents hydration mismatch with localStorage)
  if (!mounted || dismissed) return null;

  return (
    <div className="bg-white border border-bg-muted rounded-xl p-[24px] mb-[24px] relative">
      {/* Dismiss button */}
      <button
        onClick={handleDismiss}
        className="absolute top-[16px] right-[16px] p-[4px] text-text-muted hover:text-text-secondary bg-transparent border-none cursor-pointer transition-colors"
        aria-label="Dismiss onboarding"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      {/* Header */}
      <div className="mb-[20px] pr-[32px]">
        <h2 className="text-[20px] font-bold text-text-primary tracking-[-0.02em] mb-[4px]">
          Welcome to the Wall, {firstName}
        </h2>
        <p className="text-[14px] text-text-secondary">
          {ideaCount > 0 ? (
            <>
              There {ideaCount === 1 ? "is" : "are"}{" "}
              <span className="font-semibold text-text-primary">{ideaCount}</span>{" "}
              {ideaCount === 1 ? "idea" : "ideas"} being tested right now.
              {showRespondentExperience
                ? FEATURES.RESPONDENT_PAYOUTS
                  ? " See ideas matched to your background. Earn for qualified feedback."
                  : " See ideas matched to your background and help founders pressure-test what they are building."
                : " Get feedback on your idea or explore what others are building."}
            </>
          ) : (
            <>
              The Wall is warming up.
              {!showRespondentExperience
                ? " Be one of the first to post an idea and attract respondents."
                : " Complete your profile to be first in line when ideas go live."}
            </>
          )}
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center gap-[8px] mb-[16px]">
        <div className="flex-1 h-[3px] rounded-full bg-bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-accent transition-all duration-500"
            style={{ width: `${(completedCount / 3) * 100}%` }}
          />
        </div>
        <span className="text-[11px] text-text-muted font-medium shrink-0">
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
          description={FEATURES.RESPONDENT_PAYOUTS ? "Earn money sharing your expertise" : "Share focused feedback from your own experience"}
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
