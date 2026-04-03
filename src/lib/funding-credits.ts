export type FundingCreditResolution = {
  appliedWelcomeCreditCents: number;
  appliedPlatformCreditCents: number;
  chargeAmountCents: number;
  platformSubsidyCents: number;
};

export type ReservedPlatformCreditResolution = {
  nextReservedPlatformCreditCents: number;
  profileCreditDeltaCents: number;
};

type ResolveFundingCreditsInput = {
  fullAmountCents: number;
  welcomeCreditEligible: boolean;
  welcomeCreditCents: number;
  platformCreditAvailableCents: number;
  minimumChargeCents?: number;
};

export function resolveFundingCredits(
  input: ResolveFundingCreditsInput
): FundingCreditResolution {
  const fullAmountCents = Math.max(0, Math.floor(input.fullAmountCents));
  const welcomeCreditCents = input.welcomeCreditEligible
    ? Math.max(0, Math.floor(input.welcomeCreditCents))
    : 0;
  const platformCreditAvailableCents = Math.max(
    0,
    Math.floor(input.platformCreditAvailableCents)
  );
  const minimumChargeCents = Math.max(
    0,
    Math.floor(input.minimumChargeCents ?? 50)
  );

  const appliedWelcomeCreditCents = Math.min(fullAmountCents, welcomeCreditCents);
  const remainingAfterWelcomeCents = Math.max(
    0,
    fullAmountCents - appliedWelcomeCreditCents
  );
  const appliedPlatformCreditCents = Math.min(
    remainingAfterWelcomeCents,
    platformCreditAvailableCents
  );
  const uncoveredAmountCents = Math.max(
    0,
    fullAmountCents - appliedWelcomeCreditCents - appliedPlatformCreditCents
  );

  if (uncoveredAmountCents > 0 && uncoveredAmountCents < minimumChargeCents) {
    return {
      appliedWelcomeCreditCents,
      appliedPlatformCreditCents,
      chargeAmountCents: 0,
      platformSubsidyCents: uncoveredAmountCents,
    };
  }

  return {
    appliedWelcomeCreditCents,
    appliedPlatformCreditCents,
    chargeAmountCents: uncoveredAmountCents,
    platformSubsidyCents: 0,
  };
}

export function reconcileReservedPlatformCredit(
  desiredAppliedPlatformCreditCents: number,
  existingReservedPlatformCreditCents: number
): ReservedPlatformCreditResolution {
  const desired = Math.max(0, Math.floor(desiredAppliedPlatformCreditCents));
  const existing = Math.max(0, Math.floor(existingReservedPlatformCreditCents));

  return {
    nextReservedPlatformCreditCents: desired,
    profileCreditDeltaCents: desired - existing,
  };
}
