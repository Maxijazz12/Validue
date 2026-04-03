"use client";

import { useState, useEffect } from "react";
import {
  getCampaignAnalytics,
  type AnalyticsData,
} from "@/app/dashboard/ideas/[id]/analytics-actions";

function BarChart({
  data,
  labelKey,
  valueKey,
  color = "#E5654E",
  maxBars = 10,
}: {
  data: { [key: string]: string | number }[];
  labelKey: string;
  valueKey: string;
  color?: string;
  maxBars?: number;
}) {
  const items = data.slice(0, maxBars);
  const max = Math.max(...items.map((d) => Number(d[valueKey]) || 0), 1);

  return (
    <div className="flex flex-col gap-[6px]">
      {items.map((d, i) => {
        const value = Number(d[valueKey]) || 0;
        const pct = (value / max) * 100;
        return (
          <div key={i} className="flex items-center gap-[8px]">
            <span className="text-[11px] text-text-secondary w-[60px] shrink-0 truncate text-right">
              {d[labelKey]}
            </span>
            <div className="flex-1 h-[16px] rounded bg-bg-muted overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{ width: `${pct}%`, backgroundColor: color }}
              />
            </div>
            <span className="text-[11px] font-mono font-semibold text-text-primary w-[24px] text-right">
              {value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function ResponseTimeline({
  data,
}: {
  data: { date: string; count: number }[];
}) {
  if (data.length === 0) return null;
  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-[3px] h-[80px]">
      {data.map((d, i) => {
        const pct = (d.count / max) * 100;
        return (
          <div key={i} className="flex-1 flex flex-col items-center justify-end h-full group relative">
            <div
              className="w-full rounded-t bg-brand/70 hover:bg-brand transition-colors min-h-[2px]"
              style={{ height: `${Math.max(pct, 3)}%` }}
            />
            <div className="absolute -top-[24px] left-1/2 -translate-x-1/2 px-[6px] py-[2px] rounded bg-accent text-white text-[10px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              {d.date.slice(5)}: {d.count}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function DemographicPills({
  items,
}: {
  items: { label: string; count: number }[];
}) {
  if (items.length === 0) {
    return <span className="text-[12px] text-slate">No data</span>;
  }
  return (
    <div className="flex flex-wrap gap-[6px]">
      {items.map((item) => (
        <span
          key={item.label}
          className="text-[11px] px-[8px] py-[3px] rounded-full bg-bg-muted text-text-secondary"
        >
          {item.label}
          <span className="ml-[4px] font-mono font-semibold text-text-primary">
            {item.count}
          </span>
        </span>
      ))}
    </div>
  );
}

export default function CampaignAnalytics({
  campaignId,
}: {
  campaignId: string;
}) {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    getCampaignAnalytics(campaignId)
      .then(setData)
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="bg-white/90 border border-border-light rounded-[24px] p-[32px]">
        <div className="flex items-center gap-[8px]">
          <div className="w-[5px] h-[5px] bg-accent/50 rounded-full animate-pulse" />
          <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">Loading telemetry...</span>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const hasScores = data.scoreDistribution.some((d) => d.count > 0);

  return (
    <div className="bg-white border border-border-light shadow-card rounded-[24px] overflow-hidden transition-all duration-400">
      {/* Header — always visible */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-[24px_32px] max-md:p-[20px] text-left cursor-pointer hover:bg-white/40 transition-colors bg-transparent border-none"
      >
        <div className="flex items-center gap-[10px]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 20h.01" /><path d="M7 20v-4" /><path d="M12 20v-8" /><path d="M17 20V8" /><path d="M22 4v16" />
          </svg>
          <h2 className="text-[16px] font-semibold text-text-primary">Analytics</h2>
        </div>
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#999999"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-white/40 p-[24px_32px] max-md:p-[20px]">
          {/* Quick stats */}
          <div className="grid grid-cols-2 gap-[16px] mb-[32px]">
            <div className="p-[20px] rounded-[16px] bg-white/40 border border-border-light shadow-sm relative overflow-hidden">
              <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                Avg time/rep
              </span>
              <div className="font-mono text-[24px] font-bold text-text-primary mt-[4px]">
                {data.avgTimePerResponse > 0 ? `${data.avgTimePerResponse}s` : "—"}
              </div>
            </div>
            <div className="p-[20px] rounded-[16px] bg-white/40 border border-border-light shadow-sm relative overflow-hidden">
              <span className="font-mono text-[11px] text-text-muted uppercase tracking-widest">
                Pattern matches
              </span>
              <div className={`font-mono text-[24px] font-bold mt-[4px] ${data.totalPasteDetected > 0 ? "text-brand" : "text-text-primary"}`}>
                {data.totalPasteDetected}
              </div>
            </div>
          </div>

          {/* Response timeline */}
          {data.responsesByDay.length > 1 && (
            <div className="mb-[24px]">
              <h3 className="text-[13px] font-semibold text-text-secondary mb-[12px]">
                Responses over time
              </h3>
              <ResponseTimeline data={data.responsesByDay} />
              <div className="flex items-center justify-between mt-[4px]">
                <span className="text-[10px] text-border-muted">
                  {data.responsesByDay[0].date.slice(5)}
                </span>
                <span className="text-[10px] text-border-muted">
                  {data.responsesByDay[data.responsesByDay.length - 1].date.slice(5)}
                </span>
              </div>
            </div>
          )}

          {/* Score distribution */}
          {hasScores && (
            <div className="mb-[24px]">
              <h3 className="text-[13px] font-semibold text-text-secondary mb-[12px]">
                Quality score distribution
              </h3>
              <BarChart
                data={data.scoreDistribution}
                labelKey="bucket"
                valueKey="count"
                color="#22c55e"
              />
            </div>
          )}

          {/* Respondent demographics */}
          <div className="mb-[24px]">
            <h3 className="text-[13px] font-semibold text-text-secondary mb-[12px]">
              Respondent interests
            </h3>
            <DemographicPills items={data.respondentDemographics.interests} />
          </div>

          <div className="mb-[24px]">
            <h3 className="text-[13px] font-semibold text-text-secondary mb-[12px]">
              Respondent expertise
            </h3>
            <DemographicPills items={data.respondentDemographics.expertise} />
          </div>

          <div>
            <h3 className="text-[13px] font-semibold text-text-secondary mb-[12px]">
              Reputation tiers
            </h3>
            <DemographicPills items={data.respondentDemographics.tiers} />
          </div>
        </div>
      )}
    </div>
  );
}
