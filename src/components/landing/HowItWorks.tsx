"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import { howItWorksSteps } from "@/lib/constants";

export default function HowItWorks() {
  return (
    <section id="how">
      <div className="text-center mb-16">
        <p className="text-brand text-[14px] font-medium mb-4">How it works</p>
        <h2 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary">
          Three steps to clarity
        </h2>
        <p className="mt-5 text-[17px] text-text-secondary max-w-[480px] mx-auto leading-[1.7]">
          Start with a rough idea. End with assumption verdicts, evidence, and a clear next move.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1 relative">
        {/* Connector line (desktop only) */}
        <div className="hidden md:block absolute top-[60px] left-[20%] right-[20%] h-px bg-gradient-to-r from-border-light via-brand/20 to-border-light" />

        {howItWorksSteps.map((step, i) => (
          <ScrollReveal key={step.step} animation="slide-up" staggerIndex={i}>
            <div className="relative text-center p-8 max-md:p-6">
              {/* Step number */}
              <div className="w-12 h-12 rounded-full bg-bg-muted border border-border-light flex items-center justify-center mx-auto mb-6 text-[15px] font-semibold text-text-primary relative z-10 bg-white">
                {i + 1}
              </div>
              <h3 className="text-[18px] font-semibold text-text-primary mb-3">
                {step.title}
              </h3>
              <p className="text-[14px] text-text-secondary leading-[1.7] max-w-[300px] mx-auto">
                {step.description}
              </p>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
