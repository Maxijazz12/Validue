"use client";

type FunnelBucketRow = {
  bucket: string;
  shown: number;
  started: number;
  submitted: number;
  qualified: number;
  paid: number;
};

const BUCKET_COLORS: Record<string, string> = {
  core: "#22c55e",
  adjacent: "#E5654E",
  off_target: "#999999",
  unknown: "#cccccc",
};

const BUCKET_LABELS: Record<string, string> = {
  core: "Core fit",
  adjacent: "Adjacent",
  off_target: "Off-target",
  unknown: "Unknown",
};

const STAGES = ["shown", "started", "submitted", "qualified", "paid"] as const;
type Stage = (typeof STAGES)[number];

export default function AudienceFunnel({ data }: { data: FunnelBucketRow[] }) {
  // Compute totals per stage across all buckets
  const totals: Record<Stage, number> = { shown: 0, started: 0, submitted: 0, qualified: 0, paid: 0 };
  for (const row of data) {
    for (const stage of STAGES) {
      totals[stage] += row[stage];
    }
  }

  const maxTotal = Math.max(totals.shown, 1);

  return (
    <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-text-muted mb-[16px]">
        Audience Funnel
      </h3>

      <div className="flex flex-col gap-[10px]">
        {STAGES.map((stage, i) => {
          const total = totals[stage];
          const prevTotal = i > 0 ? totals[STAGES[i - 1]] : 0;
          const conversionRate = i > 0 && prevTotal > 0
            ? Math.round((total / prevTotal) * 100)
            : null;

          return (
            <div key={stage}>
              <div className="flex items-center justify-between mb-[4px]">
                <span className="text-[12px] font-medium text-text-secondary capitalize">
                  {stage}
                </span>
                <div className="flex items-center gap-[8px]">
                  <span className="font-mono text-[13px] font-bold text-text-primary">
                    {total}
                  </span>
                  {conversionRate !== null && (
                    <span className="text-[11px] text-text-muted">
                      {conversionRate}%
                    </span>
                  )}
                </div>
              </div>
              {/* Stacked bar */}
              <div className="flex h-[8px] rounded-full overflow-hidden bg-bg-muted">
                {data.map((row) => {
                  const value = row[stage];
                  if (value <= 0) return null;
                  const width = (value / maxTotal) * 100;
                  return (
                    <div
                      key={row.bucket}
                      className="h-full transition-all duration-300"
                      style={{
                        width: `${width}%`,
                        backgroundColor: BUCKET_COLORS[row.bucket] ?? BUCKET_COLORS.unknown,
                      }}
                      title={`${BUCKET_LABELS[row.bucket] ?? row.bucket}: ${value}`}
                    />
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-[16px] mt-[16px]">
        {data.filter((r) => r.shown > 0).map((row) => (
          <div key={row.bucket} className="flex items-center gap-[4px]">
            <span
              className="w-[8px] h-[8px] rounded-full inline-block"
              style={{ backgroundColor: BUCKET_COLORS[row.bucket] ?? BUCKET_COLORS.unknown }}
            />
            <span className="text-[11px] text-text-muted">
              {BUCKET_LABELS[row.bucket] ?? row.bucket}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
