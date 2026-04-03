import Skeleton, { SkeletonCard } from "@/components/ui/Skeleton";

export default function SettingsLoading() {
  return (
    <>
      <div className="mb-[24px]">
        <Skeleton className="h-[28px] w-[120px] mb-[8px]" />
        <Skeleton className="h-[14px] w-[220px]" />
      </div>
      <div className="flex flex-col gap-[16px]">
        <SkeletonCard lines={3} />
        <SkeletonCard lines={2} />
        <SkeletonCard lines={2} />
      </div>
    </>
  );
}
