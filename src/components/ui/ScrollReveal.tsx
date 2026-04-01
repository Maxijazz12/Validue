"use client";

import { useInView } from "@/hooks/useInView";
import { STAGGER_CHILD } from "@/lib/motion";

type Animation = "fade-up" | "slide-up" | "scale";

const animationClass: Record<Animation, string> = {
  "fade-up": "scroll-reveal",
  "slide-up": "scroll-reveal-slide",
  "scale": "scroll-reveal-scale",
};

type Props = {
  children: React.ReactNode;
  animation?: Animation;
  /** Extra delay in ms (added on top of stagger) */
  delay?: number;
  /** Stagger index for child elements in a group */
  staggerIndex?: number;
  threshold?: number;
  className?: string;
  as?: "div" | "section" | "span" | "article" | "li" | "p";
};

export default function ScrollReveal({
  children,
  animation = "fade-up",
  delay = 0,
  staggerIndex = 0,
  threshold = 0.15,
  className = "",
  as: Tag = "div",
}: Props) {
  const { ref, isInView } = useInView({ threshold });

  const totalDelay = delay + staggerIndex * STAGGER_CHILD;

  return (
    <Tag
      ref={ref as React.Ref<never>}
      className={`${animationClass[animation]} ${isInView ? "visible" : ""} ${className}`}
      style={totalDelay > 0 ? { transitionDelay: `${totalDelay}ms` } : undefined}
    >
      {children}
    </Tag>
  );
}
