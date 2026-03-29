import Skeleton, { SkeletonStatCard, SkeletonCard } from "@/components/ui/Skeleton";

export default function EarningsLoading() {
  return (
    <>
      {/* Header */}
      <div className="mb-[24px]">
        <Skeleton className="h-[28px] w-[120px] mb-[8px]" />
        <Skeleton className="h-[14px] w-[200px]" />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-[12px] mb-[24px]">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>

      {/* Payout list */}
      <div className="flex flex-col gap-[12px]">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    </>
  );
}
