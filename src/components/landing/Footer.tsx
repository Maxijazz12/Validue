import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-[#3D3830]/60 py-[48px] flex justify-between items-start max-md:flex-col max-md:items-center max-md:gap-[32px] max-md:text-center">
      {/* Left: Brand */}
      <div>
        <div className="flex items-center gap-[8px] max-md:justify-center">
          <Image src="/logo-icon.svg" alt="" width={18} height={18} className="brightness-0 invert" />
          <span className="text-[16px] text-white font-semibold">
            Validue
          </span>
        </div>
        <p className="text-[13px] text-[#78716C] mt-[8px]">
          Where ideas meet their audience.
        </p>
        <p className="text-[12px] text-[#57534E] mt-[12px]">
          &copy; 2026 Validue
        </p>
      </div>

      {/* Right: Link groups */}
      <div className="flex gap-[64px] max-md:gap-[40px]">
        <div>
          <div className="text-[11px] text-[#78716C] uppercase tracking-[0.08em] font-medium mb-[12px]">
            Product
          </div>
          <div className="flex flex-col gap-[8px]">
            {[
              { label: "The Wall", href: "/dashboard/the-wall" },
              { label: "Pricing", href: "#pricing" },
              { label: "Earn Money", href: "#respond" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] text-[#A8A29E] no-underline hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="text-[11px] text-[#78716C] uppercase tracking-[0.08em] font-medium mb-[12px]">
            Company
          </div>
          <div className="flex flex-col gap-[8px]">
            {[
              { label: "Terms", href: "#" },
              { label: "Privacy", href: "#" },
              { label: "Twitter", href: "#" },
              { label: "Discord", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[14px] text-[#A8A29E] no-underline hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
