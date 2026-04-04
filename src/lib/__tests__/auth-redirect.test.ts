import { describe, expect, it } from "vitest";
import {
  buildAuthCallbackUrl,
  buildAuthPageHref,
  DEFAULT_AUTH_REDIRECT_PATH,
  sanitizeAuthRedirectPath,
} from "../auth-redirect";

describe("auth redirect helpers", () => {
  it("keeps allowed dashboard paths", () => {
    expect(sanitizeAuthRedirectPath("/dashboard/ideas/123")).toBe(
      "/dashboard/ideas/123"
    );
  });

  it("keeps the reset-password path", () => {
    expect(sanitizeAuthRedirectPath("/auth/reset-password")).toBe(
      "/auth/reset-password"
    );
  });

  it("falls back for disallowed or external paths", () => {
    expect(sanitizeAuthRedirectPath("https://example.com")).toBe(
      DEFAULT_AUTH_REDIRECT_PATH
    );
    expect(sanitizeAuthRedirectPath("//example.com")).toBe(
      DEFAULT_AUTH_REDIRECT_PATH
    );
    expect(sanitizeAuthRedirectPath("/auth/login")).toBe(
      DEFAULT_AUTH_REDIRECT_PATH
    );
  });

  it("builds callback URLs with sanitized next params", () => {
    expect(
      buildAuthCallbackUrl("https://app.validue.com", "/dashboard/settings")
    ).toBe("https://app.validue.com/auth/callback?next=%2Fdashboard%2Fsettings");

    expect(
      buildAuthCallbackUrl("https://app.validue.com", "https://evil.example")
    ).toBe("https://app.validue.com/auth/callback");
  });

  it("only appends next to auth page links when needed", () => {
    expect(buildAuthPageHref("/auth/signup", "/dashboard/settings")).toBe(
      "/auth/signup?next=%2Fdashboard%2Fsettings"
    );
    expect(
      buildAuthPageHref("/auth/login", DEFAULT_AUTH_REDIRECT_PATH)
    ).toBe("/auth/login");
  });
});
