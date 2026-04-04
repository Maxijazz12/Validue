"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useRouteActive } from "@/lib/hooks/use-route-active";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";
import { useImmersive } from "@/components/ImmersiveProvider";
import { FEATURES } from "@/lib/feature-flags";

type NavItem = { label: string; href: string; icon: string };

const primaryNav: NavItem[] = [
  { label: "The Wall", href: "/dashboard/the-wall", icon: "wall" },
  { label: "New Idea", href: "/dashboard/ideas/new", icon: "plus" },
  { label: "My Ideas", href: "/dashboard/ideas", icon: "lightbulb" },
];

const secondaryNav: NavItem[] = [
  { label: "My Responses", href: "/dashboard/my-responses", icon: "clipboard" },
  { label: "Profile", href: "/dashboard/settings", icon: "profile" },
  { label: "Support", href: "/dashboard/support", icon: "support" },
];

/* ─── Icons — Linear-style: 20px, strokeWidth 1.5, no fills ─── */

const icons: Record<string, React.ReactNode> = {
  wall: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="5" x2="20" y2="5" />
      <rect x="4" y="9" width="16" height="6" rx="1.5" />
      <line x1="4" y1="19" x2="20" y2="19" />
    </svg>
  ),
  plus: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  ),
  lightbulb: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" />
      <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  ),
  clipboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <rect x="8" y="2" width="8" height="4" rx="1" />
      <polyline points="9 14 11 16 15 11" />
    </svg>
  ),
  chart: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 20h18" />
      <rect x="5" y="13" width="3" height="7" rx="1" />
      <rect x="10.5" y="9" width="3" height="11" rx="1" />
      <rect x="16" y="5" width="3" height="15" rx="1" />
    </svg>
  ),
  sliders: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="17" x2="20" y2="17" />
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="17" r="2.5" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M20 21a8 8 0 0 0-16 0" />
    </svg>
  ),
  support: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" /><line x1="4.93" y1="4.93" x2="9.17" y2="9.17" /><line x1="14.83" y1="14.83" x2="19.07" y2="19.07" /><line x1="14.83" y1="9.17" x2="19.07" y2="4.93" /><line x1="4.93" y1="19.07" x2="9.17" y2="14.83" />
    </svg>
  ),
  search: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ),
  bell: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
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

export default function Sidebar({ userName, userAvatar, unreadCount = 0, totalEarned = 0, hasNewResponses = false }: SidebarProps) {
  const router = useRouter();
  const { isImmersive } = useImmersive();
  const { isActive } = useRouteActive();
  const [expanded, setExpanded] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function renderNavIcon(item: NavItem) {
    const active = isActive(item.href);
    const showNewResponsesDot = item.icon === "lightbulb" && hasNewResponses;
    const showEarningsPill =
      FEATURES.RESPONDENT_PAYOUTS && item.icon === "clipboard" && totalEarned > 0;

    return (
      <a
        key={item.href}
        href={item.href}
        className={`sidebar-nav-item group relative flex items-center gap-[12px] rounded-xl no-underline transition-colors duration-200 px-[12px] py-[10px] ${
          active
            ? "bg-white/[0.08] text-white"
            : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
        }`}
        aria-label={item.label}
      >
        <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center relative">
          {icons[item.icon]}
          {showNewResponsesDot && (
            <span className="absolute -top-[2px] -right-[2px] w-[6px] h-[6px] rounded-full bg-success-mid animate-[pulse_2.5s_ease_infinite]" />
          )}
        </span>

        <span className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>
          {item.label}
        </span>

        {showEarningsPill && (
          <span className={`ml-auto text-[11px] font-mono font-semibold text-success bg-success/8 px-[6px] py-[1px] rounded-md whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>
            ${totalEarned < 1000 ? totalEarned.toFixed(2) : `${(totalEarned / 1000).toFixed(1)}k`}
          </span>
        )}

        {/* Tooltip — visible when collapsed */}
        {!expanded && (
          <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-accent-dark text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            {item.label}
          </span>
        )}
      </a>
    );
  }

  /* ─── Desktop rail content ─── */
  const railContent = (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Logo */}
      <Link href="/" className="flex items-center shrink-0 no-underline px-[20px] py-[20px] gap-[12px]">
        <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">
          <Image src="/logo-icon.svg" alt="" width={20} height={20} />
        </span>
        <span className={`text-[16px] font-bold tracking-[1px] text-white/90 whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>
          Validue
        </span>
      </Link>

      {/* Search trigger */}
      <div className="shrink-0 px-[8px] pb-[8px]">
        <button
          onClick={() => {
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
          className="group relative flex items-center gap-[12px] rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] transition-colors cursor-pointer bg-transparent border-none w-full px-[12px] py-[9px]"
          aria-label="Search"
        >
          <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">{icons.search}</span>
          <span className={`text-[13px] whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>Search...</span>
          <kbd className={`ml-auto text-[10px] font-mono bg-white/[0.06] px-[5px] py-[1px] rounded text-white/20 whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>
            ⌘K
          </kbd>
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-accent-dark text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Search <span className="text-white/30 ml-[4px]">⌘K</span>
            </span>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col gap-[2px] px-[8px] py-[4px]">
        {primaryNav.map(renderNavIcon)}
        <div className="h-px bg-white/[0.06] my-[8px] mx-[12px]" />
        {secondaryNav.map(renderNavIcon)}
      </nav>

      {/* Bottom section */}
      <div className="shrink-0 border-t border-white/[0.06] px-[8px] py-[10px]">
        {/* Notifications */}
        <a
          href="/dashboard/notifications"
          className="group relative flex items-center gap-[12px] rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] no-underline transition-colors px-[12px] py-[9px]"
          aria-label="Notifications"
        >
          <span className="relative shrink-0 w-[20px] h-[20px] flex items-center justify-center">
            {icons.bell}
            {unreadCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] w-[14px] h-[14px] rounded-full bg-brand text-white text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          <span className={`text-[13px] font-semibold tracking-wide whitespace-nowrap transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>Notifications</span>
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-accent-dark text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Notifications
            </span>
          )}
        </a>

        {/* User row */}
        <div className="flex items-center gap-[12px] rounded-xl px-[12px] py-[9px]">
          <a
            href="/dashboard/settings"
            className="group relative shrink-0 w-[20px] h-[20px] flex items-center justify-center no-underline"
            aria-label="Profile"
          >
            <Avatar name={userName} imageUrl={userAvatar} size={20} />
            {!expanded && (
              <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-accent-dark text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                {userName}
              </span>
            )}
          </a>
          <span className={`text-[13px] font-semibold tracking-wide text-white/60 whitespace-nowrap truncate min-w-0 flex-1 transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0"}`}>{userName}</span>
          <div className={`ml-auto flex items-center gap-[2px] shrink-0 transition-opacity duration-200 ${expanded ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
            <button
              onClick={handleLogout}
              className="p-[6px] rounded-lg text-white/60 hover:text-white/80 hover:bg-white/[0.06] transition-all cursor-pointer bg-transparent border-none"
              aria-label="Log out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop rail */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`max-md:hidden fixed top-0 left-0 h-screen z-40 overflow-hidden transition-[width] duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r ${
          isImmersive
            ? "bg-[rgba(0,0,0,0.9)] backdrop-blur-xl border-white/[0.04]"
            : "bg-[#000000] border-white/[0.06]"
        } ${expanded ? "w-[200px]" : "w-[64px]"}`}
      >
        {railContent}
      </aside>
    </>
  );
}
