"use client";

type ProgressBarProps = {
  currentIndex: number;
  total: number;
  questionLabel?: string;
};

export default function ProgressBar({
  currentIndex,
  total,
  questionLabel,
}: ProgressBarProps) {
  return (
    <div className="mb-[24px]">
      <div className="flex items-center justify-between mb-[8px]">
        <span className="text-[13px] font-semibold text-[#111111]">
          Question {currentIndex + 1} of {total}
        </span>
        {questionLabel && (
          <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#f5f2ed] text-[#555555]">
            {questionLabel}
          </span>
        )}
      </div>
      <div className="flex gap-[4px]">
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            className="h-[4px] flex-1 rounded-full transition-all duration-300"
            style={{
              background:
                i < currentIndex
                  ? "#65a30d"
                  : i === currentIndex
                    ? "#e8b87a"
                    : "#f5f2ed",
            }}
          />
        ))}
      </div>
    </div>
  );
}
