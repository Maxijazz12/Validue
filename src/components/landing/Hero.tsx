import Button from "@/components/ui/Button";
import FloatingCard from "@/components/landing/FloatingCard";
import { floatingNotifications } from "@/lib/constants";

export default function Hero() {
  return (
    <section className="flex flex-col justify-center items-center text-center pt-[160px] pb-[40px] relative max-md:pt-[130px] max-md:pb-[20px]">
      {/* Badge */}
      <div className="inline-flex items-center gap-[8px] px-[14px] py-[6px] border border-[#ebebeb] bg-white rounded-full text-[12px] text-[#999999] font-medium tracking-[1px] uppercase mb-[40px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.1s]">
        <span className="w-[6px] h-[6px] bg-[#22c55e] rounded-full animate-[pulse_2.5s_ease_infinite]" />
        Live marketplace
      </div>

      {/* Headline */}
      <h1 className="text-[clamp(48px,8vw,88px)] font-extrabold leading-[1.0] tracking-[-3px] max-w-[720px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.2s] text-[#111111]">
        Real ideas.
        <br />
        Real feedback.
        <br />
        Real{" "}
        <span className="text-[#e8b87a]/70 italic font-light tracking-[-1px]">
          signal
        </span>
        .
      </h1>

      {/* Subtitle */}
      <p className="text-[17px] text-[#555555] max-w-[480px] leading-[1.7] mt-[32px] font-normal opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.35s]">
        Founders post startup ideas. Matched target users give honest, paid
        feedback. See what&apos;s live right now.
      </p>

      {/* Dual CTAs */}
      <div className="flex items-center gap-[12px] mt-[44px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.5s]">
        <Button variant="primary" href="/dashboard/the-wall">
          Explore the Wall
        </Button>
        <Button variant="secondary" href="/auth/signup">
          Post Your Idea
        </Button>
      </div>

      {/* Social Proof */}
      <div className="flex items-center justify-center gap-[12px] mt-[28px] opacity-0 animate-[fadeUp_0.7s_cubic-bezier(0.16,1,0.3,1)_forwards] [animation-delay:0.6s]">
        <div className="flex -space-x-[8px]">
          {["#3b82f6", "#a855f7", "#22c55e", "#e8b87a", "#ef4444"].map(
            (color, i) => (
              <div
                key={i}
                className="w-[28px] h-[28px] rounded-full border-2 border-white"
                style={{ background: color }}
              />
            )
          )}
        </div>
        <span className="text-[14px] text-[#555555]">
          <span className="font-mono font-bold text-[#111111]">2,400+</span>{" "}
          ideas posted{" "}
          <span className="text-[#999999]">·</span>{" "}
          <span className="font-mono font-bold text-[#111111]">$48K+</span>{" "}
          earned by respondents
        </span>
      </div>

      {/* Floating Notification Cards (desktop only) */}
      <div className="max-md:hidden">
        <FloatingCard
          text={floatingNotifications[0].text}
          color={floatingNotifications[0].color}
          className="absolute top-[200px] right-[-60px] animate-[floatA_4s_ease-in-out_infinite] max-lg:right-[-20px]"
        />
        <FloatingCard
          text={floatingNotifications[1].text}
          color={floatingNotifications[1].color}
          className="absolute top-[300px] left-[-70px] animate-[floatB_5s_ease-in-out_infinite] [animation-delay:1s] max-lg:left-[-20px]"
        />
      </div>
    </section>
  );
}
