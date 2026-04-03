"use client";

import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";

export function useRouteActive() {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- hydration guard
  useEffect(() => setMounted(true), []);

  function isActive(href: string) {
    if (!mounted) return false;
    const p = pathname || "";
    if (href === "/dashboard/ideas/new") return p === "/dashboard/ideas/new";
    if (href === "/dashboard/ideas")
      return p === "/dashboard/ideas" || (p.startsWith("/dashboard/ideas/") && p !== "/dashboard/ideas/new");
    if (href === "/dashboard/the-wall") return p === "/dashboard/the-wall" || p === "/dashboard";
    return p.startsWith(href);
  }

  return { isActive, mounted };
}
