"use client";

import { useEffect, useRef } from "react";

type MultipleChoiceAnswerProps = {
  options: string[];
  value: string;
  onChange: (value: string) => void;
  onTimeUpdate: (ms: number) => void;
};

export default function MultipleChoiceAnswer({
  options,
  value,
  onChange,
  onTimeUpdate,
}: MultipleChoiceAnswerProps) {
  const startTimeRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    startTimeRef.current = Date.now();
    intervalRef.current = setInterval(() => {
      onTimeUpdate(Date.now() - startTimeRef.current);
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [onTimeUpdate]);

  // Ensure options is always a string array (DB may return JSON string or object)
  const safeOptions: string[] = Array.isArray(options)
    ? options
    : typeof options === "string"
      ? (() => { try { return JSON.parse(options); } catch { return []; } })()
      : [];

  return (
    <div className="flex flex-col gap-[8px]">
      {safeOptions.map((option: string) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`w-full text-left px-[20px] py-[16px] rounded-[16px] font-sans text-[15px] transition-all duration-300 border cursor-pointer flex items-center gap-[12px] ${
              selected
                ? "border-[#1C1917] bg-[#1C1917] text-white shadow-[0_8px_24px_rgba(28,25,23,0.15)]"
                : "border-black/10 bg-white/60 backdrop-blur-md text-[#1C1917] hover:border-black/30 hover:bg-white"
            }`}
          >
            <div className={`w-[16px] h-[16px] rounded-sm border shrink-0 flex items-center justify-center transition-colors ${
              selected ? "border-white/30 bg-white/20" : "border-black/20 bg-black/5"
            }`}>
              {selected && <div className="w-[8px] h-[8px] bg-white rounded-sm" />}
            </div>
            <span className="leading-[1.4]">{option}</span>
          </button>
        );
      })}
    </div>
  );
}
