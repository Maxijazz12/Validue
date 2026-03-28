import SectionHeader from "@/components/ui/SectionHeader";
import { howItWorksSteps } from "@/lib/constants";

export default function HowItWorks() {
  return (
    <section id="how">
      <SectionHeader
        label="How It Works"
        title="Three steps to clarity"
        subtitle="Submit your idea. We match you with real people who fit your audience. You get ranked insights - not raw data."
      />
      <div className="grid grid-cols-3 gap-[16px] mt-[72px] max-md:grid-cols-1">
        {howItWorksSteps.map((step) => (
          <div
            key={step.step}
            className="group bg-white rounded-2xl p-[36px_32px] transition-all duration-200 shadow-[0_1px_2px_rgba(0,0,0,0.03)] border border-[#E2E8F0] hover:shadow-[0_4px_12px_rgba(0,0,0,0.07),0_1px_3px_rgba(0,0,0,0.04)] hover:border-[#CBD5E1] relative overflow-hidden before:absolute before:top-0 before:left-[20%] before:right-[20%] before:h-[2px] before:bg-gradient-to-r before:from-transparent before:via-[#E8C1B0]/30 before:to-transparent"
          >
            <div className="font-mono text-[11px] text-[#94A3B8] tracking-[1.5px] mb-[10px] font-medium">
              {step.step}
            </div>
            <h3 className="text-[16px] font-medium mb-[12px] tracking-[-0.3px] text-gradient-warm">
              {step.title}
            </h3>
            <p className="text-[14px] text-[#64748B] leading-[1.7]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
