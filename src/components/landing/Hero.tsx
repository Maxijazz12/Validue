import Button from "@/components/ui/Button";
import FloatingCard from "@/components/landing/FloatingCard";
import { heroStats } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="flex flex-col justify-center items-center text-center pt-[160px] pb-[60px] relative max-md:pt-[130px] max-md:pb-[40px]">
      <h1 className="text-[clamp(42px,6vw,68px)] font-bold leading-[1.05] tracking-[-0.04em] text-[#1C1917] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        Validate before
        <br />
        you{" "}
        <span className="relative inline-block">
          <span className="absolute inset-0 -inset-x-[20px] -inset-y-[10px] rounded-full bg-[radial-gradient(circle,rgba(212,160,136,0.18)_0%,transparent_70%)] blur-[4px]" />
          <span className="text-gradient-animated italic font-normal relative font-heading text-[1.05em]">
            build.
          </span>
        </span>
      </h1>

      <p className="text-[17px] text-[#78716C] max-w-[400px] mx-auto leading-[1.65] mt-[24px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.15s]">
        Post your idea. Get paid feedback from matched
        target users. Know what&apos;s real.
      </p>

      <div className="flex items-center gap-[32px] max-md:gap-[24px] mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.3s]">
        {heroStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-mono text-[20px] font-bold text-[#1C1917]">{stat.number}</div>
            <div className="text-[12px] text-[#A8A29E] mt-[2px]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.4s]">
        <Button variant="primary" href="/auth/signup">
          Start Validating — Free
        </Button>
      </div>

      {/* Trust strip — social proof near CTA */}
      <div className="flex items-center justify-center gap-[20px] max-md:gap-[12px] mt-[24px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.55s]">
        <span className="text-[13px] text-[#A8A29E]">Founders from YC, Techstars &amp; 40+ countries</span>
        <span className="w-[3px] h-[3px] rounded-full bg-[#D6CFC7] max-md:hidden" />
        <span className="text-[13px] text-[#A8A29E] max-md:hidden">$48K+ paid to respondents</span>
      </div>

      {/* Storytelling floating cards (desktop only) — rotating narrative loop */}
      <div className="max-md:hidden">
        <FloatingCard
          text="Sarah posted: AI Study Buddy"
          accent="blue"
          className="absolute top-[200px] left-[-50px] max-lg:left-[-10px] opacity-0 animate-[storyFloat1_9s_ease-in-out_infinite] [animation-delay:0.8s]"
        />
        <FloatingCard
          text="12 respondents matched"
          accent="blue"
          className="absolute top-[280px] left-[-20px] max-lg:left-[10px] opacity-0 animate-[storyFloat2_9s_ease-in-out_infinite] [animation-delay:0.8s]"
        />
        <FloatingCard
          text="Alex earned +$12.00"
          accent="warm"
          className="absolute top-[200px] right-[-40px] max-lg:right-[-10px] opacity-0 animate-[storyFloat3_9s_ease-in-out_infinite] [animation-delay:0.8s]"
        />
      </div>
    </section>
  );
}
