import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getSubscription } from "@/lib/plan-guard";
import { PLAN_CONFIG } from "@/lib/plans";
import { rateLimit } from "@/lib/rate-limit";
import { isValidUuid } from "@/lib/validate-uuid";

function escapeCsv(value: string): string {
  // Neutralise formula injection: prefix formula-starting chars so spreadsheets
  // treat the cell as text rather than executing it.
  let safe = value;
  if (/^[=+\-@\t\r]/.test(safe)) {
    safe = `'${safe}`;
  }
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

export async function GET(request: NextRequest) {
  const campaignId = request.nextUrl.searchParams.get("campaignId");
  if (!campaignId || !isValidUuid(campaignId)) {
    return NextResponse.json({ error: "Missing or invalid campaignId" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Rate limit: 10 exports per user per minute, 3 per campaign per minute
  const userLimit = rateLimit(`export:${user.id}`, 60000, 10);
  if (!userLimit.allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  const campaignLimit = rateLimit(`export:campaign:${campaignId}`, 60000, 3);
  if (!campaignLimit.allowed) {
    return NextResponse.json({ error: "Too many exports for this campaign" }, { status: 429 });
  }

  // Check plan tier allows export
  const sub = await getSubscription(user.id);
  const planConfig = PLAN_CONFIG[sub.tier];
  if (!planConfig.hasExport) {
    return NextResponse.json(
      { error: "CSV export requires Pro plan" },
      { status: 403 }
    );
  }

  // Verify campaign ownership
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, creator_id")
    .eq("id", campaignId)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  // Fetch questions and responses in parallel
  const [{ data: questions }, { data: responses }] = await Promise.all([
    supabase
      .from("questions")
      .select("id, text, type, sort_order")
      .eq("campaign_id", campaignId)
      .order("sort_order", { ascending: true }),
    supabase
      .from("responses")
      .select(
        "id, status, quality_score, ai_feedback, scoring_source, scoring_confidence, payout_amount, created_at, ranked_at, respondent:profiles!respondent_id(full_name, reputation_tier)"
      )
      .eq("campaign_id", campaignId)
      .in("status", ["submitted", "ranked"])
      .order("quality_score", { ascending: false, nullsFirst: false }),
  ]);

  const questionList = questions || [];
  const _questionMap = new Map(questionList.map((q) => [q.id, q]));

  if (!responses || responses.length === 0) {
    return NextResponse.json({ error: "No responses to export" }, { status: 404 });
  }

  // Fetch all answers
  const responseIds = responses.map((r) => r.id);
  const { data: allAnswers } = await supabase
    .from("answers")
    .select("response_id, question_id, text, metadata")
    .in("response_id", responseIds);

  const answersByResponse = new Map<string, Map<string, string>>();
  for (const a of allAnswers || []) {
    if (!answersByResponse.has(a.response_id)) {
      answersByResponse.set(a.response_id, new Map());
    }
    answersByResponse.get(a.response_id)!.set(a.question_id, a.text || "");
  }

  // Build CSV
  const headers = [
    "Respondent",
    "Reputation Tier",
    "Status",
    "Quality Score",
    "AI Feedback",
    "Scoring Source",
    "Payout Amount",
    "Submitted At",
    "Ranked At",
    ...questionList.map((q) => `Q: ${q.text}`),
  ];

  const rows = responses.map((r) => {
    const respondentRaw = r.respondent as unknown;
    const respondent = (
      Array.isArray(respondentRaw) ? respondentRaw[0] : respondentRaw
    ) as { full_name: string; reputation_tier: string | null } | null;

    const answers = answersByResponse.get(r.id) || new Map();

    return [
      respondent?.full_name || "Anonymous",
      respondent?.reputation_tier || "new",
      r.status,
      r.quality_score != null ? String(r.quality_score) : "",
      r.ai_feedback || "",
      r.scoring_source || "",
      r.payout_amount != null ? String(r.payout_amount) : "",
      r.created_at ? new Date(r.created_at).toISOString() : "",
      r.ranked_at ? new Date(r.ranked_at).toISOString() : "",
      ...questionList.map((q) => answers.get(q.id) || ""),
    ];
  });

  const csv = [
    headers.map(escapeCsv).join(","),
    ...rows.map((row) => row.map(escapeCsv).join(",")),
  ].join("\n");

  const filename = `${campaign.title.replace(/[^a-zA-Z0-9]/g, "_")}_responses.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
