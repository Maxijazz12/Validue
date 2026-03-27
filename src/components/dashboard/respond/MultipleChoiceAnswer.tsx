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
  const startTimeRef = useRef(Date.now());
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

  return (
    <div className="flex flex-col gap-[8px]">
      {options.map((option) => {
        const selected = value === option;
        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`w-full text-left px-[16px] py-[14px] rounded-xl border text-[14px] transition-all duration-200 cursor-pointer ${
              selected
                ? "border-[#111111] bg-[#111111] text-white font-medium"
                : "border-[#ebebeb] bg-white text-[#111111] hover:border-[#d4d4d4] hover:bg-[#fafafa]"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
