type SkeletonProps = {
  className?: string;
  warm?: boolean;
};

export default function Skeleton({ className = "", warm = false }: SkeletonProps) {
  return (
    <div
      className={`${warm ? "skeleton-warm" : "bg-[#E2E8F0]/50 rounded-lg animate-pulse"} ${className}`}
    />
  );
}

export function SkeletonCard({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[20px]">
      <div className="flex items-center justify-between mb-[12px]">
        <Skeleton className="h-[18px] w-[60%]" />
        <Skeleton className="h-[24px] w-[80px] rounded-full" />
      </div>
      <Skeleton className="h-[4px] w-full mb-[12px]" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={`h-[12px] mb-[8px] ${i === lines - 1 ? "w-[40%]" : "w-[80%]"}`}
        />
      ))}
    </div>
  );
}

export function SkeletonStatCard() {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[16px]">
      <Skeleton className="h-[10px] w-[60px] mb-[8px]" />
      <Skeleton className="h-[28px] w-[80px]" />
    </div>
  );
}
