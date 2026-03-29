"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

type NavItem = { label: string; href: string; icon: string };

const primaryNav: NavItem[] = [
  { label: "The Wall", href: "/dashboard/the-wall", icon: "wall" },
  { label: "New Idea", href: "/dashboard/ideas/new", icon: "plus" },
  { label: "My Ideas", href: "/dashboard/ideas", icon: "lightbulb" },
];

const secondaryNav: NavItem[] = [
  { label: "My Responses", href: "/dashboard/my-responses", icon: "clipboard" },
  { label: "Earnings", href: "/dashboard/earnings", icon: "chart" },
  { label: "Settings", href: "/dashboard/settings", icon: "sliders" },
];

/* ─── Icons — Linear-style: 18px, strokeWidth 1.5, no fills, geometric ─── */

const icons: Record<string, React.ReactNode> = {
  wall: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="5" x2="20" y2="5" />
      <rect x="4" y="9" width="16" height="6" rx="1.5" />
      <line x1="4" y1="19" x2="20" y2="19" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  lightbulb: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  ),
  clipboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <polyline points="9 14 11 16 15 11" />
    </svg>
  ),
  chart: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <rect x="5" y="13" width="3" height="7" rx="1" />
      <rect x="10.5" y="9" width="3" height="11" rx="1" />
      <rect x="16" y="5" width="3" height="15" rx="1" />
    </svg>
  ),
  sliders: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="17" r="2.5" />
    </svg>
  ),
};

type SidebarProps = {
  userName: string;
  userAvatar?: string | null;
  ideaCount: number;
  planTier?: string;
  campaignsUsed?: number;
  campaignLimit?: number | null;
  unreadCount?: number;
  totalEarned?: number;
  hasNewResponses?: boolean;
};

