"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

const tabs = [
  {
    label: "Wall",
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
    label: "Create",
    href: "/dashboard/ideas/new",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    label: "Responses",
    href: "/dashboard/my-responses",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" />
        <polyline points="9 14 11 16 15 11" />
      </svg>
    ),
  },
  {
    label: "Earnings",
    href: "/dashboard/earnings",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" />
        <rect x="5" y="13" width="3" height="7" rx="1" />
        <rect x="10.5" y="9" width="3" height="11" rx="1" />
        <rect x="16" y="5" width="3" height="15" rx="1" />
      </svg>
    ),
  },
];

export default function MobileTabBar() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => setMounted(true), []);

  function isActive(href: string) {
    if (!mounted) return false;
    const p = pathname || "";
    if (href === "/dashboard/ideas/new") return p === "/dashboard/ideas/new";
    if (href === "/dashboard/the-wall") return p === "/dashboard/the-wall" || p === "/dashboard";
    return p.startsWith(href);
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0C0C0E]/85 backdrop-blur-xl border-t border-white/[0.05] px-[8px] pb-[env(safe-area-inset-bottom)] transition-colors duration-300">
      <div className="flex items-center justify-around h-[56px]">
        {tabs.map((tab) => {
          const active = isActive(tab.href);
          return (
            <a
              key={tab.href}
              href={tab.href}
              className={`flex flex-col items-center gap-[2px] px-[12px] py-[6px] rounded-xl no-underline transition-all duration-200 ${
                active ? "text-[#E8C1B0]" : "text-white/30"
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
  );
}
