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
      <div className={`text-[11px] tracking-[0.08em] uppercase font-medium ${isPage ? "mb-[12px]" : "mb-[16px]"} text-gradient-warm`}>
        {label}
      </div>
      {isPage ? (
        <h1 className="text-[24px] font-medium tracking-tight text-text-primary">
          {title}
        </h1>
      ) : (
        <h2 className={`text-[clamp(30px,4.5vw,46px)] font-bold tracking-[-0.02em] leading-[1.1] max-w-[600px] text-text-primary ${isCenter ? "mx-auto" : ""}`}>
          {title}
        </h2>
      )}
      {subtitle && (
        <p className={`${isPage ? "text-[14px]" : "text-[16px] max-w-[500px]"} text-text-secondary leading-[1.7] ${isPage ? "mt-[4px]" : "mt-[20px]"} ${isCenter ? "mx-auto" : ""}`}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
