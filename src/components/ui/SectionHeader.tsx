type Props = {
  label: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
};

export default function SectionHeader({ label, title, subtitle, align = "center" }: Props) {
  const isCenter = align === "center";
  return (
    <div className={isCenter ? "text-center" : ""}>
      <div className={`text-[13px] tracking-[2px] uppercase text-[#999999] font-medium mb-[16px]`}>
        {label}
      </div>
      <h2 className={`text-[clamp(32px,5vw,52px)] font-bold tracking-[-1.5px] leading-[1.1] max-w-[600px] text-[#111111] ${isCenter ? "mx-auto" : ""}`}>
        {title}
      </h2>
      {subtitle && (
        <p className={`text-[16px] text-[#555555] max-w-[500px] leading-[1.7] mt-[20px] ${isCenter ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
