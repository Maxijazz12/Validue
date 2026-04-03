import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { synthesizeBrief } from "@/lib/ai/synthesize-brief";
import type { BriefResult } from "@/lib/ai/synthesize-brief";
import type { DecisionBrief, AssumptionVerdict, NextStep } from "@/lib/ai/brief-schemas";
import type { AssumptionCoverage } from "@/lib/ai/assumption-evidence";
import type { PriceSignal } from "@/lib/ai/extract-price-signal";
import type { ConsistencyReport } from "@/lib/ai/detect-consistency-gaps";
import type { SegmentReport } from "@/lib/ai/segment-disagreements";
import type { PriorRoundVerdicts } from "@/lib/ai/synthesize-brief";
import sql from "@/lib/db";
import { getSubscription } from "@/lib/plan-guard";
import { DEFAULTS } from "@/lib/defaults";

export const dynamic = "force-dynamic";

/** Minimum campaign funding to unlock the full Decision Brief (from defaults) */
const BRIEF_FUNDING_GATE = DEFAULTS.BRIEF_FUNDING_GATE;

/* ─── Verdict colors ─── */

const verdictColors: Record<AssumptionVerdict["verdict"], string> = {
  CONFIRMED: "bg-success/10 text-success border-success/20",
  CHALLENGED: "bg-brand/10 text-brand border-brand/20",
  REFUTED: "bg-error/10 text-error border-error/20",
  INSUFFICIENT_DATA: "bg-[#94A3B8]/10 text-slate border-[#94A3B8]/20",
};

const verdictLabels: Record<AssumptionVerdict["verdict"], string> = {
  CONFIRMED: "Confirmed",
  CHALLENGED: "Challenged",
  REFUTED: "Refuted",
  INSUFFICIENT_DATA: "Insufficient Data",
};

const recommendationColors: Record<DecisionBrief["recommendation"], string> = {
  PROCEED: "text-success",
  PIVOT: "text-brand",
  PAUSE: "text-error",
};

const effortColors: Record<NextStep["effort"], string> = {
  Low: "bg-success/10 text-success",
  Medium: "bg-brand/10 text-brand",
  High: "bg-error/10 text-error",
};

const confidenceLabels: Record<string, string> = {
  HIGH: "High confidence",
  MEDIUM: "Medium confidence",
  LOW: "Low confidence",
};

/* ─── Page ─── */

