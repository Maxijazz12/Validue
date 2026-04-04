"use client";

type ProgressBarProps = {
  currentIndex: number;
  total: number;
  questionLabel?: string;
  elapsedMs?: number;
};

function getEncouragement(index: number, total: number): string {
  if (index === 0) return "[ INITIALIZING_SURVEY ]";
  if (index === total - 1) return "[ LAST_QUESTION ]";
  if (index === total - 2) return "[ ALMOST_THERE ]";
  return "[ AWAITING_INPUT ]";
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
      <div className="flex items-center justify-between mb-[16px]">
        <div className="flex items-center gap-[8px]">
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary">
            [ NODE_{currentIndex + 1} / {total} ]
          </span>
          {questionLabel && (
            <span className="font-mono text-[9px] font-bold uppercase tracking-[1px] px-[8px] py-[3px] rounded-md border border-border-light bg-bg-muted text-text-muted">
              {questionLabel}
            </span>
          )}
        </div>
        {elapsedMs > 0 && (
          <span className="text-[11px] text-text-muted font-mono tracking-widest uppercase">
            {formatTime(elapsedMs)} ELAPSED
          </span>
        )}
      </div>

      {/* Step dots */}
      <div className="flex items-center gap-[4px] opacity-80">
        {Array.from({ length: total }, (_, i) => (
          <div key={i} className="flex items-center flex-1">
            {/* Dot / Box indicator */}
            <div
              className={`h-[4px] flex-1 rounded-sm transition-all duration-400 ${
                i < currentIndex
                  ? "bg-text-muted"
                  : i === currentIndex
                    ? "bg-accent animate-pulse"
                    : "bg-bg-muted"
              }`}
            />
          </div>
        ))}
      </div>

      {/* System state microcopy */}
      <p className="font-mono text-[11px] font-medium text-text-muted mt-[12px] uppercase tracking-wide">
        {getEncouragement(currentIndex, total)}
      </p>
    </div>
  );
}
