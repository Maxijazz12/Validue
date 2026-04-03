"use client";

import SectionHeader from "@/components/ui/SectionHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { pricingTiers } from "@/lib/constants";
import PricingCalculator from "./PricingCalculator";
import PricingButton from "./PricingButtons";

export default function Pricing() {
  return (
    <section id="pricing">
      <SectionHeader
        label="Pricing"
        title="Plans for sharper decisions"
        subtitle="Every plan helps you run focused validation and move toward a Decision Brief. Pro is the simple launch upgrade for founders who need more runs, more reach, and better leverage per funded test."
      />
      <div className="grid grid-cols-2 gap-[16px] mt-[72px] max-md:grid-cols-1">
        {pricingTiers.map((tier, i) => (
          <ScrollReveal key={tier.tier} animation="slide-up" staggerIndex={i}>
          <div
            className={`group bg-white/60 backdrop-blur-3xl rounded-[24px] p-[32px_24px] transition-all duration-500 relative ${
              tier.featured
                ? "border border-black/10 shadow-[0_16px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]"
                : "shadow-card border border-white/80 hover:shadow-[0_16px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)] hover:-translate-y-[2px]"
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[9px] font-mono tracking-widest uppercase text-white bg-[#1C1917] px-[14px] py-[6px] rounded-full font-bold">
                [ RECOMMENDED ]
              </div>
            )}
            <div className="font-mono text-[10px] tracking-widest uppercase font-bold mb-[8px] text-[#A8A29E]">
              {tier.tier}
            </div>
            <div className="font-sans text-[48px] tracking-tight font-bold mb-[4px] text-[#1C1917] leading-none">
              {tier.price}
            </div>
            <div className="font-mono text-[10px] uppercase text-[#A8A29E] mb-[16px] tracking-widest">
              {tier.per}
            </div>
            {tier.efficiency && (
              <div className={`inline-block font-mono text-[9px] uppercase tracking-widest font-bold px-[10px] py-[4px] rounded-md mb-[24px] ${
                tier.featured
                  ? "bg-[#E5654E]/10 text-[#E5654E]"
                  : "bg-black/5 text-[#A8A29E]"
              }`}>
                {tier.efficiency} POWER MULTIPLIER
              </div>
            )}
            <ul className="flex flex-col gap-[12px] mb-[32px] list-none">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="text-[13px] text-[#A8A29E] flex items-start gap-[10px]"
                >
                  <span className="font-mono text-[10px] text-[#1C1917] mt-[2px] leading-none">[+]</span>
                  <span className="leading-[1.5]">{feature}</span>
                </li>
              ))}
            </ul>
            <PricingButton
              tierKey={tier.tier.toLowerCase()}
              cta={tier.cta}
              featured={tier.featured}
            />
          </div>
          </ScrollReveal>
        ))}
      </div>

      <PricingCalculator />

      <div className="mt-[24px] p-[20px_24px] bg-white/60 backdrop-blur-md shadow-[0_4px_16px_rgba(229,101,78,0.04)] border border-white/80 rounded-[16px] text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E]">
          <span className="font-bold text-[#1C1917]">{"// "}CORE PROMISE:</span>{" "}
          EVERY PLAN IS BUILT TO MOVE YOU TOWARD A REAL DECISION BRIEF.
        </p>
      </div>
    </section>
  );
}
