"use client";

import { useState, useRef, useEffect } from "react";

interface ScribbleStepProps {
  onSubmit: (text: string) => void;
  isGenerating: boolean;
  initialText?: string;
}

export default function ScribbleStep({
  onSubmit,
  isGenerating,
  initialText = "",
}: ScribbleStepProps) {
  const [text, setText] = useState(initialText);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 200) + "px";
  }, [text]);

  const canSubmit = text.trim().length >= 50 && !isGenerating;

  return (
    <div className="max-w-[720px] mx-auto">
      {/* Header */}
      <div className="mb-[32px]">
        <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
          New Idea
        </h1>
        <p className="text-[15px] text-[#555555] mt-[4px]">
          Start with the raw thought. We&apos;ll help shape it into a validation
          campaign.
        </p>
      </div>

      {/* Scribble card */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[40px] relative">
        {/* Notebook accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[#e8b87a] to-[#e8b87a]/30" />

        <div className="flex flex-col gap-[16px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dump your idea here — rough thoughts are fine."
            disabled={isGenerating}
            className="w-full min-h-[200px] text-[17px] leading-[1.7] text-[#111111] font-sans placeholder:text-[#bbb] outline-none resize-none bg-transparent disabled:opacity-50"
          />

          <p className="text-[13px] text-[#999999] leading-[1.5]">
            Describe the problem, who it&apos;s for, and what you&apos;re unsure
            about. The messier the better — we&apos;ll help you structure it.
          </p>

          <div className="flex items-center justify-between pt-[8px]">
            {/* Character count */}
            <span
              className={`text-[12px] transition-colors ${
                text.trim().length >= 50
                  ? "text-[#999999]"
                  : "text-[#d4d4d4]"
              }`}
            >
              {text.trim().length < 50
                ? `${50 - text.trim().length} more characters to go`
                : `${text.trim().length} characters`}
            </span>

            <button
              onClick={() => onSubmit(text.trim())}
              disabled={!canSubmit}
              className="inline-flex items-center gap-[8px] px-[28px] py-[13px] rounded-lg text-[15px] font-semibold bg-[#111111] text-white hover:bg-[#222222] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[#111111]"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 3v3m6.36-.64l-2.12 2.12M21 12h-3m.64 6.36l-2.12-2.12M12 21v-3m-6.36.64l2.12-2.12M3 12h3m-.64-6.36l2.12 2.12" />
              </svg>
              Generate Campaign
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
