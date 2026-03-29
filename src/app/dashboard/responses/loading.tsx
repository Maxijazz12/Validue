import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export default function ResponsesOverviewLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="mb-[32px]">
        <Skeleton className="h-[10px] w-[100px] mb-[8px]" />
        <Skeleton className="h-[28px] w-[160px] mb-[4px]" />
        <Skeleton className="h-[14px] w-[220px]" />
      </div>

      {/* Search + filter skeleton */}
      <div className="flex items-center gap-[12px] mb-[16px]">
        <Skeleton className="h-[36px] flex-1 rounded-lg" />
        <Skeleton className="h-[36px] w-[200px] rounded-lg" />
      </div>

      {/* Cards skeleton */}
      <div className="flex flex-col gap-[12px]">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </>
  );
}