export default async function BriefPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  /* Auth */
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/auth/login");

  /* Fetch campaign */
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("id, title, description, key_assumptions, creator_id, current_responses, status, reward_amount")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) redirect("/dashboard/ideas");

  /* Check response count */
  const [{ count }] = await sql`
    SELECT COUNT(*)::int as count FROM responses
    WHERE campaign_id = ${id} AND status IN ('submitted', 'ranked')
  `;
  console.log("[brief-page] campaign:", id, "submitted/ranked count:", count);

  if (count < 3) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-12">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to campaign
        </Link>

        <div className="py-[80px] text-center border border-dashed border-border-light rounded-[32px] bg-white/90">
          <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-4 block">Insufficient Data</span>
          <p className="text-[20px] font-medium tracking-tight text-text-primary mb-[4px]">
            Not enough responses yet
          </p>
          <p className="text-[14px] text-text-secondary mt-[4px] max-w-[400px] mx-auto mb-[28px]">
            Your Decision Brief requires at least 3 submitted responses to generate meaningful insights.
            You currently have {count} response{count === 1 ? "" : "s"}.
          </p>
          <Link
            href={`/dashboard/ideas/${id}`}
            className="inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-semibold tracking-wide bg-accent text-white transition-all duration-500 hover:bg-accent-dark hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] no-underline"
          >
            View campaign
          </Link>
        </div>
      </div>
    );
  }

  /* Brief gating: full brief requires $10+ funding or a paid plan */
  const rewardAmount = Number(campaign.reward_amount) || 0;
  const sub = await getSubscription(user.id);
  const hasBriefAccess = rewardAmount >= BRIEF_FUNDING_GATE || sub.tier !== "free";

  if (!hasBriefAccess) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-12">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors mb-8"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to campaign
        </Link>

        <div className="rounded-[28px] bg-white border border-border-light shadow-card p-[32px]">
          <div className="text-center mb-6">
            <span className="font-mono text-[11px] font-medium tracking-wide text-brand uppercase block mb-[12px]">Responses Ready</span>
            <h2 className="text-[20px] font-medium tracking-tight text-text-primary mb-[8px]">
              Your responses are in
            </h2>
            <p className="text-[14px] text-text-secondary max-w-[440px] mx-auto leading-relaxed">
              You have {count} response{count === 1 ? "" : "s"} ready. To unlock the full Decision Brief with
              assumption verdicts, evidence synthesis, and next steps, fund your campaign with at least ${BRIEF_FUNDING_GATE}.
            </p>
          </div>

          {/* Preview: show assumption list without verdicts */}
          {campaign.key_assumptions && campaign.key_assumptions.length > 0 && (
            <div className="border-t border-border-light/40 pt-6 mt-6">
              <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[12px]">
                Assumptions to be tested
              </span>
              <ul className="space-y-2">
                {campaign.key_assumptions.map((a: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[14px] text-text-secondary">
                    <span className="font-mono text-[12px] font-bold text-text-muted mt-0.5 shrink-0">{i + 1}.</span>
                    <span>{a}</span>
                  </li>
                ))}
              </ul>
              <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mt-4">
                Verdicts, evidence, and recommendations are available in the full brief.
              </p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
            <Link
              href={`/dashboard/ideas/${id}`}
              className="inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-semibold tracking-wide bg-accent text-white transition-all duration-500 hover:bg-accent-dark hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.4)] no-underline"
            >
              Fund campaign
            </Link>
            <Link
              href={`/dashboard/ideas/${id}/responses`}
              className="inline-flex items-center justify-center px-[28px] py-[14px] rounded-full text-[14px] font-semibold tracking-wide bg-transparent border border-border-light text-text-secondary hover:text-text-primary hover:border-accent transition-all duration-300 no-underline"
            >
              View raw responses
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* Generate brief */
  const assumptions: string[] = campaign.key_assumptions ?? [];

  let brief: DecisionBrief;
  let coverage: AssumptionCoverage[] = [];
  let priceSignal: PriceSignal | null = null;
  let consistencyReport: ConsistencyReport | null = null;
  let segmentReport: SegmentReport | null = null;
  let roundNumber = 1;
  let parentVerdicts: PriorRoundVerdicts | null = null;
  let synthesisError = false;

  try {
    console.log("[brief-page] Calling synthesizeBrief for", campaign.id, "with", assumptions.length, "assumptions");
    const result: BriefResult = await synthesizeBrief(
      campaign.id,
      campaign.title,
      campaign.description,
      assumptions
    );
    brief = result.brief;
    coverage = result.coverage;
    priceSignal = result.priceSignal;
    consistencyReport = result.consistencyReport;
    segmentReport = result.segmentReport;
    roundNumber = result.roundNumber;
    parentVerdicts = result.parentVerdicts;
  } catch {
    synthesisError = true;
    brief = {
      recommendation: "PAUSE",
      confidence: "LOW",
      confidenceRationale: "Brief generation encountered an error. Please try again.",
      uncomfortableTruth: "We couldn't generate your brief right now. This is a temporary issue — try refreshing the page.",
      signalSummary: "Synthesis failed. Your responses are safe and you can retry.",
      assumptionVerdicts: assumptions.map((a, i) => ({
        assumption: a,
        assumptionIndex: i,
        verdict: "INSUFFICIENT_DATA" as const,
        confidence: "LOW" as const,
        evidenceSummary: "Synthesis unavailable — please retry.",
        supportingCount: 0,
        contradictingCount: 0,
        totalResponses: 0,
        quotes: [],
      })),
      strongestSignals: ["Retry brief generation to see your results."],
      nextSteps: [
        { action: "Refresh this page to retry brief generation", effort: "Low", timeline: "Now", whatItTests: "Whether the AI service is back online" },
        { action: "Review raw responses while waiting", effort: "Low", timeline: "Now", whatItTests: "Manual pattern identification" },
      ],
      cheapestTest: "Refresh this page to retry. If the issue persists, check back in a few minutes.",
    };
  }

  return (
    <article className="max-w-[720px] mx-auto px-4 py-12 pb-24">
      {/* ─── Header ─── */}
      <header className="mb-10">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-text-secondary hover:text-text-primary transition-colors mb-6"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to campaign
        </Link>
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[6px]">Decision Brief</span>
        <h1 className="text-[28px] max-md:text-[22px] font-medium tracking-tight text-text-primary leading-tight">
          {campaign.title}
        </h1>
      </header>

      {synthesisError && (
        <div className="rounded-[24px] border border-error/20 bg-error/5 backdrop-blur-xl p-[20px] mb-8">
          <span className="font-mono text-[11px] font-medium tracking-wide text-error uppercase block mb-[4px]">Synthesis Error</span>
          <p className="text-[14px] text-error/80 font-medium">
            Brief generation encountered an error. The results below are placeholder — refresh to retry.
          </p>
        </div>
      )}

      {/* ─── Methodology ─── */}
      <section className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px] mb-8">
        <div className="flex flex-wrap gap-6 max-md:gap-4">
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Responses</span>
            <span className="font-mono text-[20px] font-bold tracking-tight text-text-primary">{count}</span>
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Status</span>
            <span className="font-mono text-[20px] font-bold tracking-tight text-text-primary capitalize">{campaign.status}</span>
          </div>
          <div>
            <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Assumptions</span>
            <span className="font-mono text-[20px] font-bold tracking-tight text-text-primary">{assumptions.length}</span>
          </div>
          {roundNumber > 1 && (
            <div>
              <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Round</span>
              <span className="font-mono text-[20px] font-bold tracking-tight text-info">{roundNumber}</span>
            </div>
          )}
        </div>
        <p className="text-[12px] text-text-secondary mt-4 leading-relaxed">
          Findings are directional signal, not statistical proof. Treat verdicts as hypotheses to test further, not conclusions to bet on.
        </p>
      </section>

      {/* ─── Top-Line Recommendation ─── */}
      <section className="rounded-[28px] bg-white border border-border-light shadow-card p-[32px] mb-8 text-center">
        <span className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase block mb-[12px]">
          Recommendation
        </span>
        <p className={`text-[56px] max-md:text-[40px] font-bold leading-none tracking-tight ${recommendationColors[brief.recommendation]}`}>
          {brief.recommendation}
        </p>
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mt-[12px]">
          {confidenceLabels[brief.confidence]}
        </span>
        <p className="text-[14px] text-text-secondary mt-[8px] max-w-[520px] mx-auto leading-relaxed">
          {brief.confidenceRationale}
        </p>
      </section>

      {/* ─── The Idea ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          The Idea
        </h2>
        <blockquote className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px] text-[15px] text-text-primary leading-relaxed italic">
          {campaign.description}
        </blockquote>
      </section>

      {/* ─── Assumption Verdicts ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[16px]">
          Assumption Verdicts
        </h2>
        <div className="space-y-4">
          {brief.assumptionVerdicts.map((v, i) => (
            <div
              key={i}
              className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]"
            >
              <div className="flex items-start justify-between gap-3 mb-3 max-md:flex-col max-md:gap-2">
                <h3 className="text-[16px] font-medium tracking-tight text-text-primary leading-snug">
                  {v.assumption}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {v.confidence && (
                    <span className={`font-mono text-[11px] font-medium uppercase tracking-wide ${
                      v.confidence === "HIGH" ? "text-success"
                        : v.confidence === "MEDIUM" ? "text-brand"
                        : "text-text-muted"
                    }`}>
                      {v.confidence === "HIGH" ? "High" : v.confidence === "MEDIUM" ? "Med" : "Low"}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-md px-[10px] py-[4px] font-mono text-[11px] font-medium uppercase tracking-wide ${verdictColors[v.verdict]}`}
                  >
                    {verdictLabels[v.verdict]}
                  </span>
                </div>
              </div>

              <p className="text-[14px] text-text-secondary leading-relaxed mb-3">
                {v.evidenceSummary}
              </p>

              {(v.supportingCount > 0 || v.contradictingCount > 0) && (
                <div className="flex gap-4 font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide mb-3">
                  <span>{v.supportingCount} supporting</span>
                  <span>{v.contradictingCount} contradicting</span>
                  <span>{v.totalResponses} total</span>
                </div>
              )}

              {/* Coverage indicator */}
              {coverage[i] && coverage[i].responseCount > 0 && (
                <div className="rounded-[16px] bg-bg-muted/60 border border-border-light/40 px-4 py-3 mb-3">
                  <div className="flex items-center justify-between mb-[8px]">
                    <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
                      Evidence strength
                    </span>
                    <span className={`font-mono text-[11px] font-medium px-[8px] py-[3px] rounded-md uppercase tracking-wide ${
                      coverage[i].strength === "strong"
                        ? "bg-success/10 text-success"
                        : coverage[i].strength === "moderate"
                          ? "bg-brand/10 text-brand"
                          : "bg-[#94A3B8]/10 text-text-muted"
                    }`}>
                      {coverage[i].strength}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Avg quality</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-[3px] flex-1 bg-bg-muted overflow-hidden">
                          <div className="h-full bg-success" style={{ width: `${coverage[i].avgQuality}%` }} />
                        </div>
                        <span className="font-mono text-[12px] font-bold text-text-primary">{coverage[i].avgQuality}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Avg match</span>
                      <div className="flex items-center gap-1.5">
                        <div className="h-[3px] flex-1 bg-bg-muted overflow-hidden">
                          <div className="h-full bg-info" style={{ width: `${coverage[i].avgMatch}%` }} />
                        </div>
                        <span className="font-mono text-[12px] font-bold text-text-primary">{coverage[i].avgMatch}</span>
                      </div>
                    </div>
                    <div>
                      <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted block mb-[4px]">Categories</span>
                      <div className="flex flex-wrap gap-1">
                        {coverage[i].categories.map((cat) => (
                          <span key={cat} className={`font-mono text-[11px] font-medium px-[6px] py-[2px] rounded-md uppercase tracking-wide ${
                            cat === "negative" ? "bg-error/10 text-error" : "bg-bg-muted text-text-muted"
                          }`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {v.quotes.length > 0 && (
                <div className="space-y-2 mb-3">
                  {v.quotes.map((q, qi) => (
                    <blockquote
                      key={qi}
                      className="border-l-2 border-border-light pl-3 text-[13px] text-text-secondary italic leading-relaxed"
                    >
                      &ldquo;{q.text}&rdquo;
                      <span className="block text-[11px] text-slate mt-0.5 not-italic">
                        — {q.respondentLabel}
                      </span>
                    </blockquote>
                  ))}
                </div>
              )}

              {v.contradictingSignal && (
                <div className="rounded-xl bg-[#FEF2F2] border border-error/10 px-4 py-3 text-[13px] text-error/80 leading-relaxed">
                  <span className="font-medium text-error">Contradicting signal: </span>
                  {v.contradictingSignal}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── Verdict Changes (Round 2+) ─── */}
      {parentVerdicts && parentVerdicts.verdicts.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
            Changes from Round {roundNumber - 1}
          </h2>
          <div className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
            {/* Recommendation change */}
            {parentVerdicts.recommendation !== brief.recommendation && (
              <div className="rounded-xl bg-bg-muted border border-border-light px-4 py-3 mb-4 text-[14px]">
                <span className="text-slate">Recommendation: </span>
                <span className="font-semibold text-text-secondary">{parentVerdicts.recommendation}</span>
                <span className="mx-2 text-slate">&rarr;</span>
                <span className={`font-semibold ${recommendationColors[brief.recommendation]}`}>{brief.recommendation}</span>
              </div>
            )}

            <div className="space-y-2">
              {brief.assumptionVerdicts.map((v) => {
                // Match by text, fallback to index
                const prev = parentVerdicts.verdicts.find((pv) => pv.assumption === v.assumption)
                  ?? parentVerdicts.verdicts[v.assumptionIndex];
                if (!prev) return null;

                const changed = prev.verdict !== v.verdict;
                const improved = (prev.verdict === "REFUTED" || prev.verdict === "CHALLENGED" || prev.verdict === "INSUFFICIENT_DATA")
                  && (v.verdict === "CONFIRMED" || (prev.verdict === "REFUTED" && v.verdict === "CHALLENGED"));
                const regressed = (prev.verdict === "CONFIRMED" || prev.verdict === "CHALLENGED")
                  && (v.verdict === "REFUTED" || (prev.verdict === "CONFIRMED" && v.verdict === "CHALLENGED"));

                return (
                  <div
                    key={v.assumptionIndex}
                    className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                      !changed
                        ? "bg-bg-muted border border-border-light text-text-secondary"
                        : improved
                          ? "bg-success/5 border border-success/15 text-[#15803d]"
                          : regressed
                            ? "bg-[#FEF2F2] border border-error/10 text-error/80"
                            : "bg-[#FEF3C7] border border-warning/20 text-[#92400E]"
                    }`}
                  >
                    <span className="font-medium block mb-1">{v.assumption}</span>
                    <span className="text-[12px]">
                      {prev.verdict}
                      <span className="mx-1.5">&rarr;</span>
                      {v.verdict}
                      {!changed && " (unchanged)"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ─── The Uncomfortable Truth ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          The Uncomfortable Truth
        </h2>
        <div className="rounded-[24px] bg-white border border-border-light border-l-4 border-l-brand/40 shadow-card p-[24px]">
          <p className="text-[15px] text-text-primary font-medium tracking-tight leading-relaxed">
            {brief.uncomfortableTruth}
          </p>
        </div>
      </section>

      {/* ─── Signal Summary ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          Signal Summary
        </h2>
        <p className="text-[15px] text-text-primary font-medium tracking-tight leading-relaxed rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
          {brief.signalSummary}
        </p>
      </section>

      {/* ─── Strongest Signals ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          Strongest Signals
        </h2>
        <div className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
          <ul className="space-y-2">
            {brief.strongestSignals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] text-text-primary font-medium leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-success shrink-0" />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Price Signal ─── */}
      {priceSignal && priceSignal.respondentCount > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
            Willingness to Pay
          </h2>
          <div className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
            <p className="text-[15px] text-text-primary leading-relaxed font-medium mb-4">
              {priceSignal.interpretation}
            </p>

            {Object.keys(priceSignal.priceCeilingDistribution).length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[8px]">
                  Price ceiling (max paid for similar tools)
                </p>
                <div className="space-y-1.5">
                  {Object.entries(priceSignal.priceCeilingDistribution).map(([tier, count]) => (
                    <div key={tier} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[13px] text-text-secondary">{tier}</span>
                          <span className="text-[12px] text-slate font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border-light">
                          <div
                            className="h-1.5 rounded-full bg-info"
                            style={{ width: `${(count / priceSignal.respondentCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {Object.keys(priceSignal.pastSpendingDistribution).length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[8px]">
                  Past spending (last 12 months)
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(priceSignal.pastSpendingDistribution).map(([tier, count]) => (
                    <span key={tier} className="inline-flex items-center gap-1.5 rounded-full bg-bg-muted px-3 py-1 text-[12px] text-text-secondary">
                      {tier} <span className="font-semibold text-text-primary">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {priceSignal.forwardWtpDistribution && Object.keys(priceSignal.forwardWtpDistribution).length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[8px]">
                  Forward WTP (what they&apos;d pay)
                </p>
                <div className="space-y-1.5">
                  {Object.entries(priceSignal.forwardWtpDistribution).map(([tier, count]) => (
                    <div key={tier} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="text-[13px] text-text-secondary">{tier}</span>
                          <span className="text-[12px] text-slate font-medium">{count}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-border-light">
                          <div
                            className="h-1.5 rounded-full bg-success"
                            style={{ width: `${(count / priceSignal.respondentCount) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {priceSignal.preferredModelDistribution && Object.keys(priceSignal.preferredModelDistribution).length > 0 && (
              <div className="mb-4">
                <p className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted mb-[8px]">
                  Preferred payment model
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(priceSignal.preferredModelDistribution).map(([model, count]) => (
                    <span key={model} className="inline-flex items-center gap-1.5 rounded-full bg-bg-muted px-3 py-1 text-[12px] text-text-secondary">
                      {model} <span className="font-semibold text-text-primary">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {priceSignal.matchSkew && (
              <div className="rounded-xl bg-[#FEF3C7] border border-warning/20 px-4 py-3 text-[13px] text-[#92400E] leading-relaxed">
                {priceSignal.matchSkew}
              </div>
            )}

            <p className="text-[11px] text-slate mt-3">
              Based on {priceSignal.respondentCount} respondent{priceSignal.respondentCount === 1 ? "" : "s"} who answered baseline price questions.
            </p>
          </div>
        </section>
      )}

      {/* ─── Behavioral Consistency ─── */}
      {consistencyReport && consistencyReport.gaps.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
            Behavioral Consistency
          </h2>
          <div className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
            <p className="text-[15px] text-text-primary leading-relaxed font-medium mb-4">
              {consistencyReport.summary}
            </p>
            <div className="space-y-3">
              {consistencyReport.gaps.map((gap, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                    gap.severity === "high"
                      ? "bg-[#FEF2F2] border border-error/10 text-error/80"
                      : "bg-[#FEF3C7] border border-warning/20 text-[#92400E]"
                  }`}
                >
                  <span className="font-medium">
                    {gap.respondentLabel}
                  </span>
                  {" "}said &ldquo;{gap.statedAnswer}&rdquo; but &ldquo;{gap.behavioralAnswer}&rdquo;
                  <span className="block text-[11px] mt-1 opacity-70">
                    {gap.gapType.replace("_", " ")} · quality {gap.qualityScore}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Audience Segment Disagreements ─── */}
      {segmentReport && segmentReport.disagreements.length > 0 && (
        <section className="mb-8">
          <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
            Audience Segments
          </h2>
          <div className="rounded-[24px] bg-white border border-border-light shadow-card p-[24px]">
            <p className="text-[15px] text-text-primary leading-relaxed font-medium mb-4">
              {segmentReport.summary}
            </p>
            <div className="space-y-3">
              {segmentReport.disagreements.map((d, i) => (
                <div
                  key={i}
                  className={`rounded-xl px-4 py-3 text-[13px] leading-relaxed ${
                    d.severity === "high"
                      ? "bg-[#FEF2F2] border border-error/10 text-error/80"
                      : "bg-[#FEF3C7] border border-warning/20 text-[#92400E]"
                  }`}
                >
                  <span className="font-medium">
                    {d.assumption}
                  </span>
                  <p className="mt-1">{d.signal}</p>
                  <div className="flex gap-4 text-[11px] mt-2 opacity-70">
                    <span>High-match: {Math.round(d.highMatchSupportRatio * 100)}% support (n={d.highMatchCount})</span>
                    <span>Low-match: {Math.round(d.lowMatchSupportRatio * 100)}% support (n={d.lowMatchCount})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ─── Next Steps ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          Next Steps
        </h2>
        <div className="rounded-[24px] bg-white border border-border-light shadow-card overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-border-light/40 bg-bg-muted/40">
                  <th className="px-5 py-3 font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide">Action</th>
                  <th className="px-5 py-3 font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide w-[90px]">Effort</th>
                  <th className="px-5 py-3 font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide w-[100px]">Timeline</th>
                  <th className="px-5 py-3 font-mono text-[11px] font-medium text-text-muted uppercase tracking-wide">What It Tests</th>
                </tr>
              </thead>
              <tbody>
                {brief.nextSteps.map((step, i) => (
                  <tr key={i} className="border-b border-border-light last:border-0">
                    <td className="px-5 py-3.5 text-[14px] text-text-primary">{step.action}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${effortColors[step.effort]}`}>
                        {step.effort}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-text-secondary">{step.timeline}</td>
                    <td className="px-5 py-3.5 text-[13px] text-text-secondary">{step.whatItTests}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden divide-y divide-[#E2E8F0]">
            {brief.nextSteps.map((step, i) => (
              <div key={i} className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[14px] text-text-primary font-medium">{step.action}</p>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${effortColors[step.effort]}`}>
                    {step.effort}
                  </span>
                </div>
                <div className="flex gap-3 text-[12px] text-slate">
                  <span>{step.timeline}</span>
                </div>
                <p className="text-[13px] text-text-secondary">{step.whatItTests}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cheapest Test This Week ─── */}
      <section className="mb-8">
        <h2 className="font-mono text-[11px] font-medium tracking-wide text-text-muted uppercase mb-[12px]">
          Cheapest Test This Week
        </h2>
        <div className="rounded-[24px] border border-dashed border-border-light bg-white/90 p-[24px]">
          <p className="text-[15px] text-text-primary leading-relaxed font-medium tracking-tight">
            {brief.cheapestTest}
          </p>
        </div>
      </section>

      {/* ─── Footer disclaimer ─── */}
      <footer className="text-center pt-8">
        <span className="font-mono text-[11px] font-medium uppercase tracking-wide text-text-muted">
          Generated by VLDTA · {count} response{count === 1 ? "" : "s"} · humans + AI synthesis
        </span>
      </footer>
    </article>
  );
}
