"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { howItWorksSteps } from "@/lib/constants";

const stepNumbers = ["01", "02", "03"];

export default function HowItWorks() {
  return (
    <section id="how">
      <SectionHeader
        label="HOW IT WORKS"
        title="Three steps to clarity"
        subtitle="Submit your idea. We match you with real people who fit your audience. You get ranked insights - not raw data."
      />
      <div className="grid grid-cols-3 gap-[16px] mt-[72px] max-md:grid-cols-1 relative">
        {/* System connector lines */}
        <svg className="absolute top-1/2 left-0 right-0 -translate-y-1/2 pointer-events-none max-md:hidden" height="1" style={{ width: "100%" }}>
          <line x1="33%" y1="0.5" x2="66%" y2="0.5" stroke="#E5654E" strokeOpacity="0.2" strokeWidth="1" strokeDasharray="4 4" />
        </svg>

        {howItWorksSteps.map((step, i) => (
          <ScrollReveal key={step.step} animation="slide-up" staggerIndex={i}>
            <div
              className="group bg-white/80 backdrop-blur-3xl rounded-[24px] p-[36px_32px] transition-all duration-500 shadow-[0_4px_24px_rgba(0,0,0,0.03),inset_0_1px_0_rgba(255,255,255,0.8)] border border-black/5 hover:border-[#E5654E]/20 hover:shadow-[0_16px_48px_rgba(229,101,78,0.08),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-[2px] relative overflow-hidden before:absolute before:top-0 before:left-[15%] before:right-[15%] before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#E5654E]/40 before:to-transparent"
            >
              {/* Node ID */}
              <span className="absolute top-[16px] right-[24px] font-mono text-[24px] font-bold text-black/5 pointer-events-none select-none">
                [{stepNumbers[i]}]
              </span>

              <div className="relative">
                <div className="font-mono text-[10px] text-[#A8A29E] tracking-widest mb-[16px] font-bold uppercase flex items-center gap-[8px]">
                  <span className="w-[4px] h-[4px] rounded-full bg-[#E5654E] animate-pulse" />
                  STEP_{stepNumbers[i]}
                </div>
                <h3 className="text-[18px] font-bold mb-[12px] tracking-tight text-[#1C1917]">
                  {step.title}
                </h3>
                <p className="text-[14px] text-[#78716C] leading-[1.7] tracking-[0.01em]">
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
