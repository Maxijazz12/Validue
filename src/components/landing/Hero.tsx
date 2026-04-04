"use client";

import AnimatedCounter from "@/components/ui/AnimatedCounter";
import { heroStats, founderLogos } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="flex flex-col justify-center items-center text-center pt-[160px] pb-[80px] max-md:pt-[120px] max-md:pb-[48px]">
      {/* Small badge */}
      <div className="opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-brand/8 text-brand text-[13px] font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulse" />
          Now in open beta
        </span>
      </div>

      {/* Main headline */}
      <h1 className="mt-8 text-[clamp(40px,5.5vw,72px)] font-bold leading-[1.08] tracking-[-0.03em] text-text-primary max-w-[800px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.1s]">
        Validate your startup idea{" "}
        <span className="text-text-primary/40 italic font-heading font-normal">
          before you build
        </span>
      </h1>

      {/* Subtitle */}
      <p className="mt-6 text-[18px] max-md:text-[16px] text-text-secondary max-w-[520px] leading-[1.7] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.2s]">
        Turn a raw idea into testable assumptions, collect real behavioral evidence,
        and get a Decision Brief that tells you what to do next.
      </p>

      {/* CTA */}
      <div className="mt-10 flex items-center gap-4 opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.3s]">
        <a
          href="/auth/signup"
          className="inline-flex items-center px-8 py-3.5 rounded-full text-[15px] font-medium text-white bg-text-primary hover:bg-text-primary/90 transition-all no-underline shadow-[0_4px_12px_rgba(0,0,0,0.1)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.15)] hover:-translate-y-[1px]"
        >
          Get your first brief
          <svg className="ml-2 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </a>
        <a
          href="#how"
          className="inline-flex items-center px-6 py-3.5 rounded-full text-[15px] text-text-secondary hover:text-text-primary transition-colors no-underline"
        >
          See how it works
        </a>
      </div>

      {/* Stats */}
      <div className="mt-16 flex items-center gap-12 max-md:gap-8 opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.4s]">
        {heroStats.map((stat, i) => (
          <div key={stat.label} className="flex items-center gap-12 max-md:gap-8">
            {i > 0 && <div className="w-px h-8 bg-border-light -ml-12 max-md:-ml-8" />}
            <div className="text-center">
              <AnimatedCounter value={stat.number} className="text-[22px] font-bold text-text-primary tabular-nums" />
              <div className="text-[13px] text-text-muted mt-1">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Founder logos */}
      <div className="mt-12 flex items-center gap-6 max-md:gap-4 flex-wrap justify-center opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.5s]">
        <span className="text-[13px] text-text-muted">Trusted by founders from</span>
        <div className="flex items-center gap-5 max-md:gap-3 flex-wrap justify-center">
          {founderLogos.map((name) => (
            <span key={name} className="text-[13px] font-medium text-text-primary/25">
              {name}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
