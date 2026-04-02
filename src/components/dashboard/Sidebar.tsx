"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import ThemeToggle from "@/components/ThemeToggle";
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
  ...(FEATURES.EARNINGS_PAGE ? [{ label: "Earnings", href: "/dashboard/earnings", icon: "chart" }] : []),
  { label: "Settings", href: "/dashboard/settings", icon: "sliders" },
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
  const pathname = usePathname();
  const router = useRouter();
  const { isImmersive } = useImmersive();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  function renderNavIcon(item: NavItem) {
    const active = isActive(item.href);
    const showNewResponsesDot = item.icon === "lightbulb" && hasNewResponses;
    const showEarningsPill = item.icon === "chart" && totalEarned > 0;

    return (
      <a
        key={item.href}
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`sidebar-nav-item group relative flex items-center gap-[12px] rounded-xl no-underline transition-all duration-200 ${
          expanded ? "px-[12px] py-[10px]" : "w-[40px] h-[40px] justify-center"
        } ${
          active
            ? "bg-white/[0.08] text-white"
            : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
        }`}
        aria-label={item.label}
      >
        <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center relative">
          {icons[item.icon]}
          {showNewResponsesDot && (
            <span className="absolute -top-[2px] -right-[2px] w-[6px] h-[6px] rounded-full bg-[#34D399] animate-[pulse_2.5s_ease_infinite]" />
          )}
        </span>

        {/* Label — visible when expanded */}
        {expanded && (
          <span className="text-[13px] font-semibold tracking-wide whitespace-nowrap overflow-hidden">
            {item.label}
          </span>
        )}

        {/* Earnings pill — visible when expanded */}
        {expanded && showEarningsPill && (
          <span className="ml-auto text-[11px] font-mono font-semibold text-[#22C55E] bg-[#22C55E]/8 px-[6px] py-[1px] rounded-md">
            ${totalEarned < 1000 ? totalEarned.toFixed(2) : `${(totalEarned / 1000).toFixed(1)}k`}
          </span>
        )}

        {/* Tooltip — visible when collapsed */}
        {!expanded && (
          <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-[#292524] text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
            {item.label}
          </span>
        )}
      </a>
    );
  }

  /* ─── Desktop rail content ─── */
  const railContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`flex items-center shrink-0 ${expanded ? "px-[16px] py-[20px] gap-[10px]" : "justify-center py-[20px]"}`}>
        <Link href="/" className="shrink-0 no-underline">
          <Image src="/logo-icon.svg" alt="" width={22} height={22} />
        </Link>
        {expanded && (
          <span className="text-[16px] font-bold tracking-[1px] text-white/90 whitespace-nowrap overflow-hidden">
            Validue
          </span>
        )}
      </div>

      {/* Search trigger */}
      <div className={`shrink-0 ${expanded ? "px-[8px] pb-[8px]" : "flex justify-center pb-[8px]"}`}>
        <button
          onClick={() => {
            // Trigger Cmd+K
            window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, bubbles: true }));
          }}
          className={`group relative flex items-center rounded-xl text-white/25 hover:text-white/50 hover:bg-white/[0.04] transition-all cursor-pointer bg-transparent border-none ${
            expanded ? "w-full gap-[10px] px-[12px] py-[9px]" : "w-[40px] h-[40px] justify-center"
          }`}
          aria-label="Search"
        >
          {icons.search}
          {expanded && (
            <>
              <span className="text-[13px]">Search...</span>
              <kbd className="ml-auto text-[10px] font-mono bg-white/[0.06] px-[5px] py-[1px] rounded text-white/20">
                ⌘K
              </kbd>
            </>
          )}
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-[#292524] text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Search <span className="text-white/30 ml-[4px]">⌘K</span>
            </span>
          )}
        </button>
      </div>

      {/* Nav */}
      <nav className={`flex-1 flex flex-col gap-[2px] ${expanded ? "px-[8px]" : "items-center px-0"} py-[4px]`}>
        {primaryNav.map(renderNavIcon)}
        <div className={`h-px bg-white/[0.06] my-[8px] ${expanded ? "mx-[12px]" : "w-[24px]"}`} />
        {secondaryNav.map(renderNavIcon)}
      </nav>

      {/* Bottom section */}
      <div className={`shrink-0 border-t border-white/[0.06] ${expanded ? "px-[8px] py-[10px]" : "py-[10px] flex flex-col items-center gap-[6px]"}`}>
        {/* Notifications */}
        <a
          href="/dashboard/notifications"
          className={`group relative flex items-center rounded-xl text-white/30 hover:text-white/60 hover:bg-white/[0.04] no-underline transition-all ${
            expanded ? "gap-[10px] px-[12px] py-[9px]" : "w-[40px] h-[40px] justify-center"
          }`}
          aria-label="Notifications"
        >
          <span className="relative">
            {icons.bell}
            {unreadCount > 0 && (
              <span className="absolute -top-[3px] -right-[3px] w-[14px] h-[14px] rounded-full bg-[#E8C1B0] text-[#0C0C0E] text-[8px] font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </span>
          {expanded && <span className="text-[13px] font-semibold tracking-wide">Notifications</span>}
          {!expanded && (
            <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-[#292524] text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
              Notifications
            </span>
          )}
        </a>

        {/* Theme + Logout row */}
        {expanded ? (
          <div className="flex items-center gap-[4px] px-[8px] py-[4px]">
            <div className="flex-1 flex items-center gap-[8px] min-w-0">
              <Avatar name={userName} imageUrl={userAvatar} size={24} />
              <span className="text-[12px] font-medium text-white/60 truncate">{userName}</span>
            </div>
            <ThemeToggle compact />
            <button
              onClick={handleLogout}
              className="p-[6px] rounded-lg text-white/20 hover:text-white/60 hover:bg-white/[0.04] transition-all cursor-pointer bg-transparent border-none"
              aria-label="Log out"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        ) : (
          <>
            <div className="group relative flex justify-center">
              <button
                onClick={() => router.push("/dashboard/settings")}
                className="bg-transparent border-none cursor-pointer p-0"
                aria-label="Profile"
              >
                <Avatar name={userName} imageUrl={userAvatar} size={28} />
              </button>
              <span className="pointer-events-none absolute left-full ml-[12px] px-[10px] py-[5px] rounded-lg bg-[#292524] text-white/80 text-[12px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-[0_4px_12px_rgba(0,0,0,0.4)]">
                {userName}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile header */}
      <div className={`md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-[8px] px-[12px] py-[8px] backdrop-blur-xl border-b transition-colors duration-300 ${
        isImmersive
          ? "bg-[rgba(15,15,17,0.9)] border-white/[0.04]"
          : "bg-white/95 dark:bg-[#1C1917]/95 border-[#F0F0F0] dark:border-[#27272A]"
      }`}>
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-[10px] bg-white dark:bg-[#18181B] border border-[#F0F0F0] dark:border-[#27272A] rounded-xl cursor-pointer transition-all hover:bg-[#FAFAFA] dark:hover:bg-[#27272A]"
          aria-label="Toggle menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-[#1A1A1A] dark:text-white/70">
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
          <span className="text-[16px] font-bold tracking-[1px] text-[#1A1A1A] dark:text-white/90">
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

      {/* Mobile sidebar — full width when open */}
      <aside
        className={`md:hidden fixed top-0 left-0 h-screen w-[240px] z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] bg-[#1C1917] border-r border-white/[0.06] ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Reuse expanded rail content for mobile */}
        <div className="flex flex-col h-full">
          <div className="px-[16px] py-[20px] flex items-center gap-[10px]">
            <Link href="/" className="shrink-0 no-underline">
              <Image src="/logo-icon.svg" alt="" width={22} height={22} />
            </Link>
            <span className="text-[16px] font-bold tracking-[1px] text-white/90">Validue</span>
          </div>
          <nav className="flex-1 px-[8px] py-[4px] flex flex-col gap-[2px]">
            {primaryNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-[12px] px-[12px] py-[10px] rounded-xl text-[13px] font-semibold tracking-wide no-underline transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-white/[0.08] text-white"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">{icons[item.icon]}</span>
                {item.label}
              </a>
            ))}
            <div className="h-px bg-white/[0.06] mx-[12px] my-[8px]" />
            {secondaryNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-[12px] px-[12px] py-[10px] rounded-xl text-[13px] font-semibold tracking-wide no-underline transition-all duration-200 ${
                  isActive(item.href)
                    ? "bg-white/[0.08] text-white"
                    : "text-white/30 hover:text-white/70 hover:bg-white/[0.04]"
                }`}
              >
                <span className="w-[20px] h-[20px] shrink-0 flex items-center justify-center">{icons[item.icon]}</span>
                {item.label}
              </a>
            ))}
          </nav>
          <div className="px-[12px] py-[12px] border-t border-white/[0.06]">
            <div className="flex items-center gap-[10px] px-[8px] py-[8px]">
              <Avatar name={userName} imageUrl={userAvatar} size={24} />
              <span className="text-[12px] font-medium text-white/60 truncate flex-1">{userName}</span>
              <ThemeToggle compact />
              <button
                onClick={handleLogout}
                className="p-[6px] rounded-lg text-white/20 hover:text-white/60 transition-all cursor-pointer bg-transparent border-none"
                aria-label="Log out"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop rail */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={`max-md:hidden fixed top-0 left-0 h-screen z-40 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] border-r ${
          isImmersive
            ? "bg-[rgba(15,15,17,0.85)] backdrop-blur-xl border-white/[0.04]"
            : "bg-[#1C1917] border-white/[0.06]"
        } ${expanded ? "w-[200px]" : "w-[64px]"}`}
      >
        {railContent}
      </aside>
    </>
  );
}
