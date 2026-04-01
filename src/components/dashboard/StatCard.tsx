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
    <div className="stat-card-surface rounded-2xl p-[14px_16px] relative">
      <div className="flex items-start justify-between gap-[8px]">
        <span className="text-[10px] font-semibold text-[#1A1A1A]/35 uppercase tracking-[0.05em]">
          {label}
        </span>
        {sparkline && sparkline.length >= 2 && (
          <Sparkline data={sparkline} color={valueColor || "#E8C1B0"} />
        )}
      </div>
      <div className="flex items-baseline gap-[6px] mt-[2px]">
        <span
          className="font-mono text-[20px] font-semibold tracking-[-0.02em] tabular-nums"
          style={valueColor ? { color: valueColor } : { color: "#1A1A1A" }}
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
