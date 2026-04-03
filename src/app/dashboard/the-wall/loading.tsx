export default function WallLoading() {
  return (
    <div className="min-h-[100dvh] pb-12">
      {/* Tab bar skeleton */}
      <div className="w-full pt-[24px] pb-[16px] px-5 flex justify-center">
        <div className="flex bg-white overflow-hidden p-[6px] rounded-full border border-border-light/60 shadow-card-sm">
          {["For You", "New", "Saved"].map((label) => (
            <div
              key={label}
              className={`px-[24px] py-[10px] rounded-full text-[12px] font-medium uppercase tracking-wide ${
                label === "For You"
                  ? "text-white bg-accent"
                  : "text-text-muted"
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* Card grid skeleton */}
      <div className="max-w-7xl mx-auto px-5 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px] auto-rows-min">
          {/* Featured card */}
          <div className="md:col-span-2 lg:col-span-2">
            <div className="rounded-[28px] border border-border-light/40 bg-white/60 p-[28px] flex flex-col gap-[16px]">
              <div className="flex items-center justify-between">
                <div className="skeleton-warm h-[22px] w-[80px]" />
                <div className="skeleton-warm h-[16px] w-[48px]" />
              </div>
              <div className="skeleton-warm h-[24px] w-[75%]" />
              <div className="flex gap-[6px]">
                <div className="skeleton-warm h-[28px] w-[72px] rounded-md" />
                <div className="skeleton-warm h-[28px] w-[64px] rounded-md" />
                <div className="skeleton-warm h-[28px] w-[80px] rounded-md" />
              </div>
              <div className="pt-[32px]">
                <div className="flex justify-between mb-[8px]">
                  <div className="skeleton-warm h-[12px] w-[60px]" />
                  <div className="skeleton-warm h-[12px] w-[40px]" />
                </div>
                <div className="skeleton-warm h-[3px] w-full mb-[20px]" />
                <div className="flex justify-between">
                  <div className="skeleton-warm h-[28px] w-[56px] rounded-full" />
                  <div className="skeleton-warm h-[14px] w-[80px]" />
                </div>
              </div>
            </div>
          </div>

          {/* Standard cards — varied heights to match real feed */}
          {[
            { titleW: "85%", hasSubtitle: true, options: 2, progressW: "45%" },
            { titleW: "70%", hasSubtitle: false, options: 3, progressW: "72%" },
            { titleW: "90%", hasSubtitle: true, options: 0, progressW: "20%" },
            { titleW: "65%", hasSubtitle: false, options: 2, progressW: "88%" },
            { titleW: "80%", hasSubtitle: true, options: 3, progressW: "55%" },
          ].map((card, i) => (
            <div key={i} className="col-span-1">
              <div className="rounded-[28px] border border-border-light/40 bg-white/60 p-[28px] flex flex-col gap-[16px]">
                <div className="flex items-center justify-between">
                  {/* Match badge vs category pill — alternate */}
                  <div className={`skeleton-warm h-[22px] rounded-md ${i % 3 === 0 ? "w-[88px]" : "w-[64px]"}`} />
                  {i % 2 === 0 && <div className="skeleton-warm h-[16px] w-[44px]" />}
                </div>
                <div className="skeleton-warm h-[20px]" style={{ width: card.titleW }} />
                {card.hasSubtitle && <div className="skeleton-warm h-[20px] w-[55%]" />}
                {card.options > 0 && (
                  <div className="flex gap-[6px] pt-[4px]">
                    {Array.from({ length: card.options }).map((_, j) => (
                      <div key={j} className="skeleton-warm h-[28px] rounded-md" style={{ width: `${56 + j * 12}px` }} />
                    ))}
                  </div>
                )}
                <div className="pt-[32px]">
                  <div className="flex justify-between mb-[8px]">
                    <div className="skeleton-warm h-[12px] w-[56px]" />
                    <div className="skeleton-warm h-[12px] w-[36px]" />
                  </div>
                  <div className="h-[3px] w-full bg-bg-muted overflow-hidden mb-[20px]">
                    <div className="skeleton-warm h-full" style={{ width: card.progressW }} />
                  </div>
                  <div className="flex justify-between">
                    <div className="skeleton-warm h-[28px] w-[48px] rounded-full" />
                    <div className="skeleton-warm h-[14px] w-[72px]" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
