import Skeleton, { SkeletonCard, SkeletonStatCard } from "@/components/ui/Skeleton";

export default function ResponsesLoading() {
  return (
    <>
      {/* Back link */}
      <Skeleton className="h-[14px] w-[100px] mb-[16px]" />

      {/* Header */}
      <div className="bg-bg-muted rounded-2xl border border-border-light p-[24px_32px] max-md:p-[20px] mb-[24px]">
        <Skeleton className="h-[28px] w-[160px] mb-[8px]" />
        <Skeleton className="h-[14px] w-[240px]" />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <SkeletonStatCard key={i} />
        ))}
      </div>

      {/* Response cards */}
      <div className="flex flex-col gap-[12px]">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} lines={2} />
        ))}
      </div>
    </>
  );
}
