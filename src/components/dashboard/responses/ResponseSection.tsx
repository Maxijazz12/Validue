"use client";

import { useRef, useCallback } from "react";
import PayoutAllocator from "./PayoutAllocator";
import ResponseList, { type ResponseItem } from "./ResponseList";
import { FEATURES } from "@/lib/feature-flags";

type ResponseSectionProps = {
  campaignId: string;
  rewardAmount: number;
  distributableAmount: number;
  payoutStatus: string;
  rankedCount: number;
  showAllocator: boolean;
  responses: ResponseItem[];
};

export default function ResponseSection({
  campaignId,
  rewardAmount,
  distributableAmount,
  payoutStatus,
  rankedCount,
  showAllocator,
  responses,
}: ResponseSectionProps) {
  const scrollFnRef = useRef<((responseId: string) => void) | null>(null);

  const handleScrollToResponse = useCallback((responseId: string) => {
    scrollFnRef.current?.(responseId);
  }, []);

  const handleScrollReady = useCallback(
    (fn: (responseId: string) => void) => {
      scrollFnRef.current = fn;
    },
    []
  );

  return (
    <>
      {FEATURES.RESPONDENT_PAYOUTS && showAllocator && (
        <div className="mb-[24px]">
          <PayoutAllocator
            campaignId={campaignId}
            rewardAmount={rewardAmount}
            distributableAmount={distributableAmount}
            payoutStatus={payoutStatus}
            rankedCount={rankedCount}
            onScrollToResponse={handleScrollToResponse}
          />
        </div>
      )}

      {responses.length === 0 ? (
        <div className="bg-bg-muted border border-border-light rounded-2xl p-[48px] text-center relative overflow-hidden">
          <div className="absolute top-0 left-[10%] right-[10%] h-[2px] bg-gradient-to-r from-transparent via-accent-warm-muted/20 to-transparent" />
          <div className="w-[56px] h-[56px] rounded-2xl bg-gradient-to-br from-accent-warm-muted/10 to-brand/5 flex items-center justify-center mx-auto mb-[16px]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#E5654E" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </div>
          <h2 className="text-[20px] font-bold text-text-primary mb-[8px]">
            No responses <span className="italic font-normal text-gradient-warm">yet</span>
          </h2>
          <p className="text-[14px] text-text-secondary max-w-[360px] mx-auto">
            Your campaign is live. Great responses are on their way.
          </p>
        </div>
      ) : (
        <ResponseList
          responses={responses}
          onScrollReady={handleScrollReady}
        />
      )}
    </>
  );
}
