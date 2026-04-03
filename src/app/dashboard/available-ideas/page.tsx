import SectionHeader from "@/components/ui/SectionHeader";

export default function AvailableIdeasPage() {
  return (
    <>
      <div className="mb-[32px]">
        <SectionHeader size="page" label="Available Ideas" title="Available Ideas" subtitle="Browse ideas looking for feedback" />
      </div>
      <div className="py-[120px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Coming Soon</span>
        <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">
          Ideas marketplace
        </p>
        <p className="text-[14px] text-text-secondary mt-[4px] max-w-[360px] mx-auto">
          Discover ideas from founders and provide your valuable feedback.
        </p>
      </div>
    </>
  );
}
