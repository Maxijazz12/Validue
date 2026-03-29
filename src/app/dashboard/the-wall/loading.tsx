import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export default function WallLoading() {
  return (
    <>
      {/* Header skeleton */}
      <div className="mb-[24px]">
        <Skeleton className="h-[32px] w-[200px] mb-[8px]" />
        <Skeleton className="h-[16px] w-[300px]" />
      </div>

      {/* Stats bar skeleton */}
      <div className="flex items-center gap-[16px] mb-[24px]">
        <Skeleton className="h-[36px] w-[100px] rounded-full" />
        <Skeleton className="h-[36px] w-[100px] rounded-full" />
        <Skeleton className="h-[36px] w-[100px] rounded-full" />
      </div>

      {/* Filter tabs skeleton */}
      <div className="flex gap-[8px] mb-[20px]">
        {["w-[120px]", "w-[140px]", "w-[100px]", "w-[160px]", "w-[110px]"].map((w, i) => (
          <Skeleton key={i} className={`h-[36px] rounded-lg ${w}`} />
        ))}
      </div>

      {/* Wall cards skeleton */}
      <div className="flex flex-col gap-[16px]">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonCard key={i} lines={4} />
        ))}
      </div>
    </>
  );
}
