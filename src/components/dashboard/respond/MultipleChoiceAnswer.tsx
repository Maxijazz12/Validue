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
            className={`w-full text-left px-[16px] py-[14px] rounded-xl border text-[14px] transition-all duration-200 cursor-pointer ${
              selected
                ? "border-[#111111] bg-[#111111] text-white font-medium"
                : "border-[#E2E8F0] bg-white text-[#111111] hover:border-[#CBD5E1] hover:bg-[#FCFCFD]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
