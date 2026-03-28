import SectionHeader from "@/components/ui/SectionHeader";

export default function AvailableIdeasPage() {
  return (
    <>
      <div className="mb-[32px]">
        <SectionHeader size="page" label="Available Ideas" title="Available Ideas" subtitle="Browse ideas looking for feedback" />
      </div>
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[48px] text-center">
        <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-[#E8C1B0]/10 to-[#E5654E]/5 flex items-center justify-center mx-auto mb-[16px]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
        </div>
        <h2 className="text-[20px] font-bold text-[#111111] mb-[8px]">
          Coming soon
        </h2>
        <p className="text-[14px] text-[#64748B] max-w-[360px] mx-auto">
          Discover ideas from founders and provide your valuable feedback.
        </p>
      </div>
    </>
  );
}
