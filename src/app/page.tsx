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
      <main className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] flex flex-col gap-[160px] max-md:gap-[100px]">
        <Hero />
        <WallPreview />
        <Ticker />
        <HowItWorks />
        <QualityFeature />
        <Pricing />
        <DidYouKnow />
        <CtaBanner />
        <Footer />
      </main>
    </>
  );
}
