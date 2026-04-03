export interface PriceSignalMatchRespondent {
  priceCeiling: string | null;
  qualityScore: number;
  audienceMatch: number;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function getAudienceMatchSkew(
  respondents: PriceSignalMatchRespondent[]
): string | null {
  if (respondents.length < 4) return null;

  const sorted = [...respondents].sort((a, b) => {
    const matchDiff = b.audienceMatch - a.audienceMatch;
    if (matchDiff !== 0) return matchDiff;
    return b.qualityScore - a.qualityScore;
  });

  const midpoint = Math.ceil(sorted.length / 2);
  const highMatch = sorted.slice(0, midpoint);
  const lowMatch = sorted.slice(midpoint);

  if (highMatch.length < 2 || lowMatch.length < 2) return null;

  const avgGap =
    average(highMatch.map((respondent) => respondent.audienceMatch)) -
    average(lowMatch.map((respondent) => respondent.audienceMatch));
  if (avgGap < 10) return null;

  const highMatchCeilings = highMatch
    .map((respondent) => respondent.priceCeiling)
    .filter((value): value is string => Boolean(value));
  const lowMatchCeilings = lowMatch
    .map((respondent) => respondent.priceCeiling)
    .filter((value): value is string => Boolean(value));

  if (highMatchCeilings.length < 2 || lowMatchCeilings.length < 2) return null;

  const highMatchFreeRatio =
    highMatchCeilings.filter((ceiling) => ceiling === "Only free tools").length /
    highMatchCeilings.length;
  const lowMatchFreeRatio =
    lowMatchCeilings.filter((ceiling) => ceiling === "Only free tools").length /
    lowMatchCeilings.length;

  if (highMatchFreeRatio > 0.5 && lowMatchFreeRatio < 0.3) {
    return "Higher-match respondents lean toward free tools — your best-fit audience may be more price-sensitive than the full pool suggests.";
  }
  if (highMatchFreeRatio < 0.3 && lowMatchFreeRatio > 0.5) {
    return "Higher-match respondents show stronger willingness to pay — the clearest price signal is coming from your best-fit audience.";
  }

  return null;
}
