import Skeleton, { SkeletonStatCard, SkeletonCard } from "@/components/ui/Skeleton";

export default function MyResponsesLoading() {
  return (
    <>
      <div className="mb-[24px]">
        <Skeleton className="h-[28px] w-[160px] mb-[8px]" />
        <Skeleton className="h-[14px] w-[240px]" />
      </div>
      <div className="grid grid-cols-2 gap-[12px] mb-[24px] max-md:grid-cols-1">
        <SkeletonStatCard />
        <SkeletonStatCard />
      </div>
      <div className="flex flex-col gap-[8px]">
        {[1, 2, 3, 4, 5].map((i) => (
          <SkeletonCard key={i} lines={1} />
        ))}
      </div>
    </>
  );
}
