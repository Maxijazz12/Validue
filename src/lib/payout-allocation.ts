export type TrustedPayoutSuggestion = {
  responseId: string;
  respondentId: string;
  respondentName: string;
  qualityScore: number;
  suggestedAmount: number;
  weight: number;
  scoringSource: string;
  scoringConfidence: number;
  qualified?: boolean;
  basePayout?: number;
  bonusPayout?: number;
  disqualificationReasons?: string[];
};

export type RequestedPayoutAllocation = {
  responseId: string;
  amount: number;
};

export type ResolvedPayoutAllocation = {
  responseId: string;
  respondentId: string;
  amount: number;
  basePayout: number;
  bonusPayout: number;
  qualified: boolean;
  disqualificationReasons: string[];
};

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeReasons(reasons: string[] | undefined): string[] {
  return Array.isArray(reasons)
    ? reasons.filter((reason): reason is string => typeof reason === "string")
    : [];
}

function scalePayoutComponents(
  amount: number,
  suggestion: TrustedPayoutSuggestion
): Pick<ResolvedPayoutAllocation, "basePayout" | "bonusPayout"> {
  const trustedBase = roundCurrency(
    Math.max(0, suggestion.basePayout ?? suggestion.suggestedAmount)
  );
  const trustedBonus = roundCurrency(Math.max(0, suggestion.bonusPayout ?? 0));
  const trustedTotal = roundCurrency(trustedBase + trustedBonus);

  if (trustedTotal <= 0 || trustedBonus <= 0) {
    return { basePayout: amount, bonusPayout: 0 };
  }

  const scaledBase = roundCurrency(amount * (trustedBase / trustedTotal));
  return {
    basePayout: scaledBase,
    bonusPayout: roundCurrency(amount - scaledBase),
  };
}

export function resolvePayoutAllocations(
  trustedSuggestions: TrustedPayoutSuggestion[],
  requestedAllocations: RequestedPayoutAllocation[]
): ResolvedPayoutAllocation[] {
  const trustedById = new Map<string, TrustedPayoutSuggestion>();
  for (const suggestion of trustedSuggestions) {
    if (trustedById.has(suggestion.responseId)) {
      throw new Error(`Duplicate trusted payout response: ${suggestion.responseId}`);
    }
    trustedById.set(suggestion.responseId, suggestion);
  }

  const requestedById = new Map<string, RequestedPayoutAllocation>();
  for (const requested of requestedAllocations) {
    if (requestedById.has(requested.responseId)) {
      throw new Error(`Duplicate response ID in allocations: ${requested.responseId}`);
    }
    if (!trustedById.has(requested.responseId)) {
      throw new Error(`Response ${requested.responseId} is not eligible for payout allocation`);
    }
    if (!Number.isFinite(requested.amount) || requested.amount < 0) {
      throw new Error(`Invalid payout amount: ${requested.amount}`);
    }
    requestedById.set(requested.responseId, {
      responseId: requested.responseId,
      amount: roundCurrency(requested.amount),
    });
  }

  return trustedSuggestions.map((suggestion) => {
    const requestedAmount = requestedById.get(suggestion.responseId)?.amount ?? 0;
    const serverQualified = suggestion.qualified === true;

    if (!serverQualified) {
      if (requestedAmount > 0) {
        throw new Error(`Response ${suggestion.responseId} is not payout-qualified`);
      }
      return {
        responseId: suggestion.responseId,
        respondentId: suggestion.respondentId,
        amount: 0,
        basePayout: 0,
        bonusPayout: 0,
        qualified: false,
        disqualificationReasons: normalizeReasons(suggestion.disqualificationReasons),
      };
    }

    if (requestedAmount <= 0) {
      return {
        responseId: suggestion.responseId,
        respondentId: suggestion.respondentId,
        amount: 0,
        basePayout: 0,
        bonusPayout: 0,
        qualified: false,
        disqualificationReasons: [],
      };
    }

    const amount = roundCurrency(requestedAmount);
    return {
      responseId: suggestion.responseId,
      respondentId: suggestion.respondentId,
      amount,
      ...scalePayoutComponents(amount, suggestion),
      qualified: true,
      disqualificationReasons: [],
    };
  });
}
