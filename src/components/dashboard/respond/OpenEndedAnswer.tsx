"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MIN_CHARS = 50;

type OpenEndedAnswerProps = {
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  onTimeUpdate: (ms: number) => void;
  placeholder?: string;
  anchors?: string[];
};

function getCoachingTip(charCount: number, pasteDetected: boolean): { text: string; color: string } | null {
  if (pasteDetected) return { text: "// SYSW: PASTED_INPUT_DETECTED. ORIGINAL_THOUGHTS_PREFERED", color: "#F59E0B" };
  if (charCount >= 200) return { text: "// SYS: GREAT_DETAIL_CONFIRMED", color: "#22C55E" };
  if (charCount >= 50 && charCount < 100) return { text: "// SYS: GOOD_START. MORE_DETAIL_HELPS_FOUNDERS.", color: "#A8A29E" };
  return null;
}

export default function OpenEndedAnswer({
  value,
  onChange,
  onPaste,
  onTimeUpdate,
  placeholder = "Share your honest thoughts...",
  anchors,
}: OpenEndedAnswerProps) {
  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [charCount, setCharCount] = useState(value.length);
  const [pasteDetected, setPasteDetected] = useState(false);
  const pastedTextRef = useRef<string>("");
  const meetsMin = charCount >= MIN_CHARS;

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      onTimeUpdate(Date.now() - startTimeRef.current);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTimeUpdate]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      const val = e.target.value;
      onChange(val);
      setCharCount(val.length);
      // Reset paste warning if pasted content was removed
      if (pasteDetected && pastedTextRef.current && !val.includes(pastedTextRef.current)) {
        setPasteDetected(false);
        pastedTextRef.current = "";
      }
    },
    [onChange, pasteDetected]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const pasted = e.clipboardData.getData("text");
      if (pasted.length > 10) {
        pastedTextRef.current = pasted.slice(0, 50); // track first 50 chars for detection
        onPaste();
        setPasteDetected(true);
      }
    },
    [onPaste]
  );

  const coaching = getCoachingTip(charCount, pasteDetected);

  const showAnchors = anchors && anchors.length > 0 && charCount < 100;

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={5}
        className="w-full px-[20px] py-[16px] rounded-[16px] border border-black/10 bg-white text-[15px] text-text-primary leading-[1.6] resize-y outline-none focus:border-accent transition-all duration-300 placeholder:text-text-muted font-sans"
      />

      {/* Response anchors — fade after 100 chars */}
      {showAnchors && (
        <div className="flex flex-wrap gap-[6px] mt-[12px] transition-opacity duration-300" style={{ opacity: charCount > 60 ? 0.4 : 1 }}>
          {anchors.map((anchor, i) => (
            <span key={i} className="font-mono text-[9px] font-bold uppercase tracking-[1px] text-text-muted bg-black/5 border border-black/10 px-[8px] py-[3px] rounded-md">
              [ {anchor} ]
            </span>
          ))}
        </div>
      )}

      {/* Character counter + coaching */}
      <div className="flex items-center justify-between mt-[12px]">
        <div className="flex items-center gap-[8px]">
          {meetsMin ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2A8AF6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span className="font-mono text-[10px] font-bold text-text-muted tracking-widest">
              {charCount}/{MIN_CHARS} CYCLES
            </span>
          )}
          {!meetsMin && charCount > 0 && (
            <span className="font-mono text-[11px] font-medium text-brand tracking-wide uppercase">
              {MIN_CHARS - charCount} CYCLES_REMAINING
            </span>
          )}
        </div>

        {/* Coaching tip */}
        {coaching && (
          <span className="font-mono text-[11px] font-medium uppercase tracking-wide" style={{ color: coaching.color }}>
            {coaching.text}
          </span>
        )}
      </div>
    </div>
  );
}

export { MIN_CHARS };
