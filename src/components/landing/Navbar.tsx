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
        className={`w-full max-w-[1200px] rounded-[24px] border backdrop-blur-[48px] transition-all duration-500 ${
          scrolled
            ? "border-black/5 bg-white/70 shadow-[0_4px_32px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,0.9)]"
            : "border-transparent bg-white/20 shadow-[0_4px_32px_rgba(0,0,0,0.02),inset_0_1px_0_rgba(255,255,255,0.4)]"
        }`}
      >
        <div className="px-[32px] max-md:px-[20px] py-[14px] flex justify-between items-center">
          {/* Logo + divider + nav links grouped left */}
          <div className="flex items-center gap-0">
            <Link href="/" className="flex items-center gap-[10px] no-underline">
              <Image src="/logo-icon.svg" alt="" width={18} height={18} />
              <span className="font-mono text-[14px] font-bold tracking-[2px] uppercase text-[#1C1917]">
                VALIDUE
              </span>
            </Link>

            {/* Vertical divider */}
            <div className="hidden md:block w-[1px] h-[16px] bg-black/10 mx-[24px]" />

            <div className="hidden md:flex gap-[28px] items-center">
              <a href="#how" className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#A8A29E] hover:text-[#1C1917] transition-colors no-underline">HOW IT WORKS</a>
              <a href="#pricing" className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#A8A29E] hover:text-[#1C1917] transition-colors no-underline">PRICING</a>
              <a href="#respond" className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#A8A29E] hover:text-[#1C1917] transition-colors no-underline">EARN MONEY</a>
            </div>
          </div>

          {/* CTA buttons right */}
          <div className="flex gap-[12px] items-center">
            <a href="/auth/login" className="hidden md:inline-flex text-[#1C1917] text-[10px] font-mono font-bold tracking-widest uppercase transition-all duration-200 no-underline px-[16px] py-[10px] rounded-full border border-black/10 hover:border-[#1C1917] hover:bg-black/5">
              [ LOG IN ]
            </a>
            <a href="/auth/signup" className="px-[24px] py-[10px] rounded-full font-mono font-bold tracking-widest uppercase text-[10px] text-white bg-[#1C1917] hover:bg-white hover:text-[#1C1917] border border-transparent hover:border-[#1C1917] transition-all no-underline shadow-[0_2px_8px_rgba(229,101,78,0.2)] hover:shadow-[0_8px_24px_rgba(229,101,78,0.3)]">
              [ GET STARTED ]
            </a>
          </div>
        </div>
      </nav>
    </div>
  );
}
