"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { howItWorksSteps } from "@/lib/constants";

const stepNumbers = ["01", "02", "03"];

export default function HowItWorks() {
  return (
    <section id="how">
      <SectionHeader
        label="How It Works"
        title="Three steps to clarity"
        subtitle="Submit your idea. We match you with real people who fit your audience. You get ranked insights - not raw data."
      />
      <div className="grid grid-cols-3 gap-[16px] mt-[72px] max-md:grid-cols-1 relative">
        {/* Connector lines between cards (desktop only) */}
        <svg className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none max-md:hidden" height="2" style={{ width: "100%" }}>
          <line x1="33%" y1="1" x2="66%" y2="1" stroke="#DDD6CE" strokeWidth="1.5" strokeDasharray="6 4" />
        </svg>

        {howItWorksSteps.map((step, i) => (
          <ScrollReveal key={step.step} animation="slide-up" staggerIndex={i}>
            <div
              className="group bg-white rounded-2xl p-[36px_32px] transition-all duration-250 shadow-[0_2px_8px_rgba(180,140,110,0.07),0_1px_2px_rgba(0,0,0,0.03)] border border-[#EDE8E3] hover:shadow-[0_8px_24px_rgba(180,140,110,0.12),0_2px_6px_rgba(212,160,136,0.06)] hover:border-[#DDD6CE] hover:-translate-y-[2px] relative overflow-hidden before:absolute before:top-0 before:left-[15%] before:right-[15%] before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#D4A088]/40 before:to-transparent"
            >
              {/* Large faded step number */}
              <span className="absolute top-[12px] right-[16px] font-heading text-[72px] leading-none text-[#EDE8E3] pointer-events-none select-none">
                {stepNumbers[i]}
              </span>

              <div className="relative">
                <div className="font-mono text-[11px] text-[#A8A29E] tracking-[0.08em] mb-[10px] font-medium uppercase">
                  {step.step}
                </div>
                <h3 className="text-[16px] font-medium mb-[12px] tracking-[-0.02em] text-gradient-warm">
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#78716C] leading-[1.7]">
                  {step.description}
                </p>
              </div>
            </div>
          </ScrollReveal>
        ))}
      </div>
    </section>
  );
}
