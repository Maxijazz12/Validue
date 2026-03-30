import Skeleton from "@/components/ui/Skeleton";

export default function BriefLoading() {
  return (
    <article className="max-w-[720px] mx-auto px-4 py-12 pb-24">
      {/* Header */}
      <div className="mb-10">
        <Skeleton className="h-[14px] w-[120px] mb-6" />
        <Skeleton className="h-[28px] w-[200px] mb-2" />
        <Skeleton className="h-[15px] w-[300px]" />
      </div>

      {/* Methodology */}
      <div className="rounded-2xl bg-[#FAF9FA] border border-[#E2E8F0] p-[24px] mb-8">
        <div className="flex gap-6">
          <Skeleton className="h-[14px] w-[80px]" />
          <Skeleton className="h-[14px] w-[60px]" />
          <Skeleton className="h-[14px] w-[120px]" />
        </div>
      </div>

      {/* Recommendation */}
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[32px] mb-8 text-center">
        <Skeleton className="h-[12px] w-[120px] mx-auto mb-4" />
        <Skeleton className="h-[48px] w-[200px] mx-auto mb-3" />
        <Skeleton className="h-[14px] w-[160px] mx-auto mb-2" />
        <Skeleton className="h-[14px] w-[400px] mx-auto" />
      </div>

      {/* Verdicts */}
      <div className="mb-8">
        <Skeleton className="h-[12px] w-[160px] mb-4" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-2xl border border-[#E2E8F0] bg-white p-[24px]">
              <div className="flex items-center justify-between mb-3">
                <Skeleton className="h-[16px] w-[70%]" />
                <Skeleton className="h-[24px] w-[90px] rounded-full" />
              </div>
              <Skeleton className="h-[14px] w-full mb-2" />
              <Skeleton className="h-[14px] w-[80%]" />
            </div>
          ))}
        </div>
      </div>

      {/* Next steps */}
      <div className="mb-8">
        <Skeleton className="h-[12px] w-[100px] mb-4" />
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[24px]">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[14px] w-full mb-3" />
          ))}
        </div>
      </div>

      <p className="text-center text-[13px] text-[#94A3B8]">
        Synthesizing your Decision Brief... This usually takes 10-15 seconds.
      </p>
    </article>
  );
}