export default function Sidebar({ userName, userAvatar, ideaCount, planTier, campaignsUsed, campaignLimit, unreadCount = 0, totalEarned = 0, hasNewResponses = false }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard pattern
  useEffect(() => setMounted(true), []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (!mounted) return false;
    const p = pathname || "";
    if (href === "/dashboard/ideas/new") return p === "/dashboard/ideas/new";
    if (href === "/dashboard/ideas") return p === "/dashboard/ideas" || (p.startsWith("/dashboard/ideas/") && p !== "/dashboard/ideas/new");
    if (href === "/dashboard/the-wall") return p === "/dashboard/the-wall" || p === "/dashboard";
    return p.startsWith(href);
  }

  function getNavItemClass(href: string) {
    return isActive(href)
      ? "bg-[#111111] dark:bg-white/10 text-white shadow-[0_1px_3px_rgba(0,0,0,0.08)]"
      : "text-[#94A3B8] hover:bg-[#F8FAFC] dark:hover:bg-[#22252F] hover:text-[#111111] dark:hover:text-[#E8EAF0]";
  }

  function renderNavItem(item: NavItem) {
    const showEarningsPill = item.icon === "chart" && totalEarned > 0;
    const showNewResponsesDot = item.icon === "lightbulb" && hasNewResponses;

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`relative flex items-center gap-[10px] px-[12px] py-[10px] rounded-xl text-[14px] font-medium no-underline transition-all duration-200 ${getNavItemClass(item.href)}`}
      >
        <span className="w-[18px] h-[18px] shrink-0 flex items-center justify-center">
          {icons[item.icon]}
        </span>
        {item.label}

        {/* Earnings pill */}
        {showEarningsPill && (
          <span className="ml-auto text-[11px] font-mono font-semibold text-[#22C55E] bg-[#22C55E]/8 px-[6px] py-[1px] rounded-md">
            ${totalEarned < 1000 ? totalEarned.toFixed(2) : `${(totalEarned / 1000).toFixed(1)}k`}
          </span>
        )}

        {/* New responses pulse dot */}
        {showNewResponsesDot && (
          <span className="ml-auto w-[7px] h-[7px] rounded-full bg-[#34D399] animate-[pulse_2.5s_ease_infinite]" />
        )}
      </a>
    );
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo + Notification bell */}
      <div className="px-[24px] py-[24px] border-b border-[#E2E8F0] flex items-center justify-between">
        <Link href="/" className="flex items-center gap-[8px] no-underline">
          <Image src="/logo-icon.svg" alt="" width={18} height={18} />
          <span className="text-[18px] font-bold tracking-[1px] text-[#111111]">
            Validue
          </span>
        </Link>
        <a href="/dashboard/notifications" className="relative p-[6px] rounded-lg text-[#94A3B8] hover:text-[#111111] hover:bg-[#F3F4F6] transition-all no-underline" aria-label="Notifications">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-[2px] -right-[2px] w-[16px] h-[16px] rounded-full bg-[#E5654E] text-white text-[9px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </a>
      </div>

      {/* Search — directly under logo */}
      <div className="px-[12px] pt-[16px] pb-[8px]">
        <div className="flex items-center gap-[8px] px-[12px] py-[8px] rounded-xl bg-[#F3F4F6] text-[#94A3B8] border border-transparent hover:border-[#E2E8F0] transition-all duration-200">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="flex-1 text-[13px]">Search ideas...</span>
          <kbd className="text-[11px] font-mono bg-white px-[6px] py-[2px] rounded-md border border-[#E2E8F0] text-[#94A3B8]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Nav — grouped */}
      <nav className="flex-1 px-[12px] py-[8px] flex flex-col gap-[4px]">
        {primaryNav.map(renderNavItem)}

        {/* Divider */}
        <div className="h-[1px] bg-[#E2E8F0] mx-[16px] my-[8px]" />

        {secondaryNav.map(renderNavItem)}
      </nav>

      {/* User footer */}
      <div className="px-[12px] py-[12px] relative">
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
        <div className="flex items-center gap-[10px] px-[12px] py-[10px] rounded-xl hover:bg-[#F8FAFC] transition-all duration-200">
          <Avatar name={userName} imageUrl={userAvatar} size={20} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-semibold text-[#111111] truncate">
              {userName}
            </div>
            <div className="text-[11px] text-[#94A3B8]">
              {planTier ? (
                <>
                  <span className="capitalize font-medium text-[#64748B]">{planTier}</span>
                  {campaignLimit !== null && campaignLimit !== undefined
                    ? ` · ${campaignsUsed ?? 0}/${campaignLimit} campaigns`
                    : " · Unlimited campaigns"}
                </>
              ) : (
                <>{ideaCount} {ideaCount === 1 ? "idea" : "ideas"}</>
              )}
            </div>
            {planTier && planTier !== "scale" && (
              <Link
                href="/#pricing"
                className="text-[11px] font-semibold text-[#111111] hover:text-[#64748B] no-underline transition-colors"
              >
                Upgrade →
              </Link>
            )}
          </div>
          <ThemeToggle compact />
          <button
            onClick={handleLogout}
            className="p-[6px] rounded-lg text-[#94A3B8] hover:text-[#111111] hover:bg-[#F3F4F6] transition-all cursor-pointer bg-transparent border-none"
            aria-label="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-[8px] px-[12px] py-[8px] bg-white/90 dark:bg-[#0F1117]/90 backdrop-blur-2xl border-b border-[#E2E8F0] dark:border-[#2A2D3A]">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-[10px] bg-white border border-[#E2E8F0] rounded-xl cursor-pointer transition-all hover:bg-[#F3F4F6]"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#111111" strokeWidth="2" strokeLinecap="round">
            {mobileOpen ? (
              <>
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </>
            ) : (
              <>
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </>
            )}
          </svg>
        </button>

        <Link href="/dashboard/the-wall" className="flex items-center gap-[6px] no-underline">
          <Image src="/logo-icon.svg" alt="" width={16} height={16} />
          <span className="text-[16px] font-bold tracking-[1px] text-[#111111]">
            Validue
          </span>
        </Link>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[240px] bg-white border-r border-[#E2E8F0] z-40 transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${
          mobileOpen ? "translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
