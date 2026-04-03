import { describe, expect, it } from "vitest";
import { getAudienceMatchSkew } from "../ai/price-signal-match-skew";

describe("getAudienceMatchSkew", () => {
  it("flags free-tool skew among high-match respondents", () => {
    const skew = getAudienceMatchSkew([
      { audienceMatch: 92, qualityScore: 85, priceCeiling: "Only free tools" },
      { audienceMatch: 88, qualityScore: 70, priceCeiling: "Only free tools" },
      { audienceMatch: 35, qualityScore: 90, priceCeiling: "$10–$30/month" },
      { audienceMatch: 25, qualityScore: 65, priceCeiling: "$30+/month" },
    ]);

    expect(skew).toContain("best-fit audience may be more price-sensitive");
  });

  it("flags willingness-to-pay skew among high-match respondents", () => {
    const skew = getAudienceMatchSkew([
      { audienceMatch: 95, qualityScore: 60, priceCeiling: "$10–$30/month" },
      { audienceMatch: 82, qualityScore: 55, priceCeiling: "$30+/month" },
      { audienceMatch: 30, qualityScore: 92, priceCeiling: "Only free tools" },
      { audienceMatch: 20, qualityScore: 88, priceCeiling: "Only free tools" },
    ]);

    expect(skew).toContain("clearest price signal is coming from your best-fit audience");
  });

  it("returns null when audience-match split is too weak", () => {
    const skew = getAudienceMatchSkew([
      { audienceMatch: 60, qualityScore: 90, priceCeiling: "Only free tools" },
      { audienceMatch: 58, qualityScore: 80, priceCeiling: "$10–$30/month" },
      { audienceMatch: 55, qualityScore: 70, priceCeiling: "Only free tools" },
      { audienceMatch: 53, qualityScore: 60, priceCeiling: "$30+/month" },
    ]);

    expect(skew).toBeNull();
  });
});
