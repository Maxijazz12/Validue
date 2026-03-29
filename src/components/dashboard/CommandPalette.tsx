"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";

type QuickAction = {
  label: string;
  href: string;
  icon: React.ReactNode;
  section: "Navigate" | "Create";
};

const QUICK_ACTIONS: QuickAction[] = [
  {
    label: "The Wall",
    href: "/dashboard/the-wall",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="5" x2="20" y2="5" /><rect x="4" y="9" width="16" height="6" rx="1.5" /><line x1="4" y1="19" x2="20" y2="19" />
      </svg>
    ),
  },
  {
    label: "My Ideas",
    href: "/dashboard/ideas",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18h6" /><path d="M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
      </svg>
    ),
  },
  {
    label: "My Responses",
    href: "/dashboard/my-responses",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" /><polyline points="9 14 11 16 15 11" />
      </svg>
    ),
  },
  {
    label: "Earnings",
    href: "/dashboard/earnings",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 20h18" /><rect x="5" y="13" width="3" height="7" rx="1" /><rect x="10.5" y="9" width="3" height="11" rx="1" /><rect x="16" y="5" width="3" height="15" rx="1" />
      </svg>
    ),
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 01-3.46 0" />
      </svg>
    ),
  },
  {
    label: "Settings",
    href: "/dashboard/settings",
    section: "Navigate",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="4" y1="7" x2="20" y2="7" /><line x1="4" y1="17" x2="20" y2="17" /><circle cx="8" cy="7" r="2.5" /><circle cx="16" cy="17" r="2.5" />
      </svg>
    ),
  },
  {
    label: "Create New Idea",
    href: "/dashboard/ideas/new",
    section: "Create",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Listen for Cmd+K / Ctrl+K
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const filtered = QUICK_ACTIONS.filter((a) =>
    a.label.toLowerCase().includes(query.toLowerCase())
  );

  const navigate = useCallback(
    (href: string) => {
      setOpen(false);
      router.push(href);
    },
    [router]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered[selectedIndex]) {
        e.preventDefault();
        navigate(filtered[selectedIndex].href);
      }
    },
    [filtered, selectedIndex, navigate]
  );

  if (!open) return null;

  // Group by section
  const sections = new Map<string, typeof filtered>();
  for (const item of filtered) {
    const existing = sections.get(item.section) || [];
    existing.push(item);
    sections.set(item.section, existing);
  }

  let globalIndex = -1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100] bg-black/30 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Palette */}
      <div className="fixed top-[20%] left-1/2 -translate-x-1/2 z-[101] w-full max-w-[520px] bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_24px_48px_rgba(0,0,0,0.15)] overflow-hidden" style={{ animation: "slideUp 0.15s ease-out" }}>
        {/* Search input */}
        <div className="flex items-center gap-[10px] px-[20px] py-[14px] border-b border-[#E2E8F0]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            placeholder="Search actions, pages..."
            className="flex-1 text-[15px] text-[#111111] placeholder:text-[#94A3B8] outline-none bg-transparent"
          />
          <kbd className="text-[11px] font-mono text-[#94A3B8] bg-[#F3F4F6] px-[6px] py-[2px] rounded-md border border-[#E2E8F0]">
            esc
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-[8px]">
          {filtered.length === 0 && (
            <p className="text-[13px] text-[#94A3B8] text-center py-[24px]">
              No results found
            </p>
          )}

          {Array.from(sections.entries()).map(([section, items]) => (
            <div key={section}>
              <p className="text-[10px] font-semibold tracking-[1.5px] uppercase text-[#94A3B8] px-[20px] py-[6px]">
                {section}
              </p>
              {items.map((item) => {
                globalIndex++;
                const idx = globalIndex;
                return (
                  <button
                    key={item.href}
                    onClick={() => navigate(item.href)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full flex items-center gap-[12px] px-[20px] py-[10px] text-left transition-colors duration-100 cursor-pointer bg-transparent border-none ${
                      idx === selectedIndex
                        ? "bg-[#F3F4F6] text-[#111111]"
                        : "text-[#64748B] hover:bg-[#F8FAFC]"
                    }`}
                  >
                    <span className="w-[20px] h-[20px] flex items-center justify-center shrink-0 opacity-70">
                      {item.icon}
                    </span>
                    <span className="text-[14px] font-medium">{item.label}</span>
                    {idx === selectedIndex && (
                      <span className="ml-auto text-[11px] text-[#94A3B8] font-mono">
                        enter
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
