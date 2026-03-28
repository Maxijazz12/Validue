type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  valueColor?: string;
  progress?: number;
  children?: React.ReactNode;
};

export default function StatCard({ label, value, detail, valueColor, progress, children }: StatCardProps) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px] hover:border-[#CBD5E1] transition-all duration-200 relative overflow-hidden">
      <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#E8C1B0]/20 to-transparent" />
      <span className="text-[11px] text-[#94A3B8] uppercase tracking-[1px] font-semibold">
        {label}
      </span>
      <div
        className="font-mono text-[22px] font-bold mt-[4px]"
        style={valueColor ? { color: valueColor } : undefined}
      >
        {value}
      </div>
      {children}
      {progress !== undefined && (
        <div className="h-[4px] rounded-full bg-[#F1F5F9] overflow-hidden mt-[8px]">
          <div
            className="h-full rounded-full bg-[#34D399]"
            style={{ width: `${Math.min(progress, 100)}%` }}
          />
        </div>
      )}
      {detail && (
        <div className="text-[13px] text-[#64748B] mt-[6px]">{detail}</div>
      )}
    </div>
  );
}
