"use client";

import { useState, useTransition } from "react";
import { updateNotificationPreferences } from "./notification-actions";

type NotifType = "new_response" | "campaign_completed" | "payout_earned" | "ranking_complete" | "quality_feedback";

const NOTIFICATION_OPTIONS: { key: NotifType; label: string; description: string }[] = [
  { key: "new_response", label: "New responses", description: "When someone responds to your campaign" },
  { key: "campaign_completed", label: "Campaign complete", description: "When your campaign reaches its target" },
  { key: "ranking_complete", label: "Ranking complete", description: "When AI ranking finishes for your responses" },
  { key: "payout_earned", label: "Earnings", description: "When you receive a payout for your response" },
  { key: "quality_feedback", label: "Quality feedback", description: "When your response is scored" },
];

type NotificationPreferencesProps = {
  preferences: Record<string, boolean>;
  role: string;
};

export default function NotificationPreferences({ preferences, role }: NotificationPreferencesProps) {
  const [prefs, setPrefs] = useState<Record<string, boolean>>(preferences);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  // Filter options by role relevance
  const options = NOTIFICATION_OPTIONS.filter((opt) => {
    if (role === "respondent") return ["payout_earned", "quality_feedback"].includes(opt.key);
    if (role === "founder") return ["new_response", "campaign_completed", "ranking_complete"].includes(opt.key);
    return true;
  });

  function handleToggle(key: string) {
    const next = { ...prefs, [key]: !prefs[key] };
    setPrefs(next);
    setSaved(false);

    startTransition(async () => {
      await updateNotificationPreferences(next);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[32px]">
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h2 className="text-[16px] font-semibold text-[#111111] mb-[4px]">
            Notifications
          </h2>
          <p className="text-[13px] text-[#64748B]">
            Choose which notifications you receive
          </p>
        </div>
        {saved && (
          <span className="text-[12px] text-[#22c55e] font-medium">Saved</span>
        )}
      </div>

      <div className="flex flex-col gap-[4px]">
        {options.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center justify-between p-[14px] rounded-xl hover:bg-[#FCFCFD] transition-colors cursor-pointer"
          >
            <div className="min-w-0 mr-[16px]">
              <span className="text-[14px] font-medium text-[#111111] block">
                {opt.label}
              </span>
              <span className="text-[12px] text-[#94A3B8]">
                {opt.description}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[opt.key] !== false}
              onClick={() => handleToggle(opt.key)}
              disabled={isPending}
              className={`relative w-[44px] h-[24px] rounded-full transition-colors duration-200 cursor-pointer border-none shrink-0 ${
                prefs[opt.key] !== false ? "bg-[#111111]" : "bg-[#E2E8F0]"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-[2px] left-[2px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  prefs[opt.key] !== false ? "translate-x-[20px]" : "translate-x-0"
                }`}
              />
            </button>
          </label>
        ))}
      </div>
    </div>
  );
}
