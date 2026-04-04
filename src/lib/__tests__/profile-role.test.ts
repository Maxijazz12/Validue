import { describe, expect, it } from "vitest";
import {
  canAccessRespondentPayouts,
  getPrimaryModeLabel,
  getRespondentCapabilityLabel,
  getRespondentCapabilityState,
  normalizeProfileRole,
  shouldRequireRespondentProfile,
  shouldShowRespondentProfile,
} from "../profile-role";

describe("profile role helpers", () => {
  it("defaults unknown roles to founder", () => {
    expect(normalizeProfileRole(null)).toBe("founder");
    expect(normalizeProfileRole("admin")).toBe("founder");
  });

  it("shows respondent profile fields for respondent-first accounts", () => {
    expect(
      shouldShowRespondentProfile({
        role: "respondent",
        profile_completed: false,
      })
    ).toBe(true);
  });

  it("shows respondent profile fields for founder accounts with respondent activity", () => {
    expect(
      shouldShowRespondentProfile({
        role: "founder",
        has_responded: true,
        total_responses_completed: 3,
      })
    ).toBe(true);
  });

  it("only requires respondent profile completion when respondent signals exist", () => {
    expect(
      shouldRequireRespondentProfile({
        role: "founder",
        has_responded: false,
        profile_completed: false,
      })
    ).toBe(false);

    expect(
      shouldRequireRespondentProfile({
        role: "founder",
        has_responded: true,
        profile_completed: false,
      })
    ).toBe(true);
  });

  it("allows payout access for accounts with respondent history even if their primary mode is founder", () => {
    expect(
      canAccessRespondentPayouts({
        role: "founder",
        total_responses_completed: 2,
      })
    ).toBe(true);

    expect(
      canAccessRespondentPayouts({
        role: "founder",
        total_responses_completed: 0,
      })
    ).toBe(false);
  });

  it("exposes clear primary mode labels", () => {
    expect(getPrimaryModeLabel("founder")).toBe("Founder-first");
    expect(getPrimaryModeLabel("respondent")).toBe("Respondent-first");
  });

  it("distinguishes respondent-ready from respondent-active accounts", () => {
    expect(
      getRespondentCapabilityState({
        role: "founder",
        interests: ["SaaS"],
      })
    ).toBe("ready");

    expect(
      getRespondentCapabilityState({
        role: "founder",
        total_responses_completed: 1,
      })
    ).toBe("active");

    expect(
      getRespondentCapabilityState({
        role: "founder",
      })
    ).toBe("none");
  });

  it("exposes admin-friendly respondent capability labels", () => {
    expect(
      getRespondentCapabilityLabel({
        role: "founder",
        profile_completed: true,
      })
    ).toBe("Respondent-ready");

    expect(
      getRespondentCapabilityLabel({
        role: "founder",
        has_responded: true,
      })
    ).toBe("Respondent-active");

    expect(
      getRespondentCapabilityLabel({
        role: "founder",
      })
    ).toBe("Founder-only");
  });
});
