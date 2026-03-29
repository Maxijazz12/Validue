"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

type ToastData = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  amount: number | null;
};

/**
 * Synthesize a satisfying "ka-ching" coin sound using Web Audio API.
 * Short, clean, recognizable — like Shopify's earnings notification.
 * Replace with custom MP3 later: new Audio("/sounds/ka-ching.mp3").play()
 */
function playKaChing() {
  try {
    const ctx = new AudioContext();

    // High metallic "ching" — two quick sine tones
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1800, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.08);
    gain1.gain.setValueAtTime(0.3, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc1.connect(gain1).connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.3);

    // Second "ring" slightly delayed — creates the double-tap feel
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2200, ctx.currentTime + 0.1);
    osc2.frequency.exponentialRampToValueAtTime(3000, ctx.currentTime + 0.18);
    gain2.gain.setValueAtTime(0, ctx.currentTime);
    gain2.gain.setValueAtTime(0.2, ctx.currentTime + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2).connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.1);
    osc2.stop(ctx.currentTime + 0.5);

    // Clean up
    setTimeout(() => ctx.close(), 600);
  } catch {
    // Silently fail if audio not available
  }
}

function ToastIcon({ type }: { type: string }) {
  if (type === "payout_earned") {
    return (
      <div className="w-[28px] h-[28px] rounded-full bg-[#34D399]/10 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </div>
    );
  }
  if (type === "new_response") {
    return (
      <div className="w-[28px] h-[28px] rounded-full bg-[#3b82f6]/10 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      </div>
    );
  }
  if (type === "ranking_complete") {
    return (
      <div className="w-[28px] h-[28px] rounded-full bg-[#8b5cf6]/10 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      </div>
    );
  }
  if (type === "quality_feedback") {
    return (
      <div className="w-[28px] h-[28px] rounded-full bg-[#f59e0b]/10 flex items-center justify-center shrink-0">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
        </svg>
      </div>
    );
  }
  // Default: campaign_completed or unknown
  return (
    <div className="w-[28px] h-[28px] rounded-full bg-[#E5654E]/10 flex items-center justify-center shrink-0">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    </div>
  );
}

export default function NotificationToast({ userId }: { userId: string }) {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const showToast = useCallback((data: ToastData) => {
    setToast(data);
    setVisible(true);

    // Play ka-ching for payout notifications
    if (data.type === "payout_earned") {
      playKaChing();
    }

    // Auto-dismiss after 5 seconds
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(() => setToast(null), 300); // Wait for exit animation
    }, 5000);
  }, []);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Record<string, unknown>;
          showToast({
            id: n.id as string,
            type: n.type as string,
            title: n.title as string,
            body: n.body as string | null,
            link: n.link as string | null,
            amount: n.amount as number | null,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeoutRef.current);
    };
  }, [userId, showToast]);

  if (!toast) return null;

  return (
    <div
      className={`fixed top-[16px] right-[16px] z-50 max-w-[360px] transition-all duration-300 ${
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-[12px]"
      }`}
    >
      <button
        onClick={() => {
          setVisible(false);
          if (toast.link) window.location.href = toast.link;
        }}
        className="w-full text-left flex items-center gap-[10px] bg-white/90 backdrop-blur-xl rounded-2xl px-[16px] py-[12px] shadow-[0_4px_20px_rgba(0,0,0,0.08),0_1px_4px_rgba(232,193,176,0.1)] border border-[#E2E8F0]/40 cursor-pointer hover:shadow-[0_6px_24px_rgba(0,0,0,0.1)] transition-all"
      >
        {/* Type-specific icon */}
        <ToastIcon type={toast.type} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-[13px] font-semibold text-[#111111]">{toast.title}</p>
          {toast.body && <p className="text-[12px] text-[#94A3B8] mt-[1px]">{toast.body}</p>}
          {toast.amount && (
            <span className="inline-block mt-[2px] font-mono font-bold text-[14px] text-[#34D399]">
              +${toast.amount}
            </span>
          )}
        </div>
      </button>
    </div>
  );
}
