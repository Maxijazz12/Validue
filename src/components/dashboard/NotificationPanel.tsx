"use client";

import { useState, useEffect, useCallback, useTransition } from "react";
import { getNotifications, markNotificationRead, markAllRead, type Notification } from "@/app/dashboard/notifications/actions";

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

const NOTIF_ICONS: Record<string, { bg: string; color: string; icon: React.ReactNode }> = {
  payout_earned: {
    bg: "bg-[#34D399]/10",
    color: "#34D399",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  campaign_completed: {
    bg: "bg-[#E5654E]/10",
    color: "#E5654E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  new_response: {
    bg: "bg-[#3b82f6]/10",
    color: "#3b82f6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  ranking_complete: {
    bg: "bg-[#8b5cf6]/10",
    color: "#8b5cf6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  quality_feedback: {
    bg: "bg-[#f59e0b]/10",
    color: "#f59e0b",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
      </svg>
    ),
  },
};

function NotificationIcon({ type }: { type: string }) {
  const config = NOTIF_ICONS[type] || NOTIF_ICONS.campaign_completed;
  return (
    <div className={`w-[32px] h-[32px] rounded-full ${config.bg} flex items-center justify-center shrink-0`}>
      {config.icon}
    </div>
  );
}

export default function NotificationPanel() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    getNotifications().then((data) => {
      setNotifications(data);
      setLoading(false);
    });
  }, []);

  const handleClick = useCallback((notif: Notification) => {
    if (!notif.read_at) {
      startTransition(async () => {
        await markNotificationRead(notif.id);
        setNotifications((prev) =>
          prev.map((n) => n.id === notif.id ? { ...n, read_at: new Date().toISOString() } : n)
        );
      });
    }
    if (notif.link) {
      window.location.href = notif.link;
    }
  }, []);

  const handleMarkAllRead = useCallback(() => {
    startTransition(async () => {
      await markAllRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
    });
  }, []);

  const unreadCount = notifications.filter((n) => !n.read_at).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-[24px]">
        <div>
          <h1 className="text-[24px] font-bold tracking-[-0.03em] text-[#111111]">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-[14px] text-[#64748B] mt-[2px]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-[13px] text-[#94A3B8] hover:text-[#111111] bg-transparent border-none cursor-pointer transition-colors disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="py-[48px] text-center text-[14px] text-[#A8A29E] font-mono uppercase tracking-widest">Reading terminal...</div>
      ) : notifications.length === 0 ? (
        <div className="py-[120px] text-center border border-dashed border-white/60 rounded-[32px] bg-white/40 backdrop-blur-xl">
          <span className="font-mono text-[11px] font-bold tracking-widest text-[#A8A29E] uppercase mb-4 block">Event Log Empty</span>
          <p className="text-[20px] font-medium tracking-tight text-[#1C1917] mb-[4px]">You&apos;re all caught up</p>
          <p className="text-[14px] text-[#78716C] mt-[4px]">
            Ping signals will resolve here when operations conclude.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-[16px] p-[20px] rounded-[24px] border text-left w-full cursor-pointer transition-all duration-400 group hover:shadow-[0_12px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] ${
                notif.read_at
                  ? "bg-white/30 backdrop-blur-2xl border-white/40 shadow-[0_4px_24px_rgba(0,0,0,0.015)]"
                  : "bg-white/60 backdrop-blur-3xl border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] border-l-[4px] border-l-[#E5654E]"
              }`}
            >
              <NotificationIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[8px]">
                  <span className={`text-[15px] tracking-tight font-medium ${notif.read_at ? "text-[#78716C]" : "text-[#1C1917]"}`}>
                    {notif.title}
                  </span>
                  <span className="font-mono text-[10px] text-[#A8A29E] uppercase tracking-widest shrink-0">{timeAgo(notif.created_at)}</span>
                </div>
                {notif.body && (
                  <p className="text-[14px] text-[#78716C] mt-[4px] line-clamp-2 leading-snug">{notif.body}</p>
                )}
                {notif.amount && (
                  <span className="inline-block mt-[6px] font-mono font-bold text-[14px] text-[#22C55E]">
                    ${notif.amount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
