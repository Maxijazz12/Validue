import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";
import SectionHeader from "@/components/ui/SectionHeader";
import Button from "@/components/ui/Button";

export const metadata = {
  title: "Earn Money | VALIDUE",
  description:
    "Get paid to give honest feedback on startup ideas. Quality-scored, qualification-based payouts. Top respondents earn $200+/month.",
};

const steps = [
  {
    step: "01",
    title: "Create Your Profile",
    description:
      "Tell us your interests, expertise, and industry. We use this to match you with campaigns that need your perspective.",
  },
  {
    step: "02",
    title: "Respond to Campaigns",
    description:
      "Browse The Wall for active validations. Answer 5-10 questions per campaign — most take 5-10 minutes. Be specific and honest.",
  },
  {
    step: "03",
    title: "Get Paid for Quality",
    description:
      "Thoughtful, behavioral answers help you qualify for payout. Once qualified, respondents share the funded pool evenly. Top respondents earn $200+/month.",
  },
];

const earnings = [
  { label: "Avg. per response", value: "$2–$8" },
  { label: "Top earner (monthly)", value: "$200+" },
  { label: "Total paid out", value: "$48K+" },
  { label: "Avg. time per campaign", value: "7 min" },
];

const qualities = [
  {
    title: "Be specific, not generic",
    description:
      "\"I would pay $10/mo\" is okay. \"I currently spend 20 min every Sunday doing this manually, so saving that time is worth $10/mo to me\" is great.",
  },
  {
    title: "Share real behavior",
    description:
      "We care about what you actually do, not what you think you'd do. Mention specific tools, habits, workarounds, and frustrations.",
  },
  {
    title: "Disagree when you should",
    description:
      "Founders need honest signal. Contradicting evidence is just as valuable as supporting evidence — sometimes more.",
  },
  {
    title: "Take your time",
    description:
      "Rushed, low-effort responses earn less and hurt your reputation score. A few thoughtful responses are worth more than many quick ones.",
  },
];

export default function EarnPage() {
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
                {"// "}EARN_YIELD
              </div>
              <h1 className="text-[clamp(36px,5vw,64px)] font-bold tracking-[-0.03em] leading-[1.1] text-[#1C1917] mb-[24px]">
                Get paid for{" "}
                <span className="italic font-normal font-heading text-[#1C1917]/50">
                  honest feedback
                </span>
              </h1>
              <p className="text-[17px] text-[#78716C] max-w-[520px] mx-auto leading-[1.65]">
                Founders need real signal from real people. Share your perspective on startup ideas and get paid based on the quality of your feedback.
              </p>
              <div className="mt-[40px]">
                <Button variant="primary" href="/auth/signup">
                  Start Earning
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>

        {/* Earnings stats */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <div className="grid grid-cols-4 max-md:grid-cols-2 gap-[16px]">
              {earnings.map((stat) => (
                <div
                  key={stat.label}
                  className="bg-white/60 backdrop-blur-3xl rounded-[20px] p-[24px] shadow-card border border-white/80 text-center"
                >
                  <div className="font-mono text-[24px] font-bold text-[#1C1917]">
                    {stat.value}
                  </div>
                  <div className="text-[12px] text-[#A8A29E] mt-[4px]">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>

        {/* How it works */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <SectionHeader
              label="HOW EARNING WORKS"
              title="Three steps to your first payout"
            />
          </ScrollReveal>
          <div className="grid grid-cols-3 gap-[16px] mt-[56px] max-md:grid-cols-1">
            {steps.map((step, i) => (
              <ScrollReveal key={step.step} animation="slide-up" staggerIndex={i}>
                <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[32px] shadow-card border border-white/80 h-full relative overflow-hidden before:absolute before:top-0 before:left-[15%] before:right-[15%] before:h-[1px] before:bg-gradient-to-r before:from-transparent before:via-[#E5654E]/30 before:to-transparent">
                  <span className="absolute top-[16px] right-[24px] font-mono text-[24px] font-bold text-black/5 pointer-events-none select-none">
                    [{step.step}]
                  </span>
                  <div className="font-mono text-[10px] text-[#A8A29E] tracking-widest mb-[16px] font-bold uppercase flex items-center gap-[8px]">
                    <span className="w-[4px] h-[4px] rounded-full bg-[#E5654E] animate-pulse" />
                    STEP_{step.step}
                  </div>
                  <h3 className="text-[18px] font-bold mb-[12px] tracking-tight text-[#1C1917]">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-[#78716C] leading-[1.7]">
                    {step.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* What earns more */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <SectionHeader
              label="QUALITY_SIGNALS"
              title="What earns more"
              subtitle="Our AI scores every response. Here's what separates a $2 payout from an $8 payout."
            />
          </ScrollReveal>
          <div className="grid grid-cols-2 gap-[16px] mt-[56px] max-md:grid-cols-1">
            {qualities.map((q, i) => (
              <ScrollReveal key={q.title} animation="slide-up" staggerIndex={i}>
                <div className="bg-white/60 backdrop-blur-3xl rounded-[20px] p-[28px] shadow-card border border-white/80 h-full">
                  <h3 className="text-[16px] font-semibold text-[#1C1917] mb-[8px]">
                    {q.title}
                  </h3>
                  <p className="text-[14px] text-[#78716C] leading-[1.7]">
                    {q.description}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[56px]">
          <ScrollReveal>
            <div className="bg-white/60 backdrop-blur-3xl rounded-[24px] p-[48px] shadow-card border border-white/80 text-center">
              <h2 className="text-[clamp(24px,3.5vw,36px)] font-bold tracking-tight text-[#1C1917] mb-[16px]">
                Ready to start earning?
              </h2>
              <p className="text-[15px] text-[#78716C] max-w-[440px] mx-auto mb-[32px] leading-[1.6]">
                Create a free account, set up your profile in 2 minutes, and start browsing campaigns on The Wall.
              </p>
              <Button variant="primary" href="/auth/signup">
                Create Free Account
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
