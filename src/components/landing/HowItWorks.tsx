import SectionHeader from "@/components/ui/SectionHeader";
import { howItWorksSteps } from "@/lib/constants";

export default function HowItWorks() {
  return (
    <section id="how">
      <SectionHeader
        label="How It Works"
        title="Three steps to clarity"
        subtitle="Submit your idea. We match you with real people who fit your audience. You get ranked insights — not raw data."
      />
      <div className="grid grid-cols-3 gap-[16px] mt-[72px] max-md:grid-cols-1">
        {howItWorksSteps.map((step) => (
          <div
            key={step.step}
            className="group bg-white border border-[#ebebeb] rounded-xl p-[36px_32px] transition-all duration-200 hover:shadow-[0_4px_20px_rgba(0,0,0,0.05)] hover:border-[#d4d4d4]"
          >
            <div className="font-mono text-[12px] text-[#999999] tracking-[1.5px] mb-[20px] font-medium">
              {step.step}
            </div>
            <h3 className="text-[20px] font-semibold mb-[12px] tracking-[-0.3px] text-[#111111]">
              {step.title}
            </h3>
            <p className="text-[14px] text-[#555555] leading-[1.7]">
              {step.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
