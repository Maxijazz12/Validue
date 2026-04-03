import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";
import { exampleValidations } from "@/lib/constants";

export const metadata = {
  title: "For Founders | VALIDUE",
  description:
    "Stop guessing, start validating. Get a Decision Brief with ranked insights, assumption verdicts, and clear next steps — in 48 hours.",
};

const problems = [
  {
    before: "Ask friends if your idea is good",
    after: "Get structured feedback from matched target users",
  },
  {
    before: "Send a Google Form to random people",
    after: "AI-generated questions designed to extract behavioral evidence",
  },
  {
    before: "Spend 3 months building an MVP to test demand",
    after: "Get a PROCEED / PIVOT / PAUSE recommendation in 48 hours",
  },
  {
    before: "Read 50 survey responses and try to find patterns",
    after: "AI synthesizes a Decision Brief with verdicts and next steps",
  },
];

const flow = [
  {
    step: "01",
    title: "Describe your idea",
    detail: "Paste your concept in plain text. Our AI extracts testable assumptions and generates 5-10 questions targeting behavioral evidence, not opinions.",
    time: "2 min",
  },
  {
    step: "02",
    title: "Fund your campaign",
    detail: "Set a budget ($10-$100+). The money goes to respondents weighted by quality. Higher plans get more reach per dollar.",
    time: "1 min",
  },
  {
    step: "03",
    title: "Real people respond",
    detail: "Matched respondents from your target demographic answer with depth. Responses are quality-scored, time-tracked, and AI-verified for consistency.",
    time: "24-48 hrs",
  },
  {
    step: "04",
    title: "Get your Decision Brief",
    detail: "AI synthesizes all responses into a structured brief: top-line recommendation, assumption verdicts with evidence, the uncomfortable truth, and specific next steps.",
    time: "Auto",
  },
];

// Show just the first example validation as a mini preview
const exampleBrief = exampleValidations[0];

