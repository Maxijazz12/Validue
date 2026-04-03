import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export default function IdeasLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="bg-bg-muted rounded-2xl border border-border-light p-[24px_32px] max-md:p-[20px] mb-[24px]">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-[28px] w-[140px] mb-[8px]" />
            <Skeleton className="h-[14px] w-[280px]" />
          </div>
          <Skeleton className="h-[40px] w-[100px] rounded-xl" />
        </div>
      </div>

      {/* Search + filter skeleton */}
      <div className="flex items-center gap-[12px] mb-[16px]">
        <Skeleton className="h-[36px] flex-1 rounded-lg" />
        <Skeleton className="h-[36px] w-[240px] rounded-lg" />
      </div>

      {/* Cards skeleton */}
      <div className="flex flex-col gap-[12px]">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </>
  );
}
