"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <div className="fixed top-0 left-0 right-0 z-100 flex justify-center px-[24px] pt-[16px]">
      <nav
        className={`w-full max-w-[1200px] rounded-2xl border backdrop-blur-[24px] transition-all duration-300 ${
          scrolled
            ? "border-[#EDE8E3]/60 bg-gradient-to-b from-[#FAF8F5]/95 to-[#F5F0EB]/92 shadow-[0_2px_8px_rgba(180,140,110,0.08),0_8px_24px_rgba(180,140,110,0.06),inset_0_1px_0_rgba(255,255,255,0.7)]"
            : "border-[#EDE8E3]/40 bg-gradient-to-b from-[#FAF8F5]/80 to-[#F5F0EB]/70 shadow-[0_1px_4px_rgba(180,140,110,0.06),0_4px_12px_rgba(180,140,110,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]"
        }`}
      >
        <div className="px-[32px] max-md:px-[20px] py-[14px] flex justify-between items-center">
          {/* Logo + divider + nav links grouped left */}
          <div className="flex items-center gap-0">
            <Link href="/" className="flex items-center gap-[10px] no-underline">
              <Image src="/logo-icon.svg" alt="" width={18} height={18} />
              <span className="text-[21px] font-bold tracking-[1px] text-[#1C1917]">
                Validue
              </span>
            </Link>

            {/* Vertical divider */}
            <div className="hidden md:block w-[1px] h-[20px] bg-[#DDD6CE] mx-[24px]" />

            <div className="hidden md:flex gap-[28px] items-center">
              <a href="#how" className="text-[#78716C] text-[14px] font-medium hover:text-[#1C1917] transition-colors no-underline">How It Works</a>
              <a href="#pricing" className="text-[#78716C] text-[14px] font-medium hover:text-[#1C1917] transition-colors no-underline">Pricing</a>
              <a href="#respond" className="text-[#78716C] text-[14px] font-medium hover:text-[#1C1917] transition-colors no-underline">Earn Money</a>
            </div>
          </div>

          {/* CTA buttons right */}
          <div className="flex gap-[12px] items-center">
            <a href="/auth/login" className="hidden md:inline-flex text-[#78716C] text-[14px] font-medium hover:text-[#1C1917] transition-all duration-200 no-underline px-[16px] py-[10px] rounded-xl border border-[#EDE8E3]/60 hover:border-[#DDD6CE] hover:bg-white/40">
              Login
            </a>
            <a href="/auth/signup" className="gradient-btn px-[24px] py-[10px] rounded-xl font-medium text-[14px] text-white no-underline shadow-[0_2px_8px_rgba(0,0,0,0.12)]">
              Get Started
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
