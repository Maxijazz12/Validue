"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    let ticking = false;
    const handleScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        setScrolled(window.scrollY > 20);
        ticking = false;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 z-100">
      <nav
        className={`transition-all duration-500 ${
          scrolled
            ? "bg-white/80 backdrop-blur-xl shadow-[0_1px_0_rgba(0,0,0,0.04)]"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-[1200px] mx-auto px-6 h-[72px] flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 no-underline">
            <Image src="/logo-icon.svg" alt="" width={20} height={20} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-text-primary">
              Validue
            </span>
          </Link>

          {/* Center nav links */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#how" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              How it works
            </a>
            <a href="#pricing" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              Pricing
            </a>
            <a href="/for-founders" className="text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline">
              For Founders
            </a>
          </div>

          {/* Right CTA */}
          <div className="flex items-center gap-3">
            <a
              href="/auth/login"
              className="hidden md:inline-flex text-[14px] text-text-secondary hover:text-text-primary transition-colors no-underline px-4 py-2"
            >
              Log in
            </a>
            <a
              href="/auth/signup"
              className="inline-flex items-center px-5 py-2.5 rounded-full text-[14px] font-medium text-white bg-text-primary hover:bg-text-primary/90 transition-all no-underline shadow-sm hover:shadow-md"
            >
              Get started
            </a>
          </div>
        </div>
      </nav>
    </header>
  );
}
