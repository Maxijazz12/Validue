import SectionHeader from "@/components/ui/SectionHeader";
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
          title="Every response is ranked"
          subtitle="Entrepreneurs see their best insights first. Respondents earn more by being thoughtful. The incentives are aligned — finally."
          align="left"
        />
        <div className="mt-[36px] flex flex-col gap-[16px]">
          {qualityBullets.map((bullet) => (
            <div key={bullet} className="flex items-center gap-[12px]">
              <span className="w-[5px] h-[5px] rounded-full bg-[#e8b87a]" />
              <span className="text-[14px] text-[#555555]">{bullet}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right: Mock response cards */}
      <div className="bg-[#fafafa] border border-[#ebebeb] rounded-xl p-[32px] relative overflow-hidden">
        {mockResponses.map((resp) => (
          <div
            key={resp.name}
            className={`p-[20px] border rounded-lg mb-[12px] last:mb-0 transition-colors ${
              resp.isTop
                ? "border-[#e8b87a]/25 bg-white shadow-[0_1px_8px_rgba(0,0,0,0.04)]"
                : "border-[#ebebeb] bg-white"
            }`}
          >
            <div className="flex justify-between items-center mb-[10px]">
              <div className="flex items-center gap-[10px]">
                <div
                  className="w-[32px] h-[32px] rounded-full"
                  style={{ background: resp.color }}
                />
                <div>
                  <div className="text-[13px] font-medium text-[#111111]">
                    {resp.name}
                  </div>
                  <div className="text-[11px] text-[#999999]">{resp.role}</div>
                </div>
              </div>
              {resp.isTop && (
                <div className="text-[10px] text-[#e8b87a] font-semibold tracking-[1px] uppercase">
                  Top Insight
                </div>
              )}
            </div>
            <div className="text-[13px] text-[#555555] leading-[1.6]">
              {resp.text}
            </div>
            <div className="flex justify-between items-center mt-[12px] pt-[12px] border-t border-[#ebebeb]">
              <div className="text-[#e8b87a] text-[12px] tracking-[2px]">
                {"★".repeat(resp.stars)}
              </div>
              <div className="font-mono text-[13px] text-[#111111] font-bold">
                {resp.amount}
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
