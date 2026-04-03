import Navbar from "@/components/landing/Navbar";
import Footer from "@/components/landing/Footer";
import PricingHero from "@/components/landing/PricingHero";
import ScrollReveal from "@/components/ui/ScrollReveal";

export const metadata = {
  title: "Pricing | VALIDUE",
  description:
    "Pricing plans for turning raw ideas into Decision Briefs. Choose a plan, fund validation runs, and collect real evidence before you build.",
};

export default function PricingPage() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
          <div className="absolute inset-0 bg-[radial-gradient(#1C1917_1px,transparent_1px)] [background-size:24px_24px] opacity-[0.03]" />
          <div className="absolute top-[0%] left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-[radial-gradient(ellipse,rgba(229,101,78,0.06)_0%,transparent_60%)] blur-[60px]" />
        </div>

        <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] pt-[120px] pb-[100px] max-md:pt-[100px] max-md:pb-[72px]">
          <ScrollReveal>
            <PricingHero />
          </ScrollReveal>
        </div>

        {/* Dark footer section */}
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
