import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import FundCampaignButton from "@/components/dashboard/FundCampaignButton";

/* ─── Helpers ─── */

const statusColors: Record<string, string> = {
  draft: "bg-[#f5f2ed] text-[#999999]",
  pending_funding: "bg-[#f59e0b]/10 text-[#f59e0b]",
  active: "bg-[#22c55e]/10 text-[#22c55e]",
  completed: "bg-[#3b82f6]/10 text-[#3b82f6]",
  paused: "bg-[#e8b87a]/10 text-[#e8b87a]",
};

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function DimensionBar({ label, score }: { label: string; score: number }) {
  let color: string;
  if (score >= 70) color = "#22c55e";
  else if (score >= 40) color = "#e8b87a";
  else color = "#ef4444";

  return (
    <div className="flex items-center gap-[8px]">
      <span className="text-[13px] text-[#555555] w-[120px] shrink-0">
        {label}
      </span>
      <div className="flex-1 h-[6px] rounded-full bg-[#f5f2ed] overflow-hidden">
        <div
          className="h-full rounded-full"
          style={{ width: `${score}%`, background: color }}
        />
      </div>
      <span
        className="text-[12px] font-semibold w-[28px] text-right"
        style={{ color }}
      >
        {score}
      </span>
    </div>
  );
}

/* ─── Page ─── */

