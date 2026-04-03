import SectionHeader from "@/components/ui/SectionHeader";
import Avatar from "@/components/ui/Avatar";
import { qualityBullets, mockResponses } from "@/lib/constants";

export default function QualityFeature() {
  return (
    <section
      id="respond"
      className="grid grid-cols-2 gap-[80px] items-center max-md:grid-cols-1 max-md:gap-[48px]"
    >
      {/* Left: Copy */}
      <div>
        <SectionHeader
          label="INTEGRITY_CHECK"
          title="Yield correlates to quality"
          subtitle="Architects review pristine data streams. Nodes generating high-fidelity inputs map to higher monetary compensation."
          align="left"
        />
        <div className="mt-[36px] flex flex-col gap-[16px]">
          {qualityBullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-[12px]">
              <span className="font-mono text-[9px] text-[#A8A29E] font-bold">[{bullet.slice(0, 1)}]</span>
              <span className="text-[14px] text-[#A8A29E] tracking-tight">{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Mock response cards */}
      <div className="bg-white/60 backdrop-blur-3xl border border-white/80 shadow-card rounded-[24px] p-[32px] relative overflow-hidden">
        {mockResponses.map((resp) => (
          <div
            key={resp.name}
            className={`p-[20px] border rounded-[16px] mb-[12px] last:mb-0 transition-all duration-200 ${
              resp.isTop
                ? "border-black/5 bg-white/70 shadow-[0_8px_24px_rgba(0,0,0,0.04)]"
                : "border-transparent bg-white/30"
            }`}
          >
            <div className="flex justify-between items-center mb-[10px]">
              <div className="flex items-center gap-[10px]">
                <Avatar name={resp.name} size={20} />
                <div>
                  <div className="text-[13px] font-medium text-[#1C1917]">
                    {resp.name}
                  </div>
                  <div className="text-[11px] text-[#A8A29E]">{resp.role}</div>
                </div>
              </div>
              {resp.isTop && (
                <div className="font-mono text-[9px] font-bold tracking-widest uppercase text-[#1C1917] bg-black/5 px-2 py-1 rounded-md">
                  [ HIGH_FIDELITY ]
                </div>
              )}
            </div>
            <div className="text-[13px] text-[#A8A29E] leading-[1.6]">
              {resp.text}
            </div>
            <div className="flex justify-between items-center mt-[12px] pt-[12px] border-t border-black/5">
              <div className="font-mono text-[9px] font-bold tracking-widest text-[#1C1917]">
                [ RATING: {resp.stars}/5 ]
              </div>
              <div className="font-mono text-[11px] text-[#1C1917] font-bold">
                {resp.amount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
