import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "For Founders", href: "/for-founders" },
    { label: "Pricing", href: "/pricing" },
    { label: "Earn as Respondent", href: "/earn" },
  ],
  Company: [
    { label: "Terms", href: "/terms" },
    { label: "Privacy", href: "/privacy" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-white/10 pt-12 pb-8 mt-16">
      <div className="flex justify-between items-start max-md:flex-col max-md:items-center max-md:gap-10 max-md:text-center">
        {/* Left: Brand */}
        <div>
          <div className="flex items-center gap-2.5 max-md:justify-center">
            <Image src="/logo-icon.svg" alt="" width={18} height={18} className="brightness-0 invert" />
            <span className="text-[15px] font-semibold text-white">
              Validue
            </span>
          </div>
          <p className="text-[13px] text-white/40 mt-3 max-w-[260px]">
            Pressure-test assumptions with real evidence before you build.
          </p>
        </div>

        {/* Right: Link groups */}
        <div className="flex gap-16 max-md:gap-10">
          {Object.entries(footerLinks).map(([group, links]) => (
            <div key={group}>
              <div className="text-[13px] font-medium text-white/30 mb-4">
                {group}
              </div>
              <div className="flex flex-col gap-3">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="text-[14px] text-white/60 hover:text-white transition-colors no-underline"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 pt-6 border-t border-white/5 text-center">
        <p className="text-[13px] text-white/25">
          &copy; {new Date().getFullYear()} Validue. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
