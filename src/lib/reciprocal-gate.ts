/**
 * Reciprocal Gate
 *
 * Free-tier founders must complete a set of reciprocal responses (answering
 * questions on other campaigns) before their campaign goes active.
 * Paid-tier founders are exempt.
 *
 * Gate lifecycle:
 *   1. Campaign created → gate_status = 'pending' (free) or 'exempt' (paid)
 *   2. Founder completes reciprocal responses → reciprocal_responses_completed++
 *   3. When count >= required → gate_status = 'cleared', campaign goes active
 */

import type { PlanTier } from "./plans";

/* ─── Config ─── */

/** Number of reciprocal responses required to clear the gate (free-tier only) */
export const RECIPROCAL_REQUIRED = 3;

/** Maximum questions per reciprocal response (same as partial assignment) */
export const RECIPROCAL_QUESTIONS_PER_RESPONSE = 3;

/* ─── Types ─── */

export type GateStatus = "pending" | "cleared" | "exempt";

export type GateCheck = {
  /** Whether the campaign can go active */
  canPublish: boolean;
  /** Current gate status */
  status: GateStatus;
  /** How many reciprocal responses have been completed */
  completed: number;
  /** How many are required (0 for exempt) */
  required: number;
  /** How many more needed (0 if cleared/exempt) */
  remaining: number;
};

/* ─── Pure Logic ─── */

/**
 * Determines the initial gate status for a new campaign.
 */
export function initialGateStatus(tier: PlanTier): GateStatus {
  return tier === "free" ? "pending" : "exempt";
}

/**
 * Checks whether a campaign's reciprocal gate is satisfied.
 */
export function checkGate(
  gateStatus: GateStatus | null,
  completedCount: number
): GateCheck {
  // Legacy campaigns or exempt (paid tier)
  if (!gateStatus || gateStatus === "exempt") {
    return {
      canPublish: true,
      status: "exempt",
      completed: 0,
      required: 0,
      remaining: 0,
    };
  }

  if (gateStatus === "cleared") {
    return {
      canPublish: true,
      status: "cleared",
      completed: completedCount,
      required: RECIPROCAL_REQUIRED,
      remaining: 0,
    };
  }

  // Pending
  const remaining = Math.max(0, RECIPROCAL_REQUIRED - completedCount);
  const cleared = remaining === 0;

  return {
    canPublish: cleared,
    status: cleared ? "cleared" : "pending",
    completed: completedCount,
    required: RECIPROCAL_REQUIRED,
    remaining,
  };
}

/**
 * Whether a given tier requires the reciprocal gate.
 */
export function requiresGate(tier: PlanTier): boolean {
  return tier === "free";
}
