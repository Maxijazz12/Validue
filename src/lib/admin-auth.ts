import { timingSafeEqual } from "crypto";
import { adminEnv } from "@/lib/env";

const ADMIN_KEY = adminEnv().ADMIN_API_KEY;

/**
 * Timing-safe admin key verification.
 * Prevents brute-force via response time measurement.
 */
export function isAdminAuthorized(request: Request): boolean {
  if (!ADMIN_KEY) return false;

  const provided = request.headers.get("x-admin-key");
  if (!provided) return false;

  try {
    return timingSafeEqual(
      Buffer.from(provided),
      Buffer.from(ADMIN_KEY)
    );
  } catch {
    // Buffer length mismatch throws — treat as unauthorized
    return false;
  }
}
