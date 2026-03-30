import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getEvidenceByAssumption, computeAllCoverage } from "@/lib/ai/assumption-evidence";

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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
