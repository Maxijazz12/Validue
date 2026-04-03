import Skeleton, { SkeletonStatCard } from "@/components/ui/Skeleton";

export default function CampaignDetailLoading() {
  return (
    <>
      {/* Back link + title */}
      <div className="mb-[24px]">
        <Skeleton className="h-[14px] w-[120px] mb-[16px]" />
        <Skeleton className="h-[28px] w-[60%] mb-[8px]" />
        <Skeleton className="h-[14px] w-[40%]" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Signal dashboard skeleton */}
      <div className="bg-white border border-border-light rounded-2xl p-[32px] mb-[24px]">
        <Skeleton className="h-[18px] w-[180px] mb-[16px]" />
        <div className="flex flex-col gap-[16px]">
          {[1, 2, 3].map((i) => (
            <div key={i} className="border border-bg-muted rounded-xl p-[16px]">
              <Skeleton className="h-[14px] w-[80%] mb-[10px]" />
              <Skeleton className="h-[4px] w-full mb-[8px]" />
              <Skeleton className="h-[12px] w-[200px]" />
            </div>
          ))}
        </div>
      </div>

      {/* Questions skeleton */}
      <div className="bg-white border border-border-light rounded-2xl p-[32px]">
        <Skeleton className="h-[18px] w-[160px] mb-[20px]" />
        <div className="flex flex-col gap-[12px]">
          {["w-[80%]", "w-[70%]", "w-[60%]", "w-[50%]"].map((w, i) => (
            <Skeleton key={i} className={`h-[14px] ${w}`} />
          ))}
        </div>
      </div>
    </>
  );
}
