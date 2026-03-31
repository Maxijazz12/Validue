import { describe, it, expect } from "vitest";
import { _testExports } from "@/lib/ai/detect-consistency-gaps";

const { detectPriceMismatch, detectUrgencyMismatch, detectSeverityMismatch, detectForwardPriceMismatch } = _testExports;

function makeRespondent(
  baselineAnswers: Record<string, string>,
  qualityScore = 50
) {
  return {
    respondentId: "test-respondent",
    qualityScore,
    baselineAnswers: new Map(Object.entries(baselineAnswers)),
  };
}

/* ─── Price Mismatch ─── */

describe("detectPriceMismatch", () => {
  it("detects contradiction: high ceiling but never spent money", () => {
    const gap = detectPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$0 — only free options",
        "bl-payment-2": "$10–$30/month",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("price_mismatch");
    expect(gap!.severity).toBe("medium");
  });

  it("detects high severity for high-quality respondent", () => {
    const gap = detectPriceMismatch(
      makeRespondent(
        {
          "bl-payment-1": "$0 — only free options",
          "bl-payment-2": "$30+/month",
        },
        75
      )
    );
    expect(gap).not.toBeNull();
    expect(gap!.severity).toBe("high");
  });

  it("returns null when spending matches ceiling", () => {
    const gap = detectPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$50–$200",
        "bl-payment-2": "$10–$30/month",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null when ceiling is free (consistent)", () => {
    const gap = detectPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$0 — only free options",
        "bl-payment-2": "Only free tools",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null with missing data", () => {
    expect(detectPriceMismatch(makeRespondent({}))).toBeNull();
    expect(
      detectPriceMismatch(makeRespondent({ "bl-payment-1": "$0 — only free options" }))
    ).toBeNull();
    expect(
      detectPriceMismatch(makeRespondent({ "bl-payment-2": "$30+/month" }))
    ).toBeNull();
  });
});

/* ─── Urgency Mismatch ─── */

describe("detectUrgencyMismatch", () => {
  it("detects contradiction: searched recently but never tried anything", () => {
    const gap = detectUrgencyMismatch(
      makeRespondent({
        "bl-interest-2": "This week",
        "bl-willingness-1": "Never tried anything",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("urgency_mismatch");
  });

  it("detects contradiction: frequent seeking but no problem", () => {
    const gap = detectUrgencyMismatch(
      makeRespondent({
        "bl-interest-1": "Every week",
        "bl-willingness-1": "I don't have this problem",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("urgency_mismatch");
  });

  it("returns null when seeking and trying are consistent", () => {
    const gap = detectUrgencyMismatch(
      makeRespondent({
        "bl-interest-1": "Every week",
        "bl-willingness-1": "Currently using something",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null when not actively seeking", () => {
    const gap = detectUrgencyMismatch(
      makeRespondent({
        "bl-interest-1": "Rarely or never",
        "bl-willingness-1": "Never tried anything",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null with no relevant answers", () => {
    expect(detectUrgencyMismatch(makeRespondent({}))).toBeNull();
  });
});

/* ─── Severity Mismatch ─── */

describe("detectSeverityMismatch", () => {
  it("detects contradiction: daily frequency but no time waste", () => {
    const gap = detectSeverityMismatch(
      makeRespondent({
        "bl-behavior-2": "Daily",
        "bl-pain-2": "None",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("severity_mismatch");
  });

  it("detects contradiction: high frequency but no solution and claims to deal with it", () => {
    const gap = detectSeverityMismatch(
      makeRespondent({
        "bl-behavior-2": "Multiple times a day",
        "bl-behavior-1": "Nothing — I just deal with it",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("severity_mismatch");
  });

  it("returns null when frequency is low", () => {
    const gap = detectSeverityMismatch(
      makeRespondent({
        "bl-behavior-2": "1–2 times",
        "bl-pain-2": "None",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null when frequency and time waste are consistent", () => {
    const gap = detectSeverityMismatch(
      makeRespondent({
        "bl-behavior-2": "Daily",
        "bl-pain-2": "Over 2 hours",
        "bl-behavior-1": "A dedicated paid tool",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null with missing frequency answer", () => {
    expect(detectSeverityMismatch(makeRespondent({}))).toBeNull();
  });
});

/* ─── Forward Price Mismatch ─── */

describe("detectForwardPriceMismatch", () => {
  it("detects contradiction: forward WTP $25-50/month but $0 past spending", () => {
    const gap = detectForwardPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$0 — only free options",
        "bl-payment-3": "$25–$50/month",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("forward_price_mismatch");
    expect(gap!.severity).toBe("medium");
  });

  it("detects contradiction: forward WTP $10-25/month but $0 past spending", () => {
    const gap = detectForwardPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$0 — only free options",
        "bl-payment-3": "$10–$25/month",
      })
    );
    expect(gap).not.toBeNull();
    expect(gap!.gapType).toBe("forward_price_mismatch");
  });

  it("returns null when consistent: forward WTP high and past spending high", () => {
    const gap = detectForwardPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$50–$200",
        "bl-payment-3": "$25–$50/month",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null when forward WTP is free", () => {
    const gap = detectForwardPriceMismatch(
      makeRespondent({
        "bl-payment-1": "$0 — only free options",
        "bl-payment-3": "$0 — I'd only use it if free",
      })
    );
    expect(gap).toBeNull();
  });

  it("returns null with missing data", () => {
    expect(detectForwardPriceMismatch(makeRespondent({}))).toBeNull();
    expect(
      detectForwardPriceMismatch(
        makeRespondent({ "bl-payment-1": "$0 — only free options" })
      )
    ).toBeNull();
  });

  it("high severity for high-quality respondent", () => {
    const gap = detectForwardPriceMismatch(
      makeRespondent(
        {
          "bl-payment-1": "$0 — only free options",
          "bl-payment-3": "$50+/month",
        },
        70
      )
    );
    expect(gap).not.toBeNull();
    expect(gap!.severity).toBe("high");
  });
});
