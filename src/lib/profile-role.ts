/**
 * `profiles.role` stores the account's preferred primary mode for onboarding
 * and default UI copy. It is not the sole authorization boundary for
 * respondent capabilities on multi-mode accounts.
 */
export type ProfileRole = "founder" | "respondent";

export type ProfileRoleSignals = {
  role?: string | null;
  has_responded?: boolean | null;
  profile_completed?: boolean | null;
  interests?: string[] | null;
  expertise?: string[] | null;
  age_range?: string | null;
  total_responses_completed?: number | null;
  available_balance_cents?: number | null;
  pending_balance_cents?: number | null;
  total_earned?: number | null;
};

export type RespondentCapabilityState = "active" | "ready" | "none";

function toNumber(value: number | string | null | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function hasSelections(values: string[] | null | undefined): boolean {
  return (values?.length ?? 0) > 0;
}

export function normalizeProfileRole(
  role: string | null | undefined
): ProfileRole {
  return role === "respondent" ? "respondent" : "founder";
}

export function prefersRespondentExperience(
  profile: Pick<ProfileRoleSignals, "role"> | string | null | undefined
): boolean {
  const role = typeof profile === "string" ? profile : profile?.role;
  return normalizeProfileRole(role) === "respondent";
}

export function hasRespondentProfileSignals(
  profile: ProfileRoleSignals | null | undefined
): boolean {
  if (!profile) return false;

  return (
    !!profile.profile_completed ||
    hasSelections(profile.interests) ||
    hasSelections(profile.expertise) ||
    !!profile.age_range
  );
}

export function hasRespondentActivity(
  profile: ProfileRoleSignals | null | undefined
): boolean {
  if (!profile) return false;

  return (
    !!profile.has_responded ||
    toNumber(profile.total_responses_completed) > 0 ||
    toNumber(profile.available_balance_cents) > 0 ||
    toNumber(profile.pending_balance_cents) > 0 ||
    toNumber(profile.total_earned) > 0
  );
}

export function shouldShowRespondentProfile(
  profile: ProfileRoleSignals | null | undefined
): boolean {
  return (
    prefersRespondentExperience(profile) ||
    hasRespondentProfileSignals(profile) ||
    hasRespondentActivity(profile)
  );
}

export function shouldRequireRespondentProfile(
  profile: ProfileRoleSignals | null | undefined
): boolean {
  return shouldShowRespondentProfile(profile) && !profile?.profile_completed;
}

export function canAccessRespondentPayouts(
  profile: ProfileRoleSignals | null | undefined
): boolean {
  return prefersRespondentExperience(profile) || hasRespondentActivity(profile);
}

export function getRespondentCapabilityState(
  profile: ProfileRoleSignals | null | undefined
): RespondentCapabilityState {
  if (canAccessRespondentPayouts(profile)) return "active";
  if (shouldShowRespondentProfile(profile)) return "ready";
  return "none";
}

export function getRespondentCapabilityLabel(
  profile: ProfileRoleSignals | null | undefined
): string {
  const state = getRespondentCapabilityState(profile);

  switch (state) {
    case "active":
      return "Respondent-active";
    case "ready":
      return "Respondent-ready";
    default:
      return "Founder-only";
  }
}

export function getPrimaryModeLabel(
  role: string | null | undefined
): string {
  return normalizeProfileRole(role) === "respondent"
    ? "Respondent-first"
    : "Founder-first";
}
