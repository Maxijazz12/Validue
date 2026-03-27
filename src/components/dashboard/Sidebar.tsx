"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/ui/Avatar";

type NavItem = { label: string; href: string; icon: string };

const navItems: NavItem[] = [
  { label: "The Wall", href: "/dashboard/the-wall", icon: "wall" },
  { label: "New Idea", href: "/dashboard/ideas/new", icon: "plus-circle" },
  { label: "My Ideas", href: "/dashboard/ideas", icon: "lightbulb" },
  { label: "My Responses", href: "/dashboard/my-responses", icon: "check-circle" },
  { label: "Earnings", href: "/dashboard/earnings", icon: "earnings" },
  { label: "Settings", href: "/dashboard/settings", icon: "settings" },
];

const icons: Record<string, React.ReactNode> = {
  wall: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" /><line x1="3" y1="9" x2="21" y2="9" /><line x1="3" y1="15" x2="21" y2="15" /><line x1="9" y1="3" x2="9" y2="9" /><line x1="15" y1="9" x2="15" y2="15" /><line x1="9" y1="15" x2="9" y2="21" />
    </svg>
  ),
  "plus-circle": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="16" /><line x1="8" y1="12" x2="16" y2="12" />
    </svg>
  ),
  lightbulb: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18h6" /><path d="M10 22h4" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
    </svg>
  ),
  "check-circle": (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  ),
  earnings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
};

type SidebarProps = {
  userName: string;
  userAvatar?: string | null;
  ideaCount: number;
};

export default function Sidebar({ userName, userAvatar, ideaCount }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/dashboard/ideas/new") return pathname === "/dashboard/ideas/new";
    if (href === "/dashboard/the-wall") return pathname === "/dashboard/the-wall" || pathname === "/dashboard";
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-[24px] py-[24px] border-b border-[#ebebeb]">
        <a href="/" className="font-mono text-[18px] font-bold tracking-[4px] text-[#111111] no-underline">
          VLDT<span className="text-[#e8b87a]">A</span>
        </a>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-[12px] py-[16px] flex flex-col gap-[4px]">
        {navItems.map((item) => (
          <a
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-[10px] px-[12px] py-[10px] rounded-lg text-[14px] font-medium no-underline transition-all ${
              isActive(item.href)
                ? "bg-[#e8b87a]/10 text-[#111111] font-semibold"
                : "text-[#555555] hover:bg-[#fafafa] hover:text-[#111111]"
            }`}
          >
            {icons[item.icon]}
            {item.label}
          </a>
        ))}
      </nav>

      {/* Search */}
      <div className="px-[12px] pb-[12px]">
        <div className="flex items-center gap-[8px] px-[12px] py-[8px] rounded-lg bg-[#f5f2ed] text-[#999999]">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <span className="flex-1 text-[13px]">Search ideas...</span>
          <kbd className="text-[11px] font-mono bg-white px-[6px] py-[2px] rounded border border-[#e0e0e0] text-[#999999]">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* User footer */}
      <div className="px-[12px] py-[12px] border-t border-[#ebebeb]">
        <div className="flex items-center gap-[10px] px-[12px] py-[8px]">
          <Avatar name={userName} imageUrl={userAvatar} size={32} />
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-[#111111] truncate">
              {userName}
            </div>
            <div className="text-[11px] text-[#999999]">
              {ideaCount} {ideaCount === 1 ? "idea" : "ideas"}
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="p-[6px] rounded-md text-[#999999] hover:text-[#111111] hover:bg-[#fafafa] transition-all cursor-pointer bg-transparent border-none"
            aria-label="Log out"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
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
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center gap-[8px] px-[12px] py-[8px] bg-white border-b border-[#ebebeb]">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="p-[10px] bg-white border border-[#ebebeb] rounded-lg shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer"
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

        <a href="/dashboard/the-wall" className="font-mono text-[15px] font-bold tracking-[3px] text-[#111111] no-underline">
          VLDT<span className="text-[#e8b87a]">A</span>
        </a>
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/20 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 h-screen w-[240px] bg-white border-r border-[#ebebeb] z-40 transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "max-md:-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>
    </>
  );
}
