import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { synthesizeBrief } from "@/lib/ai/synthesize-brief";
import type { BriefResult } from "@/lib/ai/synthesize-brief";
import type { DecisionBrief, AssumptionVerdict, NextStep } from "@/lib/ai/brief-schemas";
import type { AssumptionCoverage } from "@/lib/ai/assumption-evidence";
import sql from "@/lib/db";

/* ─── Verdict colors ─── */

const verdictColors: Record<AssumptionVerdict["verdict"], string> = {
  CONFIRMED: "bg-[#22c55e]/10 text-[#22c55e] border-[#22c55e]/20",
  CHALLENGED: "bg-[#E5654E]/10 text-[#E5654E] border-[#E5654E]/20",
  REFUTED: "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/20",
  INSUFFICIENT_DATA: "bg-[#94A3B8]/10 text-[#94A3B8] border-[#94A3B8]/20",
};

const verdictLabels: Record<AssumptionVerdict["verdict"], string> = {
  CONFIRMED: "Confirmed",
  CHALLENGED: "Challenged",
  REFUTED: "Refuted",
  INSUFFICIENT_DATA: "Insufficient Data",
};

const recommendationColors: Record<DecisionBrief["recommendation"], string> = {
  PROCEED: "text-[#22c55e]",
  PIVOT: "text-[#E5654E]",
  PAUSE: "text-[#ef4444]",
};

