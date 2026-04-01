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
        {/* Ambient color washes — warm terracotta + soft sage */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Terracotta — centered behind hero headline */}
          <div className="absolute" style={{ top: '1%', left: '50%', transform: 'translateX(-50%)', width: '1000px', height: '700px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,160,136,0.22) 0%, transparent 65%)' }} />
          {/* Sage — behind WallPreview cards */}
          <div className="absolute" style={{ top: '14%', left: '50%', transform: 'translateX(-40%)', width: '1100px', height: '800px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(168,180,160,0.14) 0%, transparent 65%)' }} />
          {/* Terracotta — behind HowItWorks, offset left */}
          <div className="absolute" style={{ top: '30%', left: '-5%', width: '900px', height: '700px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,160,136,0.16) 0%, transparent 65%)' }} />
          {/* Sage — behind QualityFeature, offset right */}
          <div className="absolute" style={{ top: '45%', right: '-5%', width: '900px', height: '700px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(168,180,160,0.14) 0%, transparent 65%)' }} />
          {/* Warm cream — centered behind DidYouKnow */}
          <div className="absolute" style={{ top: '57%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,180,156,0.12) 0%, transparent 65%)' }} />
          {/* Sage — behind Pricing, wider spread */}
          <div className="absolute" style={{ top: '69%', left: '50%', transform: 'translateX(-50%)', width: '1200px', height: '700px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(168,180,160,0.14) 0%, transparent 65%)' }} />
          {/* Terracotta — behind CTA banner */}
          <div className="absolute" style={{ top: '85%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(212,160,136,0.14) 0%, transparent 65%)' }} />
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

        {/* ─── Dark closing section (warm dark) ─── */}
        <div className="bg-[#110F0D] relative mt-[60px]">
          {/* Top edge gradient for smooth transition */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3D3830] to-transparent" />
          {/* Subtle radial glow at top center */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[350px] pointer-events-none" style={{ background: 'radial-gradient(ellipse, rgba(212,160,136,0.08) 0%, transparent 70%)' }} />

          <ScrollReveal animation="slide-up">
            <div className="py-[100px] max-md:py-[72px]">
              <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
                <CtaBanner />
              </div>
            </div>
          </ScrollReveal>

          {/* Trust strip */}
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <div className="flex items-center justify-center gap-[24px] max-md:flex-col max-md:gap-[8px] py-[24px] border-t border-[#3D3830]/60 text-[12px] text-[#78716C]">
              <span>Founders from YC, Techstars, and 40+ countries</span>
              <span className="text-[#3D3830] max-md:hidden">|</span>
              <span>94% average quality score</span>
              <span className="text-[#3D3830] max-md:hidden">|</span>
              <span>$48K+ paid to respondents</span>
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
