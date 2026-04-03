"use client";

import { useState } from "react";
import SectionHeader from "@/components/ui/SectionHeader";
import ScrollReveal from "@/components/ui/ScrollReveal";
import { pricingTiers } from "@/lib/constants";
import PricingCalculator from "./PricingCalculator";
import PricingButton from "./PricingButtons";

const faqs = [
  {
    q: "What happens when I run out of campaign slots?",
    a: "Your existing campaigns keep running. Free resets every 30 days and Pro resets each billing cycle, so you only need to wait for the next window to create another campaign.",
  },
  {
    q: "How does funding a campaign work?",
    a: "When you create a campaign, you set a budget ($10\u2013$100+). That budget buys reach and respondent incentives so you can collect enough real evidence to support a useful Decision Brief. Pro stretches the same funded test further without replacing the need for real funding.",
  },
  {
    q: "Can I cancel anytime?",
    a: "Yes. Cancel from your dashboard settings at any time. Your plan stays active through the end of the billing period and any funded campaigns will run to completion.",
  },
  {
    q: "What\u2019s included in the free plan?",
    a: "One campaign every 30 days, basic audience matching, 5 AI-generated questions, and a $2 credit on your first campaign. It is built to help you get a first real read on whether the idea deserves more time.",
  },
  {
    q: "How are respondents matched to my campaign?",
    a: "We match based on category interests, expertise, age range, and industry. Pro unlocks priority matching, which surfaces your campaign to the most relevant respondents first.",
  },
  {
    q: "What\u2019s a Decision Brief?",
    a: "After enough responses come in, our AI synthesizes everything into a structured brief: a top-line recommendation (Proceed, Pivot, or Pause), assumption verdicts with evidence, an uncomfortable truth, and specific next steps. It\u2019s the output of every campaign.",
  },
  {
    q: "How do respondents get paid?",
    a: "Respondents earn from the campaign\u2019s funding pool. Responses must clear the quality checks to qualify, and qualified respondents share the pool. Top respondents can earn $200+/month.",
  },
  {
    q: "Do you offer annual billing?",
    a: "Not yet. We\u2019re keeping things simple with monthly billing during early access. Annual plans with a discount are on the roadmap.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="border-b border-black/5 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-[16px] py-[20px] text-left cursor-pointer group"
      >
        <span className="text-[15px] font-medium text-[#1C1917] leading-[1.4] group-hover:text-[#E5654E] transition-colors">
          {q}
        </span>
        <span
          className={`shrink-0 w-[24px] h-[24px] rounded-full border border-black/10 flex items-center justify-center transition-all duration-300 ${
            open ? "bg-[#1C1917] border-[#1C1917] rotate-45" : "bg-transparent group-hover:border-black/20"
          }`}
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke={open ? "white" : "#A8A29E"}
            strokeWidth="1.5"
            strokeLinecap="round"
          >
            <line x1="6" y1="2" x2="6" y2="10" />
            <line x1="2" y1="6" x2="10" y2="6" />
          </svg>
        </span>
      </button>
      <div
        className={`grid transition-all duration-300 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <p className="text-[14px] text-[#78716C] leading-[1.7] pb-[20px]">
            {a}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function PricingHero() {
  return (
    <div>
      <SectionHeader
        label="Pricing"
        title="Plans for sharper decisions"
        subtitle="Choose between a free first-proof tier and one serious paid tier for founders who need more runs, stronger reach, and a faster path to a trustworthy Decision Brief."
      />

      {/* Pricing tiers */}
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
                <div
                  className={`inline-block font-mono text-[9px] uppercase tracking-widest font-bold px-[10px] py-[4px] rounded-md mb-[24px] ${
                    tier.featured
                      ? "bg-[#E5654E]/10 text-[#E5654E]"
                      : "bg-black/5 text-[#A8A29E]"
                  }`}
                >
                  {tier.efficiency} POWER MULTIPLIER
                </div>
              )}
              <ul className="flex flex-col gap-[12px] mb-[32px] list-none">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="text-[13px] text-[#A8A29E] flex items-start gap-[10px]"
                  >
                    <span className="font-mono text-[10px] text-[#1C1917] mt-[2px] leading-none">
                      [+]
                    </span>
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

      {/* Calculator */}
      <PricingCalculator />

      {/* Core promise */}
      <div className="mt-[24px] p-[20px_24px] bg-white/60 backdrop-blur-md shadow-[0_4px_16px_rgba(229,101,78,0.04)] border border-white/80 rounded-[16px] text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-[#A8A29E]">
          <span className="font-bold text-[#1C1917]">{"// "}CORE PROMISE:</span>{" "}
          EVERY PLAN IS BUILT TO PRODUCE A BETTER FOUNDER DECISION.
        </p>
      </div>

      {/* FAQ Section */}
      <ScrollReveal>
        <div className="mt-[100px] max-md:mt-[72px]">
          <div className="text-center mb-[48px]">
            <div className="font-mono text-[10px] uppercase font-bold tracking-widest mb-[16px] text-[#A8A29E]">
              {"// "}FAQ
            </div>
            <h2 className="text-[clamp(28px,4vw,40px)] font-bold tracking-tight leading-[1.1] text-[#1C1917]">
              Common questions
            </h2>
          </div>

          <div className="max-w-[680px] mx-auto bg-white/60 backdrop-blur-3xl rounded-[24px] border border-white/80 shadow-card p-[8px_32px] max-md:p-[8px_20px]">
            {faqs.map((faq) => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </ScrollReveal>
    </div>
  );
}
