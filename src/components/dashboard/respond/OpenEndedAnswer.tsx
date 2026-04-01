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
  if (pasteDetected) return { text: "Tip: Personal insights are more valuable than copied text", color: "#F59E0B" };
  if (charCount >= 200) return { text: "Great detail!", color: "#22C55E" };
  if (charCount >= 50 && charCount < 100) return { text: "Good start — more detail helps founders understand your thinking", color: "#94A3B8" };
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
        className="w-full px-[16px] py-[14px] rounded-xl border border-[#E2E8F0] bg-white text-[14px] text-[#111111] leading-[1.6] resize-y outline-none focus:border-[#CBD5E1] focus:shadow-[0_0_0_3px_rgba(0,0,0,0.04)] transition-all duration-200 placeholder:text-[#94A3B8]"
      />

      {/* Response anchors — fade after 100 chars */}
      {showAnchors && (
        <div className="flex flex-wrap gap-[6px] mt-[8px] transition-opacity duration-300" style={{ opacity: charCount > 60 ? 0.4 : 0.7 }}>
          {anchors.map((anchor, i) => (
            <span key={i} className="text-[11px] text-text-muted bg-bg-elevated px-[8px] py-[3px] rounded-full">
              {anchor}
            </span>
          ))}
        </div>
      )}

      {/* Character counter + coaching */}
      <div className="flex items-center justify-between mt-[8px]">
        <div className="flex items-center gap-[6px]">
          {meetsMin ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <span className="text-[12px] text-[#94A3B8]">
              {charCount}/{MIN_CHARS}
            </span>
          )}
          {!meetsMin && charCount > 0 && (
            <span className="text-[11px] text-[#E5654E]">
              {MIN_CHARS - charCount} more to go
            </span>
          )}
        </div>

        {/* Coaching tip */}
        {coaching && (
          <span className="text-[11px] italic" style={{ color: coaching.color }}>
            {coaching.text}
          </span>
        )}
      </div>
    </div>
  );
}

export { MIN_CHARS };
