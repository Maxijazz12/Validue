"use client";

import ScrollReveal from "@/components/ui/ScrollReveal";
import { pricingTiers } from "@/lib/constants";
import PricingButton from "./PricingButtons";

export default function Pricing() {
  return (
    <section id="pricing">
      <div className="text-center mb-16">
        <p className="text-brand text-[14px] font-medium mb-4">Pricing</p>
        <h2 className="text-[clamp(28px,4vw,42px)] font-bold tracking-[-0.02em] leading-[1.1] text-text-primary">
          Simple, transparent pricing
        </h2>
        <p className="mt-5 text-[17px] text-text-secondary max-w-[480px] mx-auto leading-[1.7]">
          Start free. Upgrade when you need more reach and faster results.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-[800px] mx-auto max-md:grid-cols-1">
        {pricingTiers.map((tier, i) => (
          <ScrollReveal key={tier.tier} animation="slide-up" staggerIndex={i}>
            <div
              className={`relative rounded-2xl p-8 transition-all duration-500 h-full flex flex-col ${
                tier.featured
                  ? "bg-text-primary text-white shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                  : "bg-white border border-border-light hover:shadow-[0_8px_30px_rgba(0,0,0,0.04)]"
              }`}
            >
              {tier.featured && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-[12px] font-medium bg-brand text-white">
                  Popular
                </span>
              )}

              <div className={`text-[14px] font-medium mb-3 ${tier.featured ? "text-white/60" : "text-text-muted"}`}>
                {tier.tier}
              </div>

              <div className="flex items-baseline gap-1 mb-1">
                <span className={`text-[48px] font-bold tracking-tight leading-none ${tier.featured ? "text-white" : "text-text-primary"}`}>
                  {tier.price}
                </span>
              </div>
              <div className={`text-[14px] mb-8 ${tier.featured ? "text-white/50" : "text-text-muted"}`}>
                {tier.per}
              </div>

              <ul className="flex flex-col gap-3 mb-8 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-[14px]">
                    <svg className={`w-5 h-5 shrink-0 mt-0.5 ${tier.featured ? "text-brand" : "text-green-500"}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                    <span className={`leading-[1.5] ${tier.featured ? "text-white/80" : "text-text-secondary"}`}>
                      {feature}
                    </span>
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
    </section>
  );
}
