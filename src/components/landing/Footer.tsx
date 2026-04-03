import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/5 py-[48px] flex justify-between items-start max-md:flex-col max-md:items-center max-md:gap-[32px] max-md:text-center mt-[48px]">
      {/* Left: Brand */}
      <div>
        <div className="flex items-center gap-[12px] max-md:justify-center">
          <Image src="/logo-icon.svg" alt="" width={18} height={18} className="brightness-0 invert" />
          <span className="font-mono text-[14px] text-white font-bold tracking-[2px] uppercase">
            VALIDUE
          </span>
        </div>
        <p className="font-mono text-[10px] text-[#78716C] mt-[16px] uppercase tracking-widest">
          {"// "}SYS.INTEGRITY.VERIFIED
        </p>

        <p className="font-mono text-[9px] text-white/20 mt-[12px] uppercase">
          &copy; 2026 VALIDUE_INC
        </p>
      </div>

      {/* Right: Link groups */}
      <div className="flex gap-[64px] max-md:gap-[40px]">
        <div>
          <div className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest font-bold mb-[16px]">
            [ REGISTRY_NODES ]
          </div>
          <div className="flex flex-col gap-[12px]">
            {[
              { label: "FOR_FOUNDERS", href: "/for-founders" },
              { label: "ALLOCATION_MATRIX", href: "/pricing" },
              { label: "EARN_YIELD", href: "/earn" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[11px] text-[#A8A29E] no-underline hover:text-white transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div>
          <div className="font-mono text-[9px] text-[#78716C] uppercase tracking-widest font-bold mb-[16px]">
            [ ROOT_SYS ]
          </div>
          <div className="flex flex-col gap-[12px]">
            {[
              { label: "PROTOCOL_TERMS", href: "/terms" },
              { label: "DATA_PRIVACY", href: "/privacy" },
              { label: "X_STREAM", href: "#" },
              { label: "DISCORD_RELAY", href: "#" },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="font-mono text-[11px] text-[#A8A29E] no-underline hover:text-white transition-colors"
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
