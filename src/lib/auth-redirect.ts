export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard/the-wall";
export const OAUTH_SIGNUP_PRIMARY_MODE_WINDOW_MS = 10 * 60 * 1000;

export type OAuthSignupPrimaryMode = "respondent";

const ALLOWED_AUTH_REDIRECT_PREFIXES = [
  "/dashboard",
  "/auth/reset-password",
] as const;

export function sanitizeAuthRedirectPath(
  rawNext: string | null | undefined
): string {
  const candidate = rawNext ?? DEFAULT_AUTH_REDIRECT_PATH;

  const isAllowed =
    candidate.startsWith("/") &&
    !candidate.startsWith("//") &&
    ALLOWED_AUTH_REDIRECT_PREFIXES.some((prefix) =>
      candidate.startsWith(prefix)
    );

  return isAllowed ? candidate : DEFAULT_AUTH_REDIRECT_PATH;
}

export function buildAuthCallbackUrl(
  origin: string,
  rawNext: string | null | undefined,
  options?: {
    signupPrimaryMode?: OAuthSignupPrimaryMode | null;
  }
): string {
  const next = sanitizeAuthRedirectPath(rawNext);
  const url = new URL("/auth/callback", origin);

  if (next !== DEFAULT_AUTH_REDIRECT_PATH) {
    url.searchParams.set("next", next);
  }
  if (options?.signupPrimaryMode) {
    url.searchParams.set("signup_role", options.signupPrimaryMode);
  }

  return url.toString();
}

export function buildAuthPageHref(
  basePath: "/auth/login" | "/auth/signup",
  rawNext: string | null | undefined
): string {
  const next = sanitizeAuthRedirectPath(rawNext);

  if (next === DEFAULT_AUTH_REDIRECT_PATH) {
    return basePath;
  }

  const params = new URLSearchParams({ next });
  return `${basePath}?${params.toString()}`;
}

export function sanitizeOAuthSignupPrimaryMode(
  rawRole: string | null | undefined
): OAuthSignupPrimaryMode | null {
  return rawRole === "respondent" ? rawRole : null;
}

export function shouldApplyOAuthSignupPrimaryMode(
  requestedPrimaryMode: OAuthSignupPrimaryMode | null,
  currentRole: string | null | undefined,
  profileCreatedAt: string | Date | null | undefined,
  now = Date.now()
): boolean {
  if (requestedPrimaryMode !== "respondent") return false;
  if ((currentRole ?? "founder") !== "founder") return false;
  if (!profileCreatedAt) return false;

  const createdAtMs = new Date(profileCreatedAt).getTime();
  if (!Number.isFinite(createdAtMs)) return false;

  const ageMs = now - createdAtMs;
  return ageMs >= 0 && ageMs <= OAUTH_SIGNUP_PRIMARY_MODE_WINDOW_MS;
}
