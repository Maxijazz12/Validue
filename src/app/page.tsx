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

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        {/* Ambient color washes */}
        <div className="pointer-events-none absolute inset-0" aria-hidden="true">
          {/* Peach — centered behind hero headline */}
          <div className="absolute" style={{ top: '2%', left: '50%', transform: 'translateX(-50%)', width: '900px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(232,193,176,0.18) 0%, transparent 70%)' }} />
          {/* Mint — behind WallPreview cards */}
          <div className="absolute" style={{ top: '15%', left: '50%', transform: 'translateX(-40%)', width: '1100px', height: '800px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,196,200,0.16) 0%, transparent 70%)' }} />
          {/* Peach — behind HowItWorks, offset left */}
          <div className="absolute" style={{ top: '32%', left: '-5%', width: '800px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(232,193,176,0.14) 0%, transparent 70%)' }} />
          {/* Mint — behind QualityFeature, offset right */}
          <div className="absolute" style={{ top: '46%', right: '-5%', width: '800px', height: '600px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,196,200,0.14) 0%, transparent 70%)' }} />
          {/* Mint — centered behind DidYouKnow (breaks peach streak) */}
          <div className="absolute" style={{ top: '58%', left: '50%', transform: 'translateX(-50%)', width: '700px', height: '500px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,196,200,0.12) 0%, transparent 70%)' }} />
          {/* Mint — behind Pricing, wider spread */}
          <div className="absolute" style={{ top: '70%', left: '50%', transform: 'translateX(-50%)', width: '1200px', height: '700px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(155,196,200,0.14) 0%, transparent 70%)' }} />
          {/* Peach — behind CTA banner */}
          <div className="absolute" style={{ top: '86%', left: '50%', transform: 'translateX(-50%)', width: '800px', height: '500px', borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(232,193,176,0.12) 0%, transparent 70%)' }} />
        </div>
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] pt-[0px] pb-[80px] max-md:pb-[60px]">
          <Hero />
        </div>

        <Ticker />

        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[60px]">
          <WallPreview />
        </div>

        <div className="py-[80px] max-md:py-[60px]">
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <HowItWorks />
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[80px] max-md:py-[60px]">
          <QualityFeature />
        </div>

        <div className="py-[80px] max-md:py-[60px]">
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <Pricing />
          </div>
        </div>

        <div className="py-[80px] max-md:py-[60px]">
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <DidYouKnow />
          </div>
        </div>

        <div className="py-[60px] max-md:py-[48px]">
          <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
            <CtaBanner />
          </div>
        </div>

        {/* Trust strip */}
        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
          <div className="flex items-center justify-center gap-[24px] max-md:flex-col max-md:gap-[8px] py-[24px] border-t border-[#E2E8F0]/40 text-[12px] text-[#94A3B8]">
            <span>Founders from YC, Techstars, and 40+ countries</span>
            <span className="text-[#E2E8F0] max-md:hidden">|</span>
            <span>94% average quality score</span>
            <span className="text-[#E2E8F0] max-md:hidden">|</span>
            <span>$48K+ paid to respondents</span>
          </div>
        </div>

        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px]">
          <Footer />
        </div>
      </main>
    </>
  );
}
