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
            ? "border-white/30 bg-gradient-to-b from-[#f0f2f5]/95 to-[#e8eaef]/90 shadow-[0_4px_32px_rgba(0,0,0,0.08),inset_0_1px_0_rgba(255,255,255,0.6)]"
            : "border-white/25 bg-gradient-to-b from-[#f0f2f5]/80 to-[#e8eaef]/70 shadow-[0_2px_16px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.5)]"
        }`}
      >
        <div className="px-[32px] max-md:px-[20px] py-[14px] flex justify-between items-center">
          {/* Logo + divider + nav links grouped left */}
          <div className="flex items-center gap-0">
            <Link href="/" className="flex items-center gap-[10px] no-underline">
              <Image src="/logo-icon.svg" alt="" width={18} height={18} />
              <span className="text-[21px] font-bold tracking-[1px] text-[#111111]">
                Validue
              </span>
            </Link>

            {/* Vertical divider */}
            <div className="hidden md:block w-[1px] h-[20px] bg-[#c0c7d0] mx-[24px]" />

            <div className="hidden md:flex gap-[28px] items-center">
              <a href="#how" className="text-[#4a5568] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline">How It Works</a>
              <a href="#pricing" className="text-[#4a5568] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline">Pricing</a>
              <a href="#respond" className="text-[#4a5568] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline">Earn Money</a>
            </div>
          </div>

          {/* CTA buttons right */}
          <div className="flex gap-[12px] items-center">
            <a href="/auth/login" className="hidden md:inline-flex text-[#4a5568] text-[14px] font-medium hover:text-[#111111] transition-all duration-200 no-underline px-[16px] py-[10px] rounded-xl border border-white/40 hover:border-white/60 hover:bg-white/30">
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
