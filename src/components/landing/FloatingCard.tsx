type FloatingCardProps = {
  text: string;
  color: string;
  className?: string;
};

export default function FloatingCard({ text, color, className = "" }: FloatingCardProps) {
  return (
    <div
      className={`absolute flex items-center gap-[10px] bg-white border border-[#ebebeb] rounded-xl px-[14px] py-[10px] shadow-[0_4px_20px_rgba(0,0,0,0.06)] will-change-transform ${className}`}
    >
      <div
        className="w-[28px] h-[28px] rounded-full shrink-0"
        style={{ background: color }}
      />
      <span className="text-[12px] text-[#555555] whitespace-nowrap font-medium">
        {text}
      </span>
    </div>
  );
}