export default function ForFoundersPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
          <div className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse,rgba(229,101,78,0.06)_0%,transparent_60%)] blur-[60px]" />
        </div>

        {/* Hero */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] pt-[160px] pb-[40px] max-md:pt-[120px]">
          <ScrollReveal>
            <div className="text-center">
              <div className="font-mono text-[10px] uppercase font-bold tracking-widest mb-[16px] text-[#A8A29E]">
                {"// "}FOR_FOUNDERS
              </div>
              <h1 className="text-[clamp(36px,5vw,64px)] font-bold tracking-[-0.03em] leading-[1.1] text-[#1C1917] mb-[24px]">
                Stop guessing.{" "}
                <span className="italic font-normal font-heading text-[#1C1917]/50">
                  Start validating.
                </span>
              </h1>
              <p className="text-[17px] text-[#78716C] max-w-[540px] mx-auto leading-[1.65]">
                Get a Decision Brief with ranked insights, assumption verdicts, and clear next steps — from your exact target audience, in 48 hours.
              </p>
              <div className="mt-[40px] flex items-center justify-center gap-[12px]">
                <Button variant="primary" href="/auth/signup">
                  Validate Your Idea
                </Button>
                <Button variant="outline" href="#how-it-works">
                  See How It Works
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Before/After */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <SectionHeader
              label="THE_PROBLEM"
              title="What founders do today"
              subtitle="Most idea validation is either biased, unstructured, or takes months. There's a better way."
            />
          </ScrollReveal>
          <div className="grid grid-cols-1 gap-[12px] mt-[56px] max-w-[680px] mx-auto">
            {problems.map((p, i) => (
              <ScrollReveal key={p.before} animation="slide-up" staggerIndex={i}>
                <div className="bg-white/60 backdrop-blur-3xl rounded-[16px] p-[20px_24px] shadow-card border border-white/80 flex items-start gap-[16px] max-md:flex-col max-md:gap-[12px]">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] mb-[4px]">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#ef4444] bg-[#ef4444]/10 px-[6px] py-[2px] rounded">
                        BEFORE
                      </span>
                    </div>
                    <p className="text-[14px] text-[#78716C] leading-[1.5] line-through decoration-black/10">
                      {p.before}
                    </p>
                  </div>
                  <div className="shrink-0 text-[#A8A29E] max-md:hidden">→</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-[8px] mb-[4px]">
                      <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-[6px] py-[2px] rounded">
                        WITH VALIDUE
                      </span>
                    </div>
                    <p className="text-[14px] text-[#1C1917] leading-[1.5] font-medium">
                      {p.after}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Detailed flow */}
        <div id="how-it-works" className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <SectionHeader
              label="THE_PROCESS"
              title="From idea to decision in 4 steps"
            />
          </ScrollReveal>
          <div className="flex flex-col gap-[16px] mt-[56px] max-w-[680px] mx-auto">
            {flow.map((f, i) => (
              <ScrollReveal key={f.step} animation="slide-up" staggerIndex={i}>
                <div className="bg-white/60 backdrop-blur-3xl rounded-[20px] p-[28px] shadow-card border border-white/80 relative overflow-hidden before:absolute before:top-0 before:left-[15%] before:right-[15%] before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#E5654E]/30 before:to-transparent">
                  <div className="flex items-start gap-[20px]">
                    <span className="font-mono text-[28px] font-bold text-black/5 shrink-0 leading-none mt-[2px]">
                      {f.step}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-[12px] mb-[8px]">
                        <h3 className="text-[17px] font-semibold text-[#1C1917] tracking-tight">
                          {f.title}
                        </h3>
                        <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-[#A8A29E] bg-black/5 px-[8px] py-[3px] rounded-md shrink-0">
                          {f.time}
                        </span>
                      </div>
                      <p className="text-[14px] text-[#78716C] leading-[1.7]">
                        {f.detail}
                      </p>
                    </div>
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* Example brief preview */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <SectionHeader
              label="EXAMPLE_OUTPUT"
              title="Here's what you get"
              subtitle="A real Decision Brief from a validated campaign."
            />
          </ScrollReveal>
          <ScrollReveal>
            <div className="max-w-[680px] mx-auto mt-[56px] bg-white/60 backdrop-blur-3xl rounded-[24px] p-[32px] shadow-card border border-white/80">
              {/* Recommendation */}
              <div className="text-center mb-[24px]">
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#22c55e] bg-[#22c55e]/10 px-[10px] py-[5px] rounded-md">
                  [ PROCEED ]
                </span>
                <span className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#A8A29E] bg-black/5 px-[10px] py-[5px] rounded-md ml-[8px]">
                  HIGH CONFIDENCE
                </span>
              </div>

              <h3 className="text-[17px] font-semibold text-[#1C1917] mb-[12px] text-center">
                {exampleBrief.title}
              </h3>

              <p className="text-[13px] text-[#78716C] leading-[1.7] mb-[20px]">
                {exampleBrief.signalSummary}
              </p>

              {/* Uncomfortable truth */}
              <div className="bg-[#FBF6F3] border border-[#E8C1B0]/30 rounded-[12px] p-[16px] mb-[20px]">
                <div className="font-mono text-[9px] font-bold uppercase tracking-widest text-[#E5654E] mb-[6px]">
                  [ UNCOMFORTABLE_TRUTH ]
                </div>
                <p className="text-[13px] text-[#1C1917] leading-[1.6] italic">
                  {exampleBrief.uncomfortableTruth}
                </p>
              </div>

              {/* Verdicts summary */}
              <div className="flex flex-col gap-[8px] mb-[20px]">
                {exampleBrief.assumptions.map((a) => (
                  <div key={a.assumption} className="flex items-center justify-between gap-[8px] py-[8px] border-b border-black/5 last:border-0">
                    <span className="text-[13px] text-[#78716C] truncate flex-1">{a.assumption}</span>
                    <span className={`shrink-0 font-mono text-[9px] font-bold uppercase tracking-widest px-[6px] py-[2px] rounded ${
                      a.verdict === "CONFIRMED" ? "bg-[#22c55e]/10 text-[#22c55e]" :
                      a.verdict === "CHALLENGED" ? "bg-[#f59e0b]/10 text-[#f59e0b]" :
                      "bg-[#ef4444]/10 text-[#ef4444]"
                    }`}>
                      {a.verdict}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-center">
                <Button variant="outline" href="/#examples">
                  See More Examples
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* CTA */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[48px] shadow-card border border-white/80 text-center">
              <h2 className="text-[clamp(24px,3.5vw,36px)] font-bold tracking-tight text-[#1C1917] mb-[16px]">
                Your first campaign is free
              </h2>
              <p className="text-[15px] text-[#78716C] max-w-[440px] mx-auto mb-[32px] leading-[1.6]">
                One campaign, first-signal reach included, $2 credit included. No credit card required.
              </p>
              <Button variant="primary" href="/auth/signup">
                Start Validating Free
              </Button>
            </div>
          </ScrollReveal>
        </div>

        {/* Footer */}
        <div className="bg-[#1C1917] relative mt-[60px]">
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#E5654E]/20 to-transparent" />
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <Footer />
          </div>
        </div>
      </main>
    </>
  );
}
