import SectionHeader from "@/components/ui/SectionHeader";
import { pricingTiers } from "@/lib/constants";

export default function Pricing() {
  return (
    <section id="pricing">
      <SectionHeader
        label="Pricing"
        title="Simple, transparent"
        subtitle="Subscribe for baseline campaigns. Fund individual campaigns to scale reach. Higher plans make every dollar go further."
      />
      <div className="grid grid-cols-4 gap-[12px] mt-[72px] max-lg:grid-cols-2 max-md:grid-cols-1">
        {pricingTiers.map((tier) => (
          <div
            key={tier.tier}
            className={`group bg-white border rounded-xl p-[32px_24px] transition-all duration-200 relative hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] ${
              tier.featured
                ? "border-[#111111] shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                : "border-[#ebebeb] hover:border-[#d4d4d4]"
            }`}
          >
            {tier.featured && (
              <div className="absolute -top-[1px] left-1/2 -translate-x-1/2 -translate-y-1/2 text-[10px] tracking-[1.5px] uppercase text-white bg-[#111111] px-[14px] py-[4px] rounded-full font-semibold">
                Popular
              </div>
            )}
            <div className="text-[14px] font-medium mb-[8px] text-[#555555]">
              {tier.tier}
            </div>
            <div className="font-mono text-[40px] font-bold mb-[4px] text-[#111111]">
              {tier.price}
            </div>
            <div className="text-[12px] text-[#999999] mb-[28px]">
              {tier.per}
            </div>
            <ul className="flex flex-col gap-[12px] mb-[32px] list-none">
              {tier.features.map((feature) => (
                <li
                  key={feature}
                  className="text-[13px] text-[#555555] flex items-center gap-[10px]"
                >
                  <span className="w-[4px] h-[4px] rounded-full bg-[#e8b87a]" />
                  {feature}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-[12px] rounded-lg text-[14px] font-semibold font-sans cursor-pointer transition-all duration-200 text-center ${
                tier.featured
                  ? "bg-[#111111] text-white hover:bg-[#222222] hover:shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                  : "bg-transparent text-[#111111] border border-[#ebebeb] hover:border-[#d4d4d4] hover:bg-[#fafafa]"
              }`}
            >
              {tier.cta}
            </button>
          </div>
        ))}
      </div>

      {/* Funding efficiency callout */}
      <div className="mt-[32px] p-[20px_24px] bg-[#faf8f5] border border-[#ebebeb]/50 rounded-xl text-center">
        <p className="text-[14px] text-[#555555]">
          <span className="font-semibold text-[#111111]">Your plan makes funding go further.</span>{" "}
          A $20 campaign fund buys 300 reach on Free, but 560 on Scale — 87% more distribution for the same spend.
        </p>
      </div>
    </section>
  );
}
