"use client";

import { useState, useRef, useEffect } from "react";

const EXAMPLE_IDEAS = [
  {
    title: "AI Meeting Summarizer",
    category: "SaaS",
    scribble: "I want to build a tool that sits in your meetings (Zoom, Teams, Google Meet) and automatically generates action items and summaries. The problem is people lose track of decisions made in meetings. I'm not sure if people would pay for this separately or if it needs to be part of a bigger productivity suite. Who would buy this — managers? Individual contributors? Both?",
    responses: 34,
  },
  {
    title: "Freelancer Tax Tracker",
    category: "Finance",
    scribble: "A simple app for freelancers and gig workers to track income, estimate quarterly taxes, and set aside the right amount automatically. Most freelancers I know either overpay or get hit with penalties. I'm unsure whether to target US-only or go international, and whether to integrate with banks or keep it manual input.",
    responses: 28,
  },
  {
    title: "Neighborhood Tool Library",
    category: "Marketplace",
    scribble: "An app where neighbors can lend and borrow tools, kitchen equipment, camping gear — stuff you use once or twice a year. Like a hyperlocal lending library. I'm wondering if people would actually trust strangers with their stuff, how to handle damage/insurance, and whether this works better in suburbs vs cities.",
    responses: 41,
  },
  {
    title: "Personalized Workout Generator",
    category: "Health",
    scribble: "I want to create an AI-powered workout planner that adapts to what equipment you have at home, your fitness level, injuries, and available time. There are tons of workout apps but none that truly personalize. Is this a subscription or one-time purchase? Would people trust AI for fitness advice without a human trainer?",
    responses: 52,
  },
  {
    title: "Restaurant Menu Translator",
    category: "Mobile",
    scribble: "Point your phone camera at a restaurant menu in any language and get instant translations with photos of the dishes, allergy info, and local favorites highlighted. For travelers who don't want to guess what they're ordering. Not sure if this is a standalone app or a feature in an existing travel app.",
    responses: 37,
  },
];

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
        <p className="text-[15px] text-[#64748B] mt-[4px]">
          Start with the raw thought. We&apos;ll help shape it into a validation
          campaign.
        </p>
      </div>

      {/* Scribble card */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-[40px] relative">
        {/* Notebook accent line */}
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl bg-gradient-to-r from-[#E5654E] to-[#E5654E]/30" />

        <div className="flex flex-col gap-[16px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Dump your idea here — rough thoughts are fine."
            disabled={isGenerating}
            className="w-full min-h-[200px] text-[17px] leading-[1.7] text-[#111111] font-sans placeholder:text-[#bbb] outline-none resize-none bg-transparent disabled:opacity-50"
          />

          <p className="text-[13px] text-[#94A3B8] leading-[1.5]">
            Describe the problem, who it&apos;s for, and what you&apos;re unsure
            about. The messier the better — we&apos;ll help you structure it.
          </p>

          {/* Example ideas carousel */}
          {text.trim().length < 10 && (
            <div>
              <p className="text-[11px] font-semibold tracking-[1px] uppercase text-[#94A3B8] mb-[8px]">
                Need inspiration? Try a template
              </p>
              <div className="flex gap-[10px] overflow-x-auto pb-[4px]" style={{ scrollSnapType: "x mandatory" }}>
                {EXAMPLE_IDEAS.map((example) => (
                  <button
                    key={example.title}
                    onClick={() => setText(example.scribble)}
                    className="flex-shrink-0 w-[200px] text-left p-[12px] rounded-xl border border-[#E2E8F0] bg-[#FAFAFA] hover:border-[#CBD5E1] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-200 cursor-pointer group"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <span className="text-[10px] font-medium text-[#E5654E] bg-[#E5654E]/8 px-[6px] py-[2px] rounded-md">
                      {example.category}
                    </span>
                    <p className="text-[13px] font-semibold text-[#111111] mt-[6px] leading-[1.3] group-hover:text-[#E5654E] transition-colors">
                      {example.title}
                    </p>
                    <p className="text-[11px] text-[#94A3B8] mt-[4px]">
                      {example.responses} responses received
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-[8px]">
            {/* Character count */}
            <span
              className={`text-[12px] transition-colors ${
                text.trim().length >= 50
                  ? "text-[#94A3B8]"
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
              className="inline-flex items-center gap-[8px] px-[28px] py-[13px] rounded-xl text-[15px] font-semibold bg-[#111111] text-white hover:bg-[#222222] hover:shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-all cursor-pointer border-none disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-[#111111]"
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
