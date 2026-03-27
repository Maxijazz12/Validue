"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const MIN_CHARS = 50;

type OpenEndedAnswerProps = {
  value: string;
  onChange: (value: string) => void;
  onPaste: () => void;
  onTimeUpdate: (ms: number) => void;
  placeholder?: string;
};

export default function OpenEndedAnswer({
  value,
  onChange,
  onPaste,
  onTimeUpdate,
  placeholder = "Share your honest thoughts...",
}: OpenEndedAnswerProps) {
  const startTimeRef = useRef(Date.now());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [charCount, setCharCount] = useState(value.length);
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
    },
    [onChange]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      // Record but don't block
      void e;
      onPaste();
    },
    [onPaste]
  );

  return (
    <div>
      <textarea
        value={value}
        onChange={handleChange}
        onPaste={handlePaste}
        placeholder={placeholder}
        rows={5}
        className="w-full px-[16px] py-[14px] rounded-xl border border-[#ebebeb] bg-white text-[14px] text-[#111111] leading-[1.6] resize-y focus:outline-none focus:ring-2 focus:ring-[#111111]/10 focus:border-[#111111] transition-all placeholder:text-[#999999]"
      />
      <div className="flex items-center justify-between mt-[8px]">
        <span
          className={`text-[12px] transition-colors ${
            meetsMin ? "text-[#65a30d]" : "text-[#999999]"
          }`}
        >
          {charCount} / {MIN_CHARS} min characters
        </span>
        {!meetsMin && charCount > 0 && (
          <span className="text-[11px] text-[#e8b87a]">
            {MIN_CHARS - charCount} more to go
          </span>
        )}
      </div>
    </div>
  );
}

export { MIN_CHARS };
