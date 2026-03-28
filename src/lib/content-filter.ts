/**
 * Lightweight content moderation filter.
 * Blocklist-based — catches obvious violations, flags borderline content.
 * Not a replacement for ML moderation; a practical first layer.
 */

export type ContentCheckResult = {
  /** Whether the content should be saved */
  allowed: boolean;
  /** Whether the content was flagged for manual review (still saved) */
  flagged: boolean;
  /** Human-readable reason if blocked or flagged */
  reason?: string;
};

// Hard-blocked terms (slurs, severe profanity). Word-boundary matched.
// Intentionally minimal — false positives are worse than missed edge cases.
const BLOCKED_TERMS = [
  "nigger", "nigga", "faggot", "retard", "kike", "spic", "chink",
  "wetback", "tranny", "cunt",
];

// Flagged terms (mild profanity, potentially offensive). Saved but logged for review.
const FLAGGED_TERMS = [
  "fuck", "shit", "bitch", "asshole", "dick", "pussy",
  "damn", "bastard", "whore", "slut",
];

// Spam patterns
const SPAM_PATTERNS = [
  /(.)\1{9,}/,                    // 10+ repeated characters (aaaaaaaaaa)
  /[A-Z\s]{50,}/,                 // 50+ chars of ALL CAPS
  /https?:\/\/\S+.*https?:\/\/\S+/, // Multiple URLs
  /(?:buy|sell|discount|click here|free money|earn \$)/i, // Commercial spam
];

/**
 * Check a text string against content policy.
 * Use for user-entered text before saving to DB.
 */
export function checkContent(text: string): ContentCheckResult {
  if (!text || text.trim().length === 0) {
    return { allowed: true, flagged: false };
  }

  const lower = text.toLowerCase();

  // Check blocked terms (word-boundary to avoid "Scunthorpe problem")
  for (const term of BLOCKED_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(lower)) {
      return {
        allowed: false,
        flagged: false,
        reason: "Content contains language that violates our community guidelines.",
      };
    }
  }

  // Check flagged terms
  for (const term of FLAGGED_TERMS) {
    const regex = new RegExp(`\\b${term}\\b`, "i");
    if (regex.test(lower)) {
      return {
        allowed: true,
        flagged: true,
        reason: `Flagged for review: potentially inappropriate language`,
      };
    }
  }

  // Check spam patterns
  for (const pattern of SPAM_PATTERNS) {
    if (pattern.test(text)) {
      return {
        allowed: true,
        flagged: true,
        reason: "Flagged for review: possible spam pattern",
      };
    }
  }

  return { allowed: true, flagged: false };
}

/**
 * Check multiple text fields at once (e.g., campaign title + summary + tags).
 * Returns the first blocking result, or the first flagged result, or clean.
 */
export function checkMultipleFields(
  fields: { name: string; text: string }[]
): ContentCheckResult & { fieldName?: string } {
  let firstFlagged: (ContentCheckResult & { fieldName: string }) | null = null;

  for (const field of fields) {
    const result = checkContent(field.text);
    if (!result.allowed) {
      return { ...result, fieldName: field.name };
    }
    if (result.flagged && !firstFlagged) {
      firstFlagged = { ...result, fieldName: field.name };
    }
  }

  if (firstFlagged) return firstFlagged;
  return { allowed: true, flagged: false };
}

/**
 * Enforce maximum length on a text field.
 * Returns truncated text and whether it was truncated.
 */
export function enforceLength(
  text: string,
  maxLength: number
): { text: string; truncated: boolean } {
  if (text.length <= maxLength) return { text, truncated: false };
  return { text: text.slice(0, maxLength), truncated: true };
}

/** Max lengths for fields without existing validation */
export const MAX_LENGTHS = {
  PROFILE_NAME: 100,
  TAG: 50,
  ANSWER_TEXT: 10_000,
  OCCUPATION: 100,
  NICHE_QUALIFIER: 200,
} as const;
