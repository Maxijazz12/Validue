"use client";

import { useEffect, useState } from "react";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-100 backdrop-blur-[20px] border-b transition-all duration-300 ${
        scrolled
          ? "border-[#ebebeb] bg-[rgba(250,248,245,0.92)] shadow-[0_1px_8px_rgba(0,0,0,0.03)]"
          : "border-transparent bg-transparent"
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-[64px] max-md:px-[24px] py-[18px] flex justify-between items-center">
        {/* Logo */}
        <div className="font-mono text-[20px] font-bold tracking-[4px] text-[#111111]">
          VLDT<span className="text-[#e8b87a]">A</span>
        </div>

        {/* Nav links */}
        <div className="hidden md:flex gap-[32px] items-center">
          <a
            href="#how"
            className="text-[#555555] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline"
          >
            How It Works
          </a>
          <a
            href="#pricing"
            className="text-[#555555] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline"
          >
            Pricing
          </a>
          <a
            href="#respond"
            className="text-[#555555] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline"
          >
            Earn Money
          </a>
        </div>

        {/* Right side: Login + CTA */}
        <div className="flex gap-[12px] items-center">
          <a
            href="#"
            className="hidden md:inline-flex text-[#555555] text-[14px] font-medium hover:text-[#111111] transition-colors no-underline px-[16px] py-[10px] rounded-lg border border-[#ebebeb] hover:border-[#d4d4d4] hover:bg-[#fafafa]"
          >
            Login
          </a>
          <a
            href="#"
            className="gradient-btn px-[24px] py-[10px] rounded-lg font-semibold text-[14px] text-white no-underline hover:shadow-[0_2px_12px_rgba(0,0,0,0.15)] hover:scale-[1.01]"
          >
            Get Started
          </a>
        </div>
      </div>
    </nav>
  );
}
