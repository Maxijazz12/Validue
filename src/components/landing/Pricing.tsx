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
        title="Pick your reach"
        subtitle="Your plan sets your baseline reach. Fund individual campaigns to go further. Higher plans get more from every dollar."
      />
      <div className="grid grid-cols-4 gap-[12px] mt-[72px] max-lg:grid-cols-2 max-md:grid-cols-1">
        {pricingTiers.map((tier, i) => (
          <ScrollReveal key={tier.tier} animation="slide-up" staggerIndex={i}>
          <div
            className={`group bg-white rounded-2xl p-[32px_24px] transition-all duration-250 relative ${
              tier.featured
                ? "border border-[#D4A088]/30 shadow-[0_4px_24px_rgba(212,160,136,0.14),0_2px_8px_rgba(212,160,136,0.08)]"
                : "shadow-[0_2px_8px_rgba(180,140,110,0.07),0_1px_2px_rgba(0,0,0,0.03)] border border-[#EDE8E3] hover:shadow-[0_8px_24px_rgba(180,140,110,0.12),0_2px_6px_rgba(212,160,136,0.06)] hover:border-[#DDD6CE] hover:-translate-y-[2px]"
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[1.5px] uppercase text-white px-[14px] py-[4px] rounded-full font-semibold" style={{ background: 'linear-gradient(135deg, #C4856E, #D4A088)' }}>
                Popular
              </div>
            )}
            <div className="text-[14px] font-medium mb-[8px] text-[#78716C]">
              {tier.tier}
            </div>
            <div className="font-mono text-[40px] font-bold mb-[4px] text-[#1C1917]">
              {tier.price}
            </div>
            <div className="text-[12px] text-[#A8A29E] mb-[8px]">
              {tier.per}
            </div>
            {tier.efficiency && (
              <div className={`inline-block text-[11px] font-semibold px-[8px] py-[3px] rounded-full mb-[20px] ${
                tier.featured
                  ? "bg-[#E8C1B0]/8 text-[#D4A494]"
                  : "bg-[#F0EBE6] text-[#78716C]"
              }`}>
                {tier.efficiency} funding power
              </div>
            )}
            <ul className="flex flex-col gap-[12px] mb-[32px] list-none">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="text-[13px] text-[#78716C] flex items-center gap-[10px]"
                >
                  <span className="w-[4px] h-[4px] rounded-full bg-[#D4A088]" />
                  {feature}
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

      <div className="mt-[24px] p-[20px_24px] bg-white shadow-[0_2px_8px_rgba(180,140,110,0.07),0_1px_2px_rgba(0,0,0,0.03)] border border-[#EDE8E3] rounded-2xl text-center">
        <p className="text-[14px] text-[#78716C]">
          <span className="font-semibold text-[#1C1917]">Your idea deserves a real audience.</span>{" "}
          Every plan includes real respondents and ranked insights.
        </p>
      </div>
    </section>
  );
}
