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
          label="Quality Over Quantity"
          title="Better answers rise to the top"
          subtitle="Founders see their best insights first. Respondents earn more by being thoughtful. Good work pays - literally."
          align="left"
        />
        <div className="mt-[36px] flex flex-col gap-[16px]">
          {qualityBullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-[12px]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#D4A088]" />
              <span className="text-[14px] text-[#78716C]">{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Mock response cards */}
      <div className="bg-[#F7F4F1] border border-[#EDE8E3] rounded-2xl p-[32px] relative overflow-hidden">
        {mockResponses.map((resp) => (
          <div
            key={resp.name}
            className={`p-[20px] border rounded-xl mb-[12px] last:mb-0 transition-all duration-200 ${
              resp.isTop
                ? "border-[#DDD6CE] bg-white shadow-[0_4px_16px_rgba(180,140,110,0.10),0_2px_4px_rgba(0,0,0,0.03)]"
                : "border-[#EDE8E3] bg-white"
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
                <div className="text-[10px] font-medium tracking-[1px] uppercase text-gradient-warm">
                  Top Insight
                </div>
              )}
            </div>
            <div className="text-[13px] text-[#78716C] leading-[1.6]">
              {resp.text}
            </div>
            <div className="flex justify-between items-center mt-[12px] pt-[12px] border-t border-[#EDE8E3]">
              <div className="text-[11px] tracking-[2px] text-gradient-warm">
                {"★".repeat(resp.stars)}
              </div>
              <div className="font-mono text-[12px] text-[#A8A29E] font-medium">
                {resp.amount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
