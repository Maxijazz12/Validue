export const DEFAULT_AUTH_REDIRECT_PATH = "/dashboard/the-wall";

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
  rawNext: string | null | undefined
): string {
  const next = sanitizeAuthRedirectPath(rawNext);
  const url = new URL("/auth/callback", origin);

  if (next !== DEFAULT_AUTH_REDIRECT_PATH) {
    url.searchParams.set("next", next);
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
