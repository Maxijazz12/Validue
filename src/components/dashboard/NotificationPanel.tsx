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

function NotificationIcon() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-[28px] h-[28px] shrink-0">
      <defs>
        <linearGradient id="np-s" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E5654E" />
          <stop offset="100%" stopColor="#E8C1B0" />
        </linearGradient>
        <linearGradient id="np-f" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E5654E" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#E8C1B0" stopOpacity="0.06" />
        </linearGradient>
      </defs>
      <ellipse cx="32" cy="32" rx="27" ry="27" fill="url(#np-f)" stroke="url(#np-s)" strokeWidth="3" />
      <path d="M32 6 Q29 30 32 58" stroke="url(#np-s)" strokeWidth="1.8" fill="none" opacity="0.3" />
    </svg>
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
          <h1 className="text-[24px] font-bold tracking-[-0.5px] text-[#222222]">
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
        <div className="py-[48px] text-center text-[14px] text-[#94A3B8]">Loading...</div>
      ) : notifications.length === 0 ? (
        <div className="py-[48px] text-center">
          <p className="text-[14px] text-[#94A3B8]">You&apos;re all caught up</p>
          <p className="text-[12px] text-[#CBD5E1] mt-[4px]">
            Notifications appear when campaigns complete or you earn money.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-[8px]">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`flex items-start gap-[12px] p-[16px] rounded-xl border text-left w-full cursor-pointer transition-all duration-200 hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.03)] ${
                notif.read_at
                  ? "bg-white border-[#E2E8F0]"
                  : "bg-white border-[#E2E8F0] border-l-[3px] border-l-[#E5654E]"
              }`}
            >
              <NotificationIcon />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-[8px]">
                  <span className={`text-[13px] font-semibold ${notif.read_at ? "text-[#64748B]" : "text-[#111111]"}`}>
                    {notif.title}
                  </span>
                  <span className="text-[11px] text-[#94A3B8] shrink-0">{timeAgo(notif.created_at)}</span>
                </div>
                {notif.body && (
                  <p className="text-[13px] text-[#94A3B8] mt-[2px] line-clamp-2">{notif.body}</p>
                )}
                {notif.amount && (
                  <span className="inline-block mt-[6px] font-mono font-bold text-[14px] text-[#34D399]">
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
