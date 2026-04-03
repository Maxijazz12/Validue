import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEvidenceByAssumption, computeAllCoverage } from "@/lib/ai/assumption-evidence";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validate-uuid";

/**
 * GET /api/campaigns/[id]/signal
 * Returns per-assumption coverage data for the signal dashboard.
 * Auth-gated: only the campaign creator can access.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    return NextResponse.json({ error: "Invalid campaign ID" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 signal requests per user per minute
  const limit = rateLimit(`signal:${user.id}`, 60000, 30);
  if (!limit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  // Verify ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, creator_id, key_assumptions")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Not found" }, { status: 403 });
  }

  const assumptions: string[] = campaign.key_assumptions ?? [];
  if (assumptions.length === 0) {
    return NextResponse.json([]);
  }

  const evidenceMap = await getEvidenceByAssumption(id);
  const coverage = computeAllCoverage(evidenceMap, assumptions.length);

  return NextResponse.json(coverage);
}
