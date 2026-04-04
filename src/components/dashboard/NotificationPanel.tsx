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
    bg: "bg-success-mid/10",
    color: "#34D399",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#34D399" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
  campaign_completed: {
    bg: "bg-brand/10",
    color: "#E5654E",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  new_response: {
    bg: "bg-info/10",
    color: "#3b82f6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
      </svg>
    ),
  },
  ranking_complete: {
    bg: "bg-purple/10",
    color: "#8b5cf6",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
      </svg>
    ),
  },
  quality_feedback: {
    bg: "bg-warning/10",
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
    getNotifications()
      .then((data) => {
        setNotifications(data);
      })
      .catch((err) => {
        console.error("Failed to load notifications:", err);
      })
      .finally(() => setLoading(false));
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
          <h1 className="text-[24px] font-medium tracking-tight text-text-primary">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-[14px] text-text-secondary mt-[4px]">{unreadCount} unread</p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            disabled={isPending}
            className="text-[13px] text-text-muted hover:text-text-primary bg-transparent border-none cursor-pointer transition-colors duration-300 disabled:opacity-50"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Notification list */}
      {loading ? (
        <div className="py-[48px] text-center text-[14px] text-text-muted font-mono uppercase tracking-widest">Reading terminal...</div>
      ) : notifications.length === 0 ? (
        <div className="py-[120px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Event Log Empty</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">You&apos;re all caught up</p>
          <p className="text-[14px] text-text-secondary mt-[4px]">
            Ping signals will resolve here when operations conclude.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-[16px] p-[20px] rounded-[24px] border text-left w-full cursor-pointer transition-all duration-400 group shadow-card hover:shadow-card-hover hover:-translate-y-[1px] ${
                notif.read_at
                  ? "bg-white/90 border-border-light/40"
                  : "bg-white border-border-light border-l-[3px] border-l-brand"
              }`}
            >
              <NotificationIcon type={notif.type} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[8px]">
                  <span className={`text-[15px] tracking-tight font-medium ${notif.read_at ? "text-text-secondary" : "text-text-primary"}`}>
                    {notif.title}
                  </span>
                  <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest shrink-0">{timeAgo(notif.created_at)}</span>
                </div>
                {notif.body && (
                  <p className="text-[14px] text-text-secondary mt-[4px] line-clamp-2 leading-snug">{notif.body}</p>
                )}
                {notif.amount && (
                  <span className="inline-block mt-[6px] font-mono font-bold text-[14px] text-success">
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
