"use client";

type DemographicItem = { label: string; count: number };

type DemographicsData = {
  industries: DemographicItem[];
  experienceLevels: DemographicItem[];
  ageRanges: DemographicItem[];
};

function DemographicGroup({ title, items }: { title: string; items: DemographicItem[] }) {
  if (items.length === 0) return null;
  const max = Math.max(items[0]?.count ?? 1, 1);

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[1px] text-text-muted mb-[8px] block">
        {title}
      </span>
      <div className="flex flex-col gap-[6px]">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-[8px]">
            <span className="text-[12px] text-text-secondary w-[120px] truncate shrink-0" title={item.label}>
              {item.label}
            </span>
            <div className="flex-1 h-[6px] rounded-full bg-bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-text-primary/20 transition-all duration-300"
                style={{ width: `${(item.count / max) * 100}%` }}
              />
            </div>
            <span className="font-mono text-[11px] text-text-muted w-[24px] text-right shrink-0">
              {item.count}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function RespondentDemographics({ data }: { data: DemographicsData }) {
  return (
    <div className="bg-white border border-border-light rounded-[20px] md:rounded-[28px] p-[20px] shadow-card">
      <h3 className="font-mono text-[11px] font-semibold uppercase tracking-[1px] text-text-muted mb-[16px]">
        Respondent Demographics
      </h3>
      <div className="flex flex-col gap-[20px]">
        <DemographicGroup title="Industry" items={data.industries} />
        <DemographicGroup title="Experience" items={data.experienceLevels} />
        <DemographicGroup title="Age" items={data.ageRanges} />
      </div>
    </div>
  );
}
