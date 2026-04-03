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
    <div className="w-full flex flex-col h-full min-h-[75vh]">
      {/* Header */}
      <div className="mb-[32px] flex flex-col gap-2">
        <h1 className="text-[20px] md:text-[24px] font-bold tracking-tight text-text-primary font-mono uppercase">
          [ SYS.INITIALIZE_NODE ]
        </h1>
        <p className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase">
          Awaiting raw input variables for validation synthesis.
        </p>
      </div>

      {/* Scribble Glass Pane */}
      <div className="flex-1 flex flex-col bg-white border border-border-light shadow-card rounded-[32px] p-[40px] md:p-[56px] relative overflow-hidden group transition-all duration-700 hover:shadow-card-hover">
        {/* Glowing top line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-brand/30 to-transparent opacity-30 group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="flex flex-col gap-[16px]">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="[ ENTER RAW CONCEPT ] — describe the problem, target demographic, and validation metrics."
            disabled={isGenerating}
            className="w-full flex-1 min-h-[240px] text-[16px] md:text-[18px] leading-[1.7] text-text-primary font-sans font-normal tracking-[0.01em] placeholder:text-text-muted/60 outline-none resize-none bg-transparent disabled:opacity-50"
          />

          {/* Example ideas carousel */}
          {text.trim().length < 10 && (
            <div className="mt-8">
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[12px]">
                Or load pre-configured template:
              </p>
              <div className="flex gap-[16px] overflow-x-auto pb-[16px] hide-scrollbar" style={{ scrollSnapType: "x mandatory" }}>
                {EXAMPLE_IDEAS.map((example) => (
                  <button
                    key={example.title}
                    onClick={() => setText(example.scribble)}
                    className="flex-shrink-0 w-[240px] text-left p-[20px] rounded-[20px] border border-border-light bg-white/40 shadow-sm hover:shadow-[0_8px_24px_rgba(0,0,0,0.06)] hover:bg-white/70 transition-all duration-300 cursor-pointer group"
                    style={{ scrollSnapAlign: "start" }}
                  >
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-primary bg-white opacity-90 px-[8px] py-[4px] border border-black/5 rounded-md shadow-sm">
                      {example.category}
                    </span>
                    <p className="text-[15px] font-semibold tracking-tight text-text-primary mt-[12px] leading-[1.3] group-hover:opacity-70 transition-opacity">
                      {example.title}
                    </p>
                    <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mt-[16px]">
                      {example.responses} EXECUTIONS
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-[24px] mt-auto border-t border-white/40">
            {/* Character count */}
            <span
              className={`font-mono text-[11px] font-medium uppercase tracking-wide transition-colors ${
                text.trim().length >= 50
                  ? "text-success"
                  : "text-text-muted"
              }`}
            >
              {text.trim().length < 50
                ? `[ ${50 - text.trim().length} BYTES REQ ]`
                : `[ STABLE : ${text.trim().length} BYTES ]`}
            </span>

            <button
              onClick={() => onSubmit(text.trim())}
              disabled={!canSubmit}
              className="inline-flex items-center gap-[12px] px-[32px] py-[16px] rounded-full text-[12px] font-medium uppercase tracking-wide bg-accent text-white hover:bg-white hover:text-text-primary hover:shadow-[0_0_32px_rgba(229,101,78,0.2)] hover:border-brand/30 transition-all duration-500 cursor-pointer border border-accent disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-accent disabled:hover:text-white"
            >
              [ INITIATE _SYNTHESIS ]
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
