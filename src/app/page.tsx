import dynamic from "next/dynamic";
import Navbar from "@/components/landing/Navbar";
import Hero from "@/components/landing/Hero";
import Ticker from "@/components/landing/Ticker";
import ScrollReveal from "@/components/ui/ScrollReveal";

const Features = dynamic(() => import("@/components/landing/Features"));
const HowItWorks = dynamic(() => import("@/components/landing/HowItWorks"));
const Testimonials = dynamic(() => import("@/components/landing/Testimonials"));
const ExampleValidations = dynamic(() => import("@/components/landing/ExampleValidations"));
const Pricing = dynamic(() => import("@/components/landing/Pricing"));
const CtaBanner = dynamic(() => import("@/components/landing/CtaBanner"));
const Footer = dynamic(() => import("@/components/landing/Footer"));

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="relative overflow-hidden">
        {/* Hero */}
        <div className="max-w-[1200px] mx-auto px-6">
          <Hero />
        </div>

        {/* Ticker */}
        <Ticker />

        {/* Features */}
        <ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
            <Features />
          </div>
        </ScrollReveal>

        {/* How It Works */}
        <ScrollReveal>
          <div className="bg-bg-muted/50">
            <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
              <HowItWorks />
            </div>
          </div>
        </ScrollReveal>

        {/* Testimonials */}
        <ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
            <Testimonials />
          </div>
        </ScrollReveal>

        {/* Example Briefs */}
        <ScrollReveal>
          <div className="bg-bg-muted/50">
            <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
              <ExampleValidations />
            </div>
          </div>
        </ScrollReveal>

        {/* Pricing */}
        <ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
            <Pricing />
          </div>
        </ScrollReveal>

        {/* CTA + Footer */}
        <div className="bg-text-primary">
          <ScrollReveal animation="slide-up">
            <div className="max-w-[1200px] mx-auto px-6 py-[120px] max-md:py-20">
              <CtaBanner />
            </div>
          </ScrollReveal>
          <div className="max-w-[1200px] mx-auto px-6">
            <Footer />
          </div>
        </div>
      </main>
    </>
  );
}
