"use client";

import { useRouteActive } from "@/lib/hooks/use-route-active";
import Avatar from "@/components/ui/Avatar";

const tabs = [
  {
    label: "The Wall",
    href: "/dashboard/the-wall",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="5" x2="20" y2="5" />
        <rect x="4" y="9" width="16" height="6" rx="1.5" />
        <line x1="4" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    label: "My Ideas",
    href: "/dashboard/ideas",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" />
        <path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  {
    label: "New Idea",
    href: "/dashboard/ideas/new",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    label: "My Responses",
    href: "/dashboard/my-responses",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <polyline points="9 14 11 16 15 11" />
      </svg>
    ),
  },
];

export default function MobileTabBar({ userName, userAvatar }: { userName?: string; userAvatar?: string | null }) {
  const { isActive } = useRouteActive();

  return (
    <>
      {/* Profile avatar — top right corner (IG style) */}
      <div className="md:hidden fixed top-0 right-0 z-50 p-[12px]">
        <a
          href="/dashboard/settings"
          className="block rounded-full ring-2 ring-white/20 hover:ring-white/40 transition-all"
        >
          <Avatar name={userName || "User"} imageUrl={userAvatar} size={32} />
        </a>
      </div>

      {/* Bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#000000]/90 backdrop-blur-xl border-t border-white/[0.05] px-[8px] pb-[env(safe-area-inset-bottom)] transition-colors duration-300">
        <div className="flex items-center justify-around h-[56px]">
          {tabs.map((tab) => {
            const active = isActive(tab.href);
            return (
              <a
                key={tab.href}
                href={tab.href}
                className={`flex flex-col items-center gap-[2px] px-[12px] py-[6px] rounded-xl no-underline transition-all duration-200 ${
                  active ? "text-white" : "text-white/30"
                }`}
              >
                {tab.icon}
                <span className={`text-[10px] ${active ? "font-semibold" : "font-medium"}`}>
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </nav>
    </>
  );
}
