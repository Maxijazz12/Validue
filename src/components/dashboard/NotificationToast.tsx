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
        {/* Validue peach icon — matches FloatingCard on landing page */}
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[24px] h-[24px] shrink-0">
          <defs>
            <linearGradient id="notif-s" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E5654E" />
              <stop offset="100%" stopColor="#E8C1B0" />
            </linearGradient>
            <linearGradient id="notif-f" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E5654E" stopOpacity="0.12" />
              <stop offset="100%" stopColor="#E8C1B0" stopOpacity="0.06" />
            </linearGradient>
          </defs>
          <ellipse cx="32" cy="32" rx="27" ry="27" fill="url(#notif-f)" stroke="url(#notif-s)" strokeWidth="3" />
          <path d="M32 6 Q29 30 32 58" stroke="url(#notif-s)" strokeWidth="1.8" fill="none" opacity="0.3" />
        </svg>

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
