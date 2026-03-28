"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Client wrapper that tracks when a WallCard enters the viewport.
 * Fires a reach impression after the card is visible for >1 second.
 * Also toggles a CSS class for scroll-triggered entrance animations.
 */
export default function WallCardTracker({
  campaignId,
  children,
  animationDelay = 0,
}: {
  campaignId: string;
  children: React.ReactNode | ((isVisible: boolean) => React.ReactNode);
  animationDelay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const firedRef = useRef(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let timer: ReturnType<typeof setTimeout> | null = null;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Entrance animation: once visible, stay visible
        if (entry.isIntersecting && !isVisible) {
          setIsVisible(true);
        }

        // Reach impression tracking
        if (entry.isIntersecting && !firedRef.current) {
          timer = setTimeout(() => {
            if (firedRef.current) return;
            firedRef.current = true;

            fetch("/api/reach-impression", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ campaignId }),
            }).catch(() => {
              // Fire-and-forget — don't block UI on failure
            });
          }, 1000);
        } else if (!entry.isIntersecting && timer) {
          clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [campaignId, isVisible]);

  return (
    <div
      ref={ref}
      className={`wall-card-enter ${isVisible ? "wall-card-visible" : ""}`}
      style={{ transitionDelay: `${animationDelay}ms` }}
    >
      {typeof children === "function" ? children(isVisible) : children}
    </div>
  );
}
