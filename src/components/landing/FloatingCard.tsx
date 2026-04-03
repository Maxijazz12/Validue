type FloatingCardProps = {
  text: string;
  className?: string;
  accent?: "warm" | "blue" | "none";
};

export default function FloatingCard({ text, className = "", accent = "warm" }: FloatingCardProps) {
  return (
    <div
      className={`absolute flex items-center gap-[12px] bg-white/60 backdrop-blur-3xl rounded-[16px] px-[16px] py-[12px] shadow-card border border-white/80 will-change-transform ${className}`}
    >
      <div className={`w-[6px] h-[6px] rounded-full animate-pulse ${accent === 'blue' ? 'bg-[#1C1917]' : 'bg-[#E5654E]'}`} />
      <span className="font-mono text-[10px] tracking-widest text-[#1C1917] font-bold uppercase whitespace-nowrap">
        {text}
      </span>
    </div>
  );
}
