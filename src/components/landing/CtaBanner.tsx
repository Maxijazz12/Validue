import Button from "@/components/ui/Button";

export default function CtaBanner() {
  return (
    <section className="text-center relative py-[48px] px-[40px] max-md:px-[24px] max-md:py-[36px]">
      <h2 className="text-[clamp(28px,4vw,44px)] font-bold tracking-tight leading-[1.1] text-white">
        Your next build decision{" "}
        <span className="relative inline-block">
          <span className="italic font-light text-white/50 font-sans">
            should not be a guess.
          </span>
        </span>
      </h2>
      <p className="font-mono text-[11px] uppercase tracking-widest text-[#A8A29E] mt-[24px] max-w-[400px] mx-auto leading-[1.8]">
        [ // RUN THE TEST BEFORE YOU WRITE THE CODE ]<br />
        START WITH A RAW IDEA. LEAVE WITH A DECISION BRIEF.
      </p>
      <div className="flex items-center justify-center gap-[12px] mt-[48px]">
        <Button variant="primary" href="/auth/signup" className="!bg-white !text-[#1C1917] hover:!bg-white/90 hover:!shadow-[0_4px_24px_rgba(255,255,255,0.2)] font-mono uppercase tracking-widest text-[10px] font-bold py-[12px] px-[24px]">
          [ GET_YOUR_FIRST_BRIEF ]
        </Button>
        <Button variant="outline" href="/#examples" className="!border-white/10 !text-[#A8A29E] hover:!border-white/30 hover:!text-white font-mono uppercase tracking-widest text-[10px] font-bold py-[12px] px-[24px]">
          [ SEE_EXAMPLE_BRIEFS ]
        </Button>
      </div>
    </section>
  );
}