export default async function CampaignDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ funded?: string }>;
}) {
  const { id } = await params;
  const { funded } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  // Fetch campaign (creator only)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) redirect("/dashboard/ideas");

  // Fetch questions
  const { data: questions } = await supabase
    .from("questions")
    .select("*")
    .eq("campaign_id", id)
    .order("sort_order", { ascending: true });

  const allQuestions = questions || [];
  const openQs = allQuestions.filter(
    (q) => !q.is_baseline && q.type === "open" && (!q.category || !["interest", "willingness", "payment", "behavior", "pain"].includes(q.category))
  );
  const baselineQs = allQuestions.filter((q) => q.is_baseline);
  // followups: open questions that aren't in the "open" bucket and aren't baseline
  const openIds = new Set(openQs.map((q) => q.id));
  const baselineIds = new Set(baselineQs.map((q) => q.id));
  const followupQs = allQuestions.filter(
    (q) => !openIds.has(q.id) && !baselineIds.has(q.id)
  );

  const progress =
    campaign.target_responses > 0
      ? Math.min(
          (campaign.current_responses / campaign.target_responses) * 100,
          100
        )
      : 0;

  const qualityScores = campaign.quality_scores as {
    audienceClarity?: number;
    questionQuality?: number;
    behavioralCoverage?: number;
    monetizationCoverage?: number;
    overall?: number;
  } | null;

  const assumptions: string[] = campaign.key_assumptions || [];

  const targetingFields = [
    {
      label: "Interests",
      values: campaign.target_interests as string[] | null,
    },
    {
      label: "Expertise",
      values: campaign.target_expertise as string[] | null,
    },
    {
      label: "Age ranges",
      values: campaign.target_age_ranges as string[] | null,
    },
  ];

  const textFields = [
    { label: "Location", value: campaign.target_location },
    { label: "Occupation", value: campaign.audience_occupation },
    { label: "Industry", value: campaign.audience_industry },
    { label: "Experience level", value: campaign.audience_experience_level },
    { label: "Niche qualifier", value: campaign.audience_niche_qualifier },
  ];

  return (
    <>
      {/* ─── Header ─── */}
      <div className="mb-[32px]">
        <Link
          href="/dashboard/ideas"
          className="inline-flex items-center gap-[6px] text-[13px] text-[#999999] hover:text-[#555555] transition-colors no-underline mb-[16px]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back to Ideas
        </Link>

        <div className="flex items-center justify-between gap-[12px] max-md:flex-col max-md:items-start max-md:gap-[8px]">
          <h1 className="text-[28px] font-bold text-[#111111] tracking-[-0.5px]">
            {campaign.title}
          </h1>
          <span
            className={`px-[12px] py-[5px] rounded-full text-[12px] font-semibold uppercase tracking-[0.5px] shrink-0 ${
              statusColors[campaign.status] || statusColors.draft
            }`}
          >
            {campaign.status === "pending_funding" ? "Pending Funding" : campaign.status}
          </span>
        </div>
      </div>

      {/* ─── Funding Banner ─── */}
      {funded === "true" && campaign.status === "active" && (
        <div className="mb-[16px] px-[16px] py-[12px] rounded-lg bg-[#22c55e]/10 border border-[#22c55e]/20 text-[13px] text-[#22c55e] font-medium">
          Campaign funded successfully — it&apos;s now live on The Wall!
        </div>
      )}

      {campaign.status === "pending_funding" && (
        <div className="mb-[16px] bg-white border border-[#f59e0b]/30 rounded-xl p-[20px] flex items-center justify-between gap-[16px] max-md:flex-col">
          <div>
            <p className="text-[15px] font-semibold text-[#111111]">
              Fund this campaign to go live
            </p>
            <p className="text-[13px] text-[#555555] mt-[2px]">
              Reward pool: ${campaign.reward_amount?.toFixed(2)}. Your campaign will appear on The Wall once funded.
            </p>
          </div>
          <FundCampaignButton campaignId={campaign.id} />
        </div>
      )}

      {/* ─── Stats Row ─── */}
      <div className="grid grid-cols-4 gap-[12px] mb-[24px] max-md:grid-cols-2">
        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Responses
          </span>
          <div className="mt-[4px]">
            <span className="font-mono text-[22px] font-bold text-[#111111]">
              {campaign.current_responses}
            </span>
            <span className="text-[13px] text-[#999999]">
              /{campaign.target_responses}
            </span>
          </div>
          <div className="h-[4px] rounded-full bg-[#f5f2ed] overflow-hidden mt-[8px]">
            <div
              className="h-full rounded-full bg-[#65a30d]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Category
          </span>
          <div className="font-semibold text-[15px] text-[#111111] mt-[4px]">
            {campaign.category || "—"}
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Est. Time
          </span>
          <div className="font-mono text-[15px] font-semibold text-[#111111] mt-[4px]">
            {campaign.estimated_minutes || 5} min
          </div>
        </div>

        <div className="bg-white border border-[#ebebeb] rounded-xl p-[16px]">
          <span className="text-[11px] text-[#999999] uppercase tracking-[1px]">
            Created
          </span>
          <div className="text-[15px] font-semibold text-[#111111] mt-[4px]">
            {formatDate(campaign.created_at)}
          </div>
        </div>
      </div>

      {/* ─── View Responses CTA ─── */}
      {campaign.current_responses > 0 && (
        <Link
          href={`/dashboard/ideas/${campaign.id}/responses`}
          className="block bg-white border border-[#ebebeb] rounded-xl p-[16px] mb-[24px] hover:shadow-[0_2px_12px_rgba(0,0,0,0.04)] transition-shadow no-underline group"
        >
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[15px] font-semibold text-[#111111] group-hover:text-[#000000] transition-colors">
                View {campaign.current_responses} Response{campaign.current_responses !== 1 ? "s" : ""}
              </span>
              <span className="text-[13px] text-[#999999] ml-[8px]">
                {campaign.ranking_status === "ranked" ? "Ranked" : "Ready to rank"}
              </span>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#999999" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </div>
        </Link>
      )}

      {/* ─── Description ─── */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">
          Description
        </h2>
        <p className="text-[14px] text-[#555555] leading-[1.6] whitespace-pre-wrap">
          {campaign.description || "No description provided."}
        </p>
        {campaign.tags && (campaign.tags as string[]).length > 0 && (
          <div className="flex flex-wrap gap-[6px] mt-[16px]">
            {(campaign.tags as string[]).map((tag) => (
              <span
                key={tag}
                className="text-[11px] px-[8px] py-[3px] rounded-full bg-[#f5f2ed] text-[#555555]"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ─── Key Assumptions ─── */}
      {assumptions.length > 0 && (
        <div className="bg-white border border-[#ebebeb] rounded-2xl p-[32px] mb-[24px]">
          <h2 className="text-[16px] font-semibold text-[#111111] mb-[12px]">
            Key Assumptions
          </h2>
          <div className="flex flex-col gap-[10px]">
            {assumptions.map((a, i) => (
              <div key={i} className="flex items-start gap-[10px]">
                <span className="text-[12px] text-[#999999] font-mono w-[20px] shrink-0 mt-[2px]">
                  {i + 1}.
                </span>
                <p className="text-[14px] text-[#111111] leading-[1.5]">{a}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── Survey Questions ─── */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[20px]">
          Survey Questions
        </h2>

        {allQuestions.length === 0 ? (
          <p className="text-[13px] text-[#999999]">No questions found.</p>
        ) : (
          <div className="flex flex-col gap-[24px]">
            {/* Open-ended */}
            {openQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#555555] mb-[10px]">
                  Open-ended
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {openQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={i + 1}
                      text={q.text}
                      type="open"
                      options={q.options}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Follow-up */}
            {followupQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#555555] mb-[10px]">
                  Follow-up
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {followupQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={openQs.length + i + 1}
                      text={q.text}
                      type={q.type}
                      options={q.options}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Baseline */}
            {baselineQs.length > 0 && (
              <div>
                <h3 className="text-[13px] font-semibold text-[#555555] mb-[10px]">
                  Baseline
                </h3>
                <div className="flex flex-col gap-[8px]">
                  {baselineQs.map((q, i) => (
                    <QuestionRow
                      key={q.id}
                      index={openQs.length + followupQs.length + i + 1}
                      text={q.text}
                      type="baseline"
                      options={q.options}
                      category={q.category}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Audience Targeting ─── */}
      <div className="bg-white border border-[#ebebeb] rounded-2xl p-[32px] mb-[24px]">
        <h2 className="text-[16px] font-semibold text-[#111111] mb-[16px]">
          Audience Targeting
        </h2>

        <div className="flex flex-col gap-[16px]">
          {targetingFields.map(
            ({ label, values }) =>
              values &&
              values.length > 0 && (
                <div key={label}>
                  <span className="text-[13px] font-medium text-[#555555] block mb-[6px]">
                    {label}
                  </span>
                  <div className="flex flex-wrap gap-[6px]">
                    {values.map((v) => (
                      <span
                        key={v}
                        className="text-[12px] px-[10px] py-[4px] rounded-full bg-[#f5f2ed] text-[#111111]"
                      >
                        {v}
                      </span>
                    ))}
                  </div>
                </div>
              )
          )}

          {textFields.some((f) => f.value) && (
            <div className="grid grid-cols-2 gap-[12px] max-md:grid-cols-1">
              {textFields.map(
                ({ label, value }) =>
                  value && (
                    <div key={label}>
                      <span className="text-[13px] font-medium text-[#555555] block mb-[2px]">
                        {label}
                      </span>
                      <span className="text-[14px] text-[#111111]">
                        {value}
                      </span>
                    </div>
                  )
              )}
            </div>
          )}

          {!targetingFields.some((f) => f.values && f.values.length > 0) &&
            !textFields.some((f) => f.value) && (
              <p className="text-[13px] text-[#999999]">
                No audience targeting configured.
              </p>
            )}
        </div>
      </div>

      {/* ─── Quality Scores ─── */}
      {qualityScores && qualityScores.overall !== undefined && (
        <div className="bg-white border border-[#e8b87a]/30 rounded-2xl p-[32px] mb-[24px]">
          <div className="flex items-center justify-between mb-[16px]">
            <h2 className="text-[16px] font-semibold text-[#111111]">
              Signal Strength
            </h2>
            <span
              className="text-[14px] font-semibold"
              style={{
                color:
                  qualityScores.overall >= 75
                    ? "#22c55e"
                    : qualityScores.overall >= 50
                      ? "#e8b87a"
                      : "#ef4444",
              }}
            >
              {qualityScores.overall}/100
            </span>
          </div>
          <div className="flex flex-col gap-[8px]">
            {qualityScores.audienceClarity !== undefined && (
              <DimensionBar
                label="Audience"
                score={qualityScores.audienceClarity}
              />
            )}
            {qualityScores.questionQuality !== undefined && (
              <DimensionBar
                label="Questions"
                score={qualityScores.questionQuality}
              />
            )}
            {qualityScores.behavioralCoverage !== undefined && (
              <DimensionBar
                label="Behavioral"
                score={qualityScores.behavioralCoverage}
              />
            )}
            {qualityScores.monetizationCoverage !== undefined && (
              <DimensionBar
                label="Monetization"
                score={qualityScores.monetizationCoverage}
              />
            )}
          </div>
        </div>
      )}
    </>
  );
}

/* ─── QuestionRow ─── */

function QuestionRow({
  index,
  text,
  type,
  options,
  category,
}: {
  index: number;
  text: string;
  type: string;
  options: string[] | { choices: string[] } | null;
  category?: string | null;
}) {
  // Handle both flat array and legacy { choices: [...] } format
  const optionsList: string[] | null = options
    ? Array.isArray(options)
      ? options
      : (options as { choices?: string[] }).choices ?? null
    : null;

  return (
    <div className="flex gap-[12px] p-[14px] rounded-xl border border-[#ebebeb]">
      <div className="flex-shrink-0 w-[24px] h-[24px] rounded-full bg-[#f5f2ed] flex items-center justify-center">
        <span className="text-[11px] font-semibold text-[#555555]">
          {index}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-[6px] mb-[4px]">
          <span
            className={`text-[10px] font-semibold tracking-[1px] uppercase px-[6px] py-[1px] rounded-full ${
              type === "baseline"
                ? "bg-[#e8b87a]/15 text-[#b8860b]"
                : type === "open"
                  ? "bg-[#dbeafe] text-[#1d4ed8]"
                  : "bg-[#f3e8ff] text-[#7c3aed]"
            }`}
          >
            {type === "baseline"
              ? "Baseline"
              : type === "open"
                ? "Open"
                : "Follow-up"}
          </span>
          {category && (
            <span className="text-[10px] text-[#999999]">{category}</span>
          )}
        </div>
        <p className="text-[14px] text-[#111111] leading-[1.5]">{text}</p>
        {optionsList && optionsList.length > 0 && (
          <div className="flex flex-wrap gap-[4px] mt-[8px]">
            {optionsList.map((opt) => (
              <span
                key={opt}
                className="text-[11px] px-[8px] py-[3px] rounded-full border border-[#ebebeb] text-[#555555] bg-[#fafafa]"
              >
                {opt}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
