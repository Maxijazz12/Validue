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
    <div className="bg-white rounded-[28px] border border-[#E7E5E4]/60 shadow-[0_8px_30px_rgba(0,0,0,0.03)] overflow-hidden p-[32px]">
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h2 className="text-[20px] font-medium tracking-tight text-[#1C1917] mb-[4px]">
            Notifications
          </h2>
          <p className="text-[14px] text-[#A8A29E] font-medium">
            Choose which notifications you receive
          </p>
        </div>
        {saved && (
          <span className="text-[13px] text-[#2ca05a] font-semibold tracking-wide bg-[#2ca05a]/10 px-3 py-1 rounded-full">Saved</span>
        )}
      </div>

      <div className="flex flex-col gap-[4px]">
        {options.map((opt) => (
          <label
            key={opt.key}
            className="flex items-center justify-between p-[16px] rounded-[16px] hover:bg-[#F5F5F4]/60 transition-colors cursor-pointer"
          >
            <div className="min-w-0 mr-[16px]">
              <span className="text-[15px] font-semibold tracking-tight text-[#1C1917] block">
                {opt.label}
              </span>
              <span className="text-[13px] font-medium text-[#78716C] mt-[2px] block">
                {opt.description}
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[opt.key] !== false}
              onClick={() => handleToggle(opt.key)}
              disabled={isPending}
              className={`relative w-[46px] h-[26px] rounded-full transition-colors duration-300 cursor-pointer border-none shrink-0 ${
                prefs[opt.key] !== false ? "bg-[#1C1917]" : "bg-[#E7E5E4]"
              } ${isPending ? "opacity-50" : ""}`}
            >
              <span
                className={`absolute top-[3px] left-[3px] w-[20px] h-[20px] rounded-full bg-white shadow-sm transition-transform duration-300 ease-out ${
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
