"use client";

import { useState, useEffect, useTransition, useRef } from "react";
import Button from "@/components/ui/Button";
import {
  createConnectOnboardingLink,
  checkConnectStatus,
  requestCashout,
} from "./cashout-actions";

type Props = {
  availableBalanceCents: number;
  minCashoutCents: number;
  hasConnectAccount: boolean;
  onboardingComplete: boolean;
  /** Whether the user just returned from Stripe onboarding */
  connectReturnParam: string | null;
};

export default function CashoutPanel({
  availableBalanceCents,
  minCashoutCents,
  hasConnectAccount,
  onboardingComplete: initialOnboardingComplete,
  connectReturnParam,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [onboardingComplete, setOnboardingComplete] = useState(initialOnboardingComplete);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const needsCheck = connectReturnParam === "complete" && hasConnectAccount && !initialOnboardingComplete;
  const [checking, setChecking] = useState(needsCheck);
  const checkedRef = useRef(false);

  // If user just returned from Stripe onboarding, verify status with Stripe
  useEffect(() => {
    if (!needsCheck || checkedRef.current) return;
    checkedRef.current = true;

    checkConnectStatus()
      .then((result) => {
        if ("error" in result) {
          setError(result.error);
        } else if (result.onboardingComplete) {
          setOnboardingComplete(true);
        }
      })
      .catch((err) => {
        console.error("Failed to check Connect status:", err);
        setError("Could not verify account status. Please try again.");
      })
      .finally(() => setChecking(false));
  }, [needsCheck]);

  function handleSetupBank() {
    setError(null);
    startTransition(async () => {
      const result = await createConnectOnboardingLink();
      if ("error" in result) {
        setError(result.error);
      } else {
        window.location.href = result.url;
      }
    });
  }

  function handleCashout() {
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await requestCashout();
      if ("error" in result) {
        setError(result.error);
      } else {
        setSuccess(
          `$${(result.amountCents / 100).toFixed(2)} sent to your bank account!`
        );
      }
    });
  }

  // No Connect account yet — show setup prompt
  if (!hasConnectAccount) {
    return (
      <div className="bg-white border border-border-light rounded-[24px] p-[20px] mb-[24px] shadow-card">
        <span className="text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[6px]">
          Payout Setup
        </span>
        <p className="text-[14px] text-text-secondary font-medium mb-[16px]">
          Connect a bank account to cash out your earnings. Takes about 2 minutes.
        </p>
        {error && (
          <p className="text-[13px] text-error font-medium mb-[12px]">{error}</p>
        )}
        <Button onClick={handleSetupBank} disabled={isPending}>
          {isPending ? "Setting up…" : "Set Up Bank Account"}
        </Button>
      </div>
    );
  }

  // Has account but onboarding not complete
  if (!onboardingComplete) {
    return (
      <div className="bg-white border border-warning/20 rounded-[24px] p-[20px] mb-[24px] shadow-card">
        <span className="text-[11px] font-medium tracking-wide text-warning uppercase block mb-[6px]">
          Setup Incomplete
        </span>
        {checking ? (
          <p className="text-[14px] text-text-secondary font-medium">
            Checking your account status…
          </p>
        ) : (
          <>
            <p className="text-[14px] text-text-secondary font-medium mb-[16px]">
              Your bank account setup isn&apos;t complete yet. Please finish the verification process.
            </p>
            {error && (
              <p className="text-[13px] text-error font-medium mb-[12px]">{error}</p>
            )}
            <Button onClick={handleSetupBank} disabled={isPending}>
              {isPending ? "Loading…" : "Complete Setup"}
            </Button>
          </>
        )}
      </div>
    );
  }

  // Fully set up — show cashout button
  return (
    <div className="bg-white border border-border-light rounded-[24px] p-[20px] mb-[24px] shadow-card">
      <span className="text-[11px] font-medium tracking-wide text-success uppercase block mb-[6px]">
        Ready to Cash Out
      </span>
      {success ? (
        <p className="text-[14px] text-success font-bold">{success}</p>
      ) : (
        <>
          {availableBalanceCents < minCashoutCents ? (
            <p className="text-[14px] text-text-secondary font-medium">
              You need{" "}
              <span className="font-bold text-text-primary">
                ${((minCashoutCents - availableBalanceCents) / 100).toFixed(2)}
              </span>{" "}
              more to reach the ${(minCashoutCents / 100).toFixed(2)} minimum.
            </p>
          ) : (
            <>
              <p className="text-[14px] text-text-secondary font-medium mb-[16px]">
                Cash out your{" "}
                <span className="font-bold text-success">
                  ${(availableBalanceCents / 100).toFixed(2)}
                </span>{" "}
                available balance to your bank account.
              </p>
              {error && (
                <p className="text-[13px] text-error font-medium mb-[12px]">{error}</p>
              )}
              <Button onClick={handleCashout} disabled={isPending}>
                {isPending ? "Processing…" : `Cash Out $${(availableBalanceCents / 100).toFixed(2)}`}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}
