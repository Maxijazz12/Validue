import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import WallPreview from "@/components/landing/WallPreview";
import Ticker from "@/components/landing/Ticker";
import HowItWorks from "@/components/landing/HowItWorks";
import QualityFeature from "@/components/landing/QualityFeature";
import Pricing from "@/components/landing/Pricing";
import DidYouKnow from "@/components/landing/DidYouKnow";
import CtaBanner from "@/components/landing/CtaBanner";
import Footer from "@/components/landing/Footer";
import ScrollReveal from "@/components/ui/ScrollReveal";

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        {/* V2 Radical Precision — Architectural Grid with Subtle Glows */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          {/* Faint dot grid background */}
          <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
          
          {/* Extremely Subtle Ambient Glows to fix dullness */}
          <div className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse,rgba(229,101,78,0.06)_0%,transparent_60%)] blur-[60px]" />
          <div className="absolute top-[30%] left-[-10%] w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(229,101,78,0.03)_0%,transparent_60%)] blur-[80px]" />
          <div className="absolute top-[60%] right-[-10%] w-[800px] h-[800px] bg-[radial-gradient(ellipse,rgba(229,101,78,0.03)_0%,transparent_60%)] blur-[80px]" />
        </div>
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] pt-[0px] pb-[100px] max-md:pb-[72px]">
          <Hero />
        </div>

        <Ticker />

        <ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[100px] max-md:py-[72px]">
            <WallPreview />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="py-[100px] max-md:py-[72px]">
            <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
              <HowItWorks />
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[100px] max-md:py-[72px]">
            <QualityFeature />
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="py-[100px] max-md:py-[72px]">
            <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
              <Pricing />
            </div>
          </div>
        </ScrollReveal>

        <ScrollReveal>
          <div className="py-[100px] max-md:py-[72px]">
            <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
              <DidYouKnow />
            </div>
          </div>
        </ScrollReveal>

        {/* ─── V2: Dark execution section ─── */}
        <div className="bg-[#1C1917] relative mt-[60px]">
          {/* Crisp structural border line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#E5654E]/20 to-transparent" />

          <ScrollReveal animation="slide-up">
            <div className="py-[100px] max-md:py-[72px]">
              <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
                <CtaBanner />
              </div>
            </div>
          </ScrollReveal>

          {/* Trust precision metrics */}
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <div className="flex items-center justify-center gap-[24px] max-md:flex-col max-md:gap-[8px] py-[24px] border-t border-white/5 text-[10px] uppercase font-bold tracking-widest text-white/40 mt-[32px] font-mono">
              <span>{"// "}FOUNDERS: YC, TECHSTARS, 40+ COUNTRIES</span>
              <span className="text-white/10 max-md:hidden">|</span>
              <span>{"// "}AVG_Q_SCORE: 94%</span>
              <span className="text-white/10 max-md:hidden">|</span>
              <span>{"// "}DEPLOYED: $48K+</span>
            </div>
          </div>

          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <Footer />
          </div>
        </div>
      </main>
    </>
  );
}
