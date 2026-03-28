"use client";

type ProgressBarProps = {
  currentIndex: number;
  total: number;
  questionLabel?: string;
  elapsedMs?: number;
};

function getEncouragement(index: number, total: number): string {
  if (index === 0) return "Great start — take your time";
  if (index === total - 1) return "Final question — make it count";
  if (index === total - 2) return "Almost there!";
  return "You're on a roll";
}

function formatTime(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function ProgressBar({
  currentIndex,
  total,
  questionLabel,
  elapsedMs = 0,
}: ProgressBarProps) {
  return (
    <div className="mb-[24px]">
      {/* Header row */}
      <div className="flex items-center justify-between mb-[12px]">
        <div className="flex items-center gap-[8px]">
          <span className="text-[13px] font-semibold text-[#111111]">
            Question {currentIndex + 1} of {total}
          </span>
          {questionLabel && (
            <span className="text-[11px] font-semibold uppercase tracking-[0.5px] px-[8px] py-[3px] rounded-full bg-[#F3F4F6] text-[#555555]">
              {questionLabel}
            </span>
          )}
        </div>
        {elapsedMs > 0 && (
          <span className="text-[12px] text-[#94A3B8] font-mono">
            {formatTime(elapsedMs)} so far
          </span>
        )}
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-[4px]">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex items-center flex-1">
            {/* Dot */}
            <div
              className={`w-[10px] h-[10px] rounded-full shrink-0 transition-all duration-400 ${
                i < currentIndex
                  ? "bg-[#34D399]"
                  : i === currentIndex
                    ? "bg-[#E5654E] step-current"
                    : "bg-[#E2E8F0]"
              }`}
            />
            {/* Connecting line (except after last dot) */}
            {i < total - 1 && (
              <div
                className="flex-1 h-[2px] mx-[2px] rounded-full transition-all duration-400"
                style={{
                  background: i < currentIndex ? "#34D399" : "#F1F5F9",
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Encouragement microcopy */}
      <p className="text-[12px] text-[#94A3B8] mt-[8px] italic">
        {getEncouragement(currentIndex, total)}
      </p>
    </div>
  );
}
