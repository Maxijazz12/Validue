"use client";

import { createContext, useContext, useEffect, useMemo } from "react";
import { usePathname } from "next/navigation";

const IMMERSIVE_ROUTES: string[] = [];

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
  useEffect(() => {
    const el = document.documentElement;

    if (isImmersive) {
      el.setAttribute("data-immersive", "");
    } else {
      el.removeAttribute("data-immersive");
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
