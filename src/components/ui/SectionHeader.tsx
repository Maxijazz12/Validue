type Props = {
  label: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
  size?: "section" | "page";
};

export default function SectionHeader({ label, title, subtitle, align, size = "section" }: Props) {
  const isPage = size === "page";
  const effectiveAlign = align ?? (isPage ? "left" : "center");
  const isCenter = effectiveAlign === "center";

  return (
    <div className={isCenter ? "text-center" : ""}>
      <div className={`text-[12px] tracking-[0.06em] uppercase font-medium ${isPage ? "mb-[12px]" : "mb-[16px]"} text-gradient-warm`}>
        {label}
      </div>
      {isPage ? (
        <h1 className="text-[28px] font-bold tracking-[-0.5px] text-[#222222]">
          {title}
        </h1>
      ) : (
        <h2 className={`text-[clamp(30px,4.5vw,46px)] font-bold tracking-[-0.02em] leading-[1.1] max-w-[600px] text-[#222222] ${isCenter ? "mx-auto" : ""}`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`${isPage ? "text-[15px]" : "text-[16px] max-w-[500px]"} text-[#64748B] leading-[1.7] ${isPage ? "mt-[4px]" : "mt-[20px]"} ${isCenter ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
