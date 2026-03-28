import Button from "@/components/ui/Button";
import FloatingCard from "@/components/landing/FloatingCard";
import { heroStats } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="flex flex-col justify-center items-center text-center pt-[160px] pb-[60px] relative max-md:pt-[130px] max-md:pb-[40px]">
      <h1 className="text-[clamp(40px,6vw,64px)] font-bold leading-[1.05] tracking-[-0.02em] text-[#222222] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards]">
        Validate before
        <br />
        you{" "}
        <span className="relative inline-block">
          <span className="absolute inset-0 -inset-x-[16px] -inset-y-[8px] rounded-full bg-[radial-gradient(circle,rgba(232,193,176,0.12)_0%,transparent_70%)] blur-[2px]" />
          <span className="text-gradient-warm italic font-normal relative">
            build.
          </span>
        </span>
      </h1>

      <p className="text-[17px] text-[#64748B] max-w-[380px] mx-auto leading-[1.6] mt-[24px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.15s]">
        Post your idea. Get paid feedback from matched
        target users. Know what&apos;s real.
      </p>

      <div className="flex items-center gap-[32px] max-md:gap-[24px] mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.3s]">
        {heroStats.map((stat) => (
          <div key={stat.label} className="text-center">
            <div className="font-mono text-[20px] font-bold text-[#111111]">{stat.number}</div>
            <div className="text-[12px] text-[#94A3B8] mt-[2px]">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-[32px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.4s]">
        <Button variant="primary" href="/dashboard/the-wall">
          Explore the Wall - It&apos;s Free
        </Button>
      </div>

      {/* Floating cards (desktop only) */}
      <div className="max-md:hidden">
        <FloatingCard
          text="Alex just earned +$12.00"
          accent="warm"
          className="absolute top-[200px] right-[-40px] max-lg:right-[-10px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards,floatA_4s_ease-in-out_infinite] [animation-delay:0.6s]"
        />
        <FloatingCard
          text="New idea: AI Study Buddy"
          accent="blue"
          className="absolute top-[300px] left-[-50px] max-lg:left-[-10px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards,floatB_5s_ease-in-out_infinite] [animation-delay:0.8s]"
        />
      </div>
    </section>
  );
}
