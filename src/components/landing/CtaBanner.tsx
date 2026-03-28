import Button from "@/components/ui/Button";

export default function CtaBanner() {
  return (
    <section className="text-center relative py-[48px] px-[40px] max-md:px-[24px] max-md:py-[36px]">
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true" style={{ background: 'radial-gradient(ellipse at center, rgba(232,193,176,0.05) 0%, transparent 65%)' }} />
      <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.02em] leading-[1.1] text-[#222222]">
        Your next idea is{" "}
        <span className="relative inline-block">
          <span className="text-gradient-warm italic font-normal">
            worth testing.
          </span>
        </span>
      </h2>
      <p className="text-[16px] text-[#64748B] mt-[16px]">
        Post for free and get your first responses today. Or start earning by sharing what you know.
      </p>
      <div className="flex items-center justify-center gap-[12px] mt-[32px]">
        <Button variant="primary" href="/auth/signup">
          Post an Idea - Free
        </Button>
        <Button variant="outline" href="/dashboard/the-wall">
          Start Earning
        </Button>
      </div>
    </section>
  );
}
