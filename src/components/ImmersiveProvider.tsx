"use client";

import { createContext, useContext, useEffect, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";

const IMMERSIVE_ROUTES = [
  "/dashboard/my-responses",
  "/dashboard/earnings",
];

function isImmersiveRoute(pathname: string): boolean {
  return IMMERSIVE_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(route + "/")
  );
}

const ImmersiveContext = createContext({ isImmersive: false });

export function useImmersive() {
  return useContext(ImmersiveContext);
}

export default function ImmersiveProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isImmersive = useMemo(() => isImmersiveRoute(pathname), [pathname]);
  const wasDarkRef = useRef(false);

  useEffect(() => {
    const el = document.documentElement;

    if (isImmersive) {
      // Remember user's actual theme preference before forcing dark
      wasDarkRef.current = el.classList.contains("dark");
      el.setAttribute("data-immersive", "");
      el.classList.add("dark");
    } else {
      el.removeAttribute("data-immersive");
      // Restore the user's preference — if they had light mode, remove .dark
      if (!wasDarkRef.current) {
        el.classList.remove("dark");
      }
    }

    return () => {
      el.removeAttribute("data-immersive");
    };
  }, [isImmersive]);

  const value = useMemo(() => ({ isImmersive }), [isImmersive]);

  return (
    <ImmersiveContext value={value}>
      {children}
    </ImmersiveContext>
  );
}
