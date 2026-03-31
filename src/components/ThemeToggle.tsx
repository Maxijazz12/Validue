"use client";

import { useState } from "react";
import { useTheme } from "./ThemeProvider";

export default function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(() => typeof window !== "undefined");

  // Avoid hydration mismatch — render neutral state until mounted
  const isDark = mounted ? theme === "dark" : false;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`flex items-center gap-[8px] transition-colors cursor-pointer bg-transparent border-none ${
        compact
          ? "p-[6px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#2A2D3A]"
          : "px-[12px] py-[8px] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#2A2D3A] w-full"
      }`}
      suppressHydrationWarning
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
      {!compact && (
        <span className="text-[13px] text-[#64748B] dark:text-[#94A3B8]">
          {isDark ? "Light mode" : "Dark mode"}
        </span>
      )}
    </button>
  );
}
