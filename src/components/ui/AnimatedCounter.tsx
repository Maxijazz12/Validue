"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Animates a number from 0 to `value` when it enters the viewport.
 * Handles formats like "2,400+", "94%", "18min".
 */
export default function AnimatedCounter({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true;
          animate();
          observer.disconnect();
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function animate() {
    // Extract numeric part and surrounding text
    const match = value.match(/^([^0-9]*)([0-9,]+)(.*)$/);
    if (!match) return;

    const [, prefix, numStr, suffix] = match;
    const target = parseInt(numStr.replace(/,/g, ""), 10);
    const duration = 1200;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // Ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      const formatted = current.toLocaleString("en-US");
      setDisplay(`${prefix}${formatted}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }

  return (
    <span ref={ref} className={className}>
      {display}
    </span>
  );
}
