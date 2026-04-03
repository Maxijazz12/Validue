import Button from "@/components/ui/Button";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import FloatingCard from "@/components/landing/FloatingCard";
import { heroStats, founderLogos } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="flex flex-col justify-center items-center text-center pt-[160px] pb-[60px] relative max-md:pt-[130px] max-md:pb-[40px]">
      <h1 className="text-[clamp(42px,6vw,84px)] font-bold leading-[1.05] tracking-[-0.04em] text-[#1C1917] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        Pressure-test
        <br />
        the bet{" "}
        <span className="relative inline-block">
          <span className="absolute bottom-0 left-[-10px] right-[-10px] h-1/2 bg-[linear-gradient(to_top,rgba(229,101,78,0.08),transparent)] blur-[8px]" />
          <span className="bg-gradient-to-r from-[#1C1917] via-[#1C1917] to-[#E5654E] bg-clip-text text-transparent italic font-normal relative font-heading">
            before the build.
          </span>
        </span>
      </h1>

      <p className="text-[17px] text-[#78716C] max-w-[480px] mx-auto leading-[1.65] mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.15s]">
        <span className="inline-flex items-center gap-[6px] text-[#E5654E] font-medium mb-[4px] px-[10px] py-[4px] rounded-full bg-[#E5654E]/10 text-[13px]">
          <span className="w-[6px] h-[6px] rounded-full bg-[#E5654E] animate-pulse" />
          Decision Brief first
        </span><br />
        Turn a raw idea into testable assumptions, collect behavioral evidence from matched respondents, and get a Decision Brief that tells you what survived, what broke, and what to test next.
      </p>

      <div className="flex items-center gap-[32px] max-md:gap-[24px] mt-[48px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.3s]">
        {heroStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <AnimatedCounter value={stat.number} className="font-mono text-[20px] font-bold text-[#1C1917]" />
            <div className="text-[12px] text-[#A8A29E] mt-[2px]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-[48px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.4s]">
        <Button variant="primary" href="/auth/signup" className="shadow-[0_4px_16px_rgba(229,101,78,0.15)] hover:shadow-[0_8px_24px_rgba(229,101,78,0.25)] rounded-2xl">
          Get Your First Brief
        </Button>
      </div>

      {/* Trust strip — social proof near CTA */}
      <div className="flex items-center justify-center gap-[20px] max-md:gap-[12px] mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.55s]">
        <span className="text-[13px] text-[#A8A29E]">Built for early-stage founders</span>
        <span className="w-[3px] h-[3px] rounded-full bg-black/20 max-md:hidden" />
        <span className="text-[13px] text-[#A8A29E] max-md:hidden">Decision &gt; raw survey data</span>
      </div>

      {/* Founder affiliation strip */}
      <div className="flex items-center justify-center gap-[24px] max-md:gap-[16px] mt-[24px] flex-wrap opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.65s]">
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#A8A29E]/60 shrink-0">
          Founders from
        </span>
        {founderLogos.map((name, i) => (
          <span key={name} className="flex items-center gap-[8px]">
            {i > 0 && <span className="w-[3px] h-[3px] rounded-full bg-black/10 max-md:hidden" />}
            <span className="font-mono text-[11px] font-semibold tracking-wide text-[#1C1917]/30 uppercase whitespace-nowrap">
              {name}
            </span>
          </span>
        ))}
      </div>

      {/* Storytelling floating cards (desktop only) — rotating narrative loop */}
      <div className="max-md:hidden font-mono tracking-widest text-[#1C1917] uppercase text-[10px] font-bold">
        <FloatingCard
          text="[ ASSUMPTION ]: STUDENTS WILL PAY"
          accent="none"
          className="absolute top-[200px] left-[0px] max-lg:left-[-10px] opacity-0 animate-[storyFloat1_9s_ease-in-out_infinite] [animation-delay:0.8s] border border-black/10 bg-white/60 backdrop-blur-3xl shadow-[0_4px_16px_rgba(229,101,78,0.06)] rounded-none"
        />
        <FloatingCard
          text="[ EVIDENCE ]: PAIN IS REAL, WTP WEAK"
          accent="none"
          className="absolute top-[280px] left-[50px] max-lg:left-[20px] opacity-0 animate-[storyFloat2_9s_ease-in-out_infinite] [animation-delay:0.8s] border border-black/10 bg-white/60 backdrop-blur-3xl shadow-[0_4px_16px_rgba(155,196,200,0.06)] rounded-none"
        />
        <FloatingCard
          text="[ DECISION BRIEF ]: PIVOT PRICING"
          accent="none"
          className="absolute top-[200px] right-[0px] max-lg:right-[-10px] opacity-0 animate-[storyFloat3_9s_ease-in-out_infinite] [animation-delay:0.8s] border border-black/10 bg-white/60 backdrop-blur-3xl shadow-[0_4px_16px_rgba(229,101,78,0.06)] rounded-none"
        />
      </div>
    </section>
  );
}
