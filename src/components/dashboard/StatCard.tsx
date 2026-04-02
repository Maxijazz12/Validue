type StatCardProps = {
  label: string;
  value: string | number;
  detail?: string;
  valueColor?: string;
  progress?: number;
  children?: React.ReactNode;
  trend?: { direction: "up" | "down" | "flat"; label: string };
  sparkline?: number[];
};

/* ─── Mini sparkline SVG ─── */

function Sparkline({ data, color = "#E8C1B0" }: { data: number[]; color?: string }) {
  if (data.length < 2) return null;
  const width = 64;
  const height = 20;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * (height - 4) - 2;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={width} height={height} className="opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ─── Trend arrow ─── */

function TrendIndicator({ direction, label }: { direction: "up" | "down" | "flat"; label: string }) {
  const color = direction === "up" ? "#22c55e" : direction === "down" ? "#E5654E" : "#A1A1AA";
  return (
    <span className="inline-flex items-center gap-[2px] text-[10px] font-semibold tabular-nums" style={{ color }}>
      {direction === "up" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )}
      {direction === "down" && (
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )}
      {direction === "flat" && "—"}
      {label}
    </span>
  );
}

export default function StatCard({ label, value, detail, valueColor, progress, children, trend, sparkline }: StatCardProps) {
  return (
    <div className="flex flex-col w-full bg-white/60 backdrop-blur-3xl border border-white/80 shadow-[0_8px_32px_rgba(0,0,0,0.04),inset_0_1px_0_rgba(255,255,255,0.8)] rounded-[24px] p-[20px] transition-all duration-400 relative overflow-hidden group hover:shadow-[0_12px_48px_rgba(0,0,0,0.06),inset_0_1px_0_rgba(255,255,255,1)]">
      <div className="flex items-start justify-between gap-[8px]">
        <span className="text-[10px] font-semibold text-[#1A1A1A]/35 uppercase tracking-[0.05em]">
          {label}
        </span>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} color={valueColor || "#E8C1B0"} />
        )}
      </div>
      <div className="flex items-baseline gap-[6px] mt-[6px]">
        <span
          className="font-mono text-[28px] font-bold tracking-tight"
          style={valueColor ? { color: valueColor } : { color: "#1C1917" }}
        >
          {value}
        </span>
        {trend && <TrendIndicator direction={trend.direction} label={trend.label} />}
      </div>
      {children}
      {progress !== undefined && (
        <div className="h-[2px] rounded-full bg-[#1A1A1A]/[0.04] overflow-hidden mt-[8px]">
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{
              width: `${Math.min(progress, 100)}%`,
              background: progress >= 80 ? "#22c55e" : "#E8C1B0",
            }}
          />
        </div>
      )}
      {detail && (
        <div className="text-[11px] text-[#1A1A1A]/35 mt-[4px]">{detail}</div>
      )}
    </div>
  );
}
