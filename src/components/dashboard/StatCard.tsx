type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
};

export default function StatCard({ label, value, detail }: StatCardProps) {
  return (
    <div className="bg-white border border-[#ebebeb] rounded-xl p-[24px] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow">
      <div className="text-[12px] text-[#999999] uppercase tracking-[1.5px] font-medium mb-[8px]">
        {label}
      </div>
      <div className="font-mono text-[28px] font-bold text-[#111111]">
        {value}
      </div>
      {detail && (
        <div className="text-[13px] text-[#555555] mt-[4px]">{detail}</div>
      )}
    </div>
  );
}
