import Button from "@/components/ui/Button";

export default function CtaBanner() {
  return (
    <section className="text-center relative py-[60px] px-[40px] bg-[#f7f4ef] rounded-2xl max-md:px-[24px] max-md:py-[48px]">
      <h2 className="text-[clamp(40px,6vw,72px)] font-extrabold tracking-[-2px] leading-[1.0] text-[#111111]">
        The Wall is live.
        <br />
        Your audience is{" "}
        <span className="text-[#e8b87a]/70 italic font-light tracking-[-1px]">
          waiting
        </span>
        .
      </h2>
      <p className="text-[17px] text-[#555555] mt-[24px]">
        Post your first idea free — or start earning as a respondent today.
      </p>
      <div className="flex items-center justify-center gap-[12px] mt-[40px]">
        <Button variant="primary" href="/auth/signup">
          Post Your Idea
        </Button>
        <Button variant="secondary" href="/dashboard/the-wall">
          Start Earning
        </Button>
      </div>
    </section>
  );
}
