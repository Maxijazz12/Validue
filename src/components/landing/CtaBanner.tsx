import Button from "@/components/ui/Button";

export default function CtaBanner() {
  return (
    <section className="text-center relative py-[48px] px-[40px] max-md:px-[24px] max-md:py-[36px]">
      <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-[-0.04em] leading-[1.1] text-white">
        Your next idea is{" "}
        <span className="relative inline-block">
          <span className="text-gradient-animated italic font-normal">
            worth testing.
          </span>
        </span>
      </h2>
      <p className="text-[16px] text-[#A8A29E] mt-[16px]">
        Post for free and get your first responses today. Or start earning by sharing what you know.
      </p>
      <div className="flex items-center justify-center gap-[12px] mt-[32px]">
        <Button variant="primary" href="/auth/signup" className="!bg-white !text-[#1C1917] hover:!bg-[#FAF8F5] hover:!shadow-[0_4px_24px_rgba(212,160,136,0.25)]">
          Get Started Free
        </Button>
        <Button variant="outline" href="/dashboard/the-wall" className="!border-[#3D3830] !text-[#A8A29E] hover:!border-[#57534E] hover:!text-white">
          Explore Ideas
        </Button>
      </div>
    </section>
  );
}