const effortColors: Record<NextStep["effort"], string> = {
  Low: "bg-[#22c55e]/10 text-[#22c55e]",
  Medium: "bg-[#E5654E]/10 text-[#E5654E]",
  High: "bg-[#ef4444]/10 text-[#ef4444]",
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
    .select("id, title, description, key_assumptions, creator_id, current_responses, status")
    .eq("id", id)
    .eq("creator_id", user.id)
    .single();

  if (!campaign) redirect("/dashboard/ideas");

  /* Check response count */
  const [{ count }] = await sql`
    SELECT COUNT(*)::int as count FROM responses
    WHERE campaign_id = ${id} AND status IN ('submitted', 'ranked')
  `;

  if (count < 3) {
    return (
      <div className="max-w-[720px] mx-auto px-4 py-12">
        <Link
          href={`/dashboard/ideas/${id}`}
          className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#111111] transition-colors mb-8"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to campaign
        </Link>

        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[32px] text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#F1F5F9]">
            <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
              <path d="M12 8v4m0 4h.01" stroke="#94A3B8" strokeWidth="2" strokeLinecap="round" />
              <circle cx="12" cy="12" r="10" stroke="#94A3B8" strokeWidth="2" />
            </svg>
          </div>
          <h2 className="text-[18px] font-semibold text-[#111111] mb-2">
            Not enough responses yet
          </h2>
          <p className="text-[14px] text-[#64748B] mb-4 max-w-[400px] mx-auto">
            Your Decision Brief requires at least 3 submitted responses to generate meaningful insights.
            You currently have {count} response{count === 1 ? "" : "s"}.
          </p>
          <Link
            href={`/dashboard/ideas/${id}`}
            className="inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[#222222] transition-colors"
          >
            View campaign
          </Link>
        </div>
      </div>
    );
  }

  /* Generate brief */
  const assumptions: string[] = campaign.key_assumptions ?? [];

  let brief: DecisionBrief;
  let coverage: AssumptionCoverage[] = [];
  let synthesisError = false;

  try {
    const result: BriefResult = await synthesizeBrief(
      campaign.id,
      campaign.title,
      campaign.description,
      assumptions
    );
    brief = result.brief;
    coverage = result.coverage;
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
          className="inline-flex items-center gap-1.5 text-[13px] text-[#64748B] hover:text-[#111111] transition-colors mb-6"
        >
          <svg width="16" height="16" fill="none" viewBox="0 0 16 16">
            <path d="M10 12L6 8l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to campaign
        </Link>
        <h1 className="text-[28px] max-md:text-[22px] font-bold text-[#111111] leading-tight">
          Decision Brief
        </h1>
        <p className="text-[15px] text-[#64748B] mt-1">{campaign.title}</p>
      </header>

      {synthesisError && (
        <div className="rounded-2xl border border-[#ef4444]/20 bg-[#ef4444]/5 p-4 mb-6">
          <p className="text-[14px] text-[#ef4444] font-medium">
            Brief generation encountered an error. The results below are placeholder — refresh to retry.
          </p>
        </div>
      )}

      {/* ─── Methodology ─── */}
      <section className="rounded-2xl bg-[#FAF9FA] border border-[#E2E8F0] p-[24px] mb-8">
        <div className="flex flex-wrap gap-6 max-md:gap-4 text-[13px]">
          <div>
            <span className="text-[#94A3B8] block mb-0.5">Responses</span>
            <span className="text-[#111111] font-semibold">{count}</span>
          </div>
          <div>
            <span className="text-[#94A3B8] block mb-0.5">Status</span>
            <span className="text-[#111111] font-semibold capitalize">{campaign.status}</span>
          </div>
          <div>
            <span className="text-[#94A3B8] block mb-0.5">Assumptions tested</span>
            <span className="text-[#111111] font-semibold">{assumptions.length}</span>
          </div>
        </div>
        <p className="text-[12px] text-[#94A3B8] mt-4 leading-relaxed">
          Findings are directional signal, not statistical proof. Treat verdicts as hypotheses to test further, not conclusions to bet on.
        </p>
      </section>

      {/* ─── Top-Line Recommendation ─── */}
      <section className="rounded-2xl border border-[#E2E8F0] bg-white p-[32px] mb-8 text-center">
        <p className="text-[12px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          Recommendation
        </p>
        <p className={`text-[56px] max-md:text-[40px] font-bold leading-none ${recommendationColors[brief.recommendation]}`}>
          {brief.recommendation}
        </p>
        <p className="text-[14px] text-[#64748B] mt-3">
          {confidenceLabels[brief.confidence]}
        </p>
        <p className="text-[14px] text-[#111111] mt-2 max-w-[520px] mx-auto leading-relaxed">
          {brief.confidenceRationale}
        </p>
      </section>

      {/* ─── The Idea ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          The Idea
        </h2>
        <blockquote className="rounded-2xl border border-[#E2E8F0] bg-[#FAF9FA] p-[24px] text-[15px] text-[#111111] leading-relaxed italic">
          {campaign.description}
        </blockquote>
      </section>

      {/* ─── Assumption Verdicts ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-4">
          Assumption Verdicts
        </h2>
        <div className="space-y-4">
          {brief.assumptionVerdicts.map((v, i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E2E8F0] bg-white p-[24px]"
            >
              <div className="flex items-start justify-between gap-3 mb-3 max-md:flex-col max-md:gap-2">
                <h3 className="text-[15px] font-semibold text-[#111111] leading-snug">
                  {v.assumption}
                </h3>
                <div className="flex items-center gap-2 shrink-0">
                  {v.confidence && (
                    <span className={`text-[11px] font-medium ${
                      v.confidence === "HIGH" ? "text-[#22c55e]"
                        : v.confidence === "MEDIUM" ? "text-[#E5654E]"
                        : "text-[#94A3B8]"
                    }`}>
                      {v.confidence === "HIGH" ? "High" : v.confidence === "MEDIUM" ? "Med" : "Low"}
                    </span>
                  )}
                  <span
                    className={`inline-flex items-center rounded-full border px-3 py-1 text-[12px] font-semibold ${verdictColors[v.verdict]}`}
                  >
                    {verdictLabels[v.verdict]}
                  </span>
                </div>
              </div>

              <p className="text-[14px] text-[#64748B] leading-relaxed mb-3">
                {v.evidenceSummary}
              </p>

              {(v.supportingCount > 0 || v.contradictingCount > 0) && (
                <div className="flex gap-4 text-[12px] text-[#94A3B8] mb-3">
                  <span>{v.supportingCount} supporting</span>
                  <span>{v.contradictingCount} contradicting</span>
                  <span>{v.totalResponses} total</span>
                </div>
              )}

              {/* Coverage indicator */}
              {coverage[i] && coverage[i].responseCount > 0 && (
                <div className="rounded-xl bg-[#FAF9FA] border border-[#E2E8F0] px-4 py-3 mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] uppercase tracking-[0.08em] font-medium text-[#94A3B8]">
                      Evidence strength
                    </span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      coverage[i].strength === "strong"
                        ? "bg-[#22c55e]/10 text-[#22c55e]"
                        : coverage[i].strength === "moderate"
                          ? "bg-[#E5654E]/10 text-[#E5654E]"
                          : "bg-[#94A3B8]/10 text-[#94A3B8]"
                    }`}>
                      {coverage[i].strength}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3 text-[12px]">
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Avg quality</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 flex-1 rounded-full bg-[#E2E8F0]">
                          <div className="h-1 rounded-full bg-[#22c55e]" style={{ width: `${coverage[i].avgQuality}%` }} />
                        </div>
                        <span className="text-[#64748B] font-medium">{coverage[i].avgQuality}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Avg match</span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <div className="h-1 flex-1 rounded-full bg-[#E2E8F0]">
                          <div className="h-1 rounded-full bg-[#3b82f6]" style={{ width: `${coverage[i].avgMatch}%` }} />
                        </div>
                        <span className="text-[#64748B] font-medium">{coverage[i].avgMatch}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[#94A3B8] block text-[11px]">Categories</span>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {coverage[i].categories.map((cat) => (
                          <span key={cat} className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                            cat === "negative" ? "bg-[#fecaca] text-[#b91c1c]" : "bg-[#E2E8F0] text-[#64748B]"
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
                      className="border-l-2 border-[#E2E8F0] pl-3 text-[13px] text-[#64748B] italic leading-relaxed"
                    >
                      &ldquo;{q.text}&rdquo;
                      <span className="block text-[11px] text-[#94A3B8] mt-0.5 not-italic">
                        — {q.respondentLabel}
                      </span>
                    </blockquote>
                  ))}
                </div>
              )}

              {v.contradictingSignal && (
                <div className="rounded-xl bg-[#FEF2F2] border border-[#ef4444]/10 px-4 py-3 text-[13px] text-[#ef4444]/80 leading-relaxed">
                  <span className="font-medium text-[#ef4444]">Contradicting signal: </span>
                  {v.contradictingSignal}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ─── The Uncomfortable Truth ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          The Uncomfortable Truth
        </h2>
        <div className="rounded-2xl bg-[#FAF9FA] border border-[#E2E8F0] border-l-4 border-l-[#E8C1B0] p-[24px]">
          <p className="text-[15px] text-[#111111] font-semibold leading-relaxed">
            {brief.uncomfortableTruth}
          </p>
        </div>
      </section>

      {/* ─── Signal Summary ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          Signal Summary
        </h2>
        <p className="text-[15px] text-[#111111] leading-relaxed rounded-2xl border border-[#E2E8F0] bg-white p-[24px]">
          {brief.signalSummary}
        </p>
      </section>

      {/* ─── Strongest Signals ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          Strongest Signals
        </h2>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white p-[24px]">
          <ul className="space-y-2">
            {brief.strongestSignals.map((signal, i) => (
              <li key={i} className="flex items-start gap-2.5 text-[14px] text-[#111111] leading-relaxed">
                <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-[#22c55e] shrink-0" />
                {signal}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ─── Next Steps ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          Next Steps
        </h2>
        <div className="rounded-2xl border border-[#E2E8F0] bg-white overflow-hidden">
          {/* Desktop table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#FAF9FA]">
                  <th className="px-5 py-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-[0.05em]">Action</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-[0.05em] w-[90px]">Effort</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-[0.05em] w-[100px]">Timeline</th>
                  <th className="px-5 py-3 text-[12px] font-medium text-[#94A3B8] uppercase tracking-[0.05em]">What It Tests</th>
                </tr>
              </thead>
              <tbody>
                {brief.nextSteps.map((step, i) => (
                  <tr key={i} className="border-b border-[#E2E8F0] last:border-0">
                    <td className="px-5 py-3.5 text-[14px] text-[#111111]">{step.action}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${effortColors[step.effort]}`}>
                        {step.effort}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{step.timeline}</td>
                    <td className="px-5 py-3.5 text-[13px] text-[#64748B]">{step.whatItTests}</td>
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
                  <p className="text-[14px] text-[#111111] font-medium">{step.action}</p>
                  <span className={`inline-flex shrink-0 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${effortColors[step.effort]}`}>
                    {step.effort}
                  </span>
                </div>
                <div className="flex gap-3 text-[12px] text-[#94A3B8]">
                  <span>{step.timeline}</span>
                </div>
                <p className="text-[13px] text-[#64748B]">{step.whatItTests}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Cheapest Test This Week ─── */}
      <section className="mb-8">
        <h2 className="text-[13px] uppercase tracking-[0.1em] text-[#94A3B8] font-medium mb-3">
          Cheapest Test This Week
        </h2>
        <div className="rounded-2xl border-2 border-dashed border-[#E8C1B0] bg-[#FBF8F8] p-[24px]">
          <p className="text-[15px] text-[#111111] leading-relaxed font-medium">
            {brief.cheapestTest}
          </p>
        </div>
      </section>

      {/* ─── Footer disclaimer ─── */}
      <footer className="text-center pt-4">
        <p className="text-[12px] text-[#94A3B8]">
          Generated by VLDTA. Based on {count} response{count === 1 ? "" : "s"} from real humans + AI synthesis.
        </p>
      </footer>
    </article>
  );
}
