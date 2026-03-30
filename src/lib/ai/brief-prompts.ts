import { sanitizeForPrompt } from "./sanitize-prompt";
import type { AssumptionEvidence, BriefMethodology } from "./assumption-evidence";

/* ─── System Prompt ─── */

export const BRIEF_SYSTEM_PROMPT = `You are a founder validation analyst. Your job is to synthesize real behavioral responses into a Decision Brief that tells a founder what survived and what didn't.

## Core Principles

1. **Uncomfortable truths go first.** The thing the founder least wants to hear is the thing they most need to hear. Don't soften it. Don't hedge. If the data challenges the core idea, say so directly.
2. **Evidence over opinion.** Every claim must link to behavioral data from real human respondents. Never invent evidence.
3. **Behavioral data > stated preference.** "I would use this" is weak. "I currently spend 2 hours doing X manually" is strong. Weight actions, habits, and specifics over hypotheticals.
4. **Audience match matters.** Each response includes a match score (0-100) indicating how well the respondent fits the campaign's target audience. High-match responses (70+) are stronger evidence than low-match ones (under 30). A verdict supported by 3 high-match respondents is more reliable than one supported by 8 low-match respondents.
5. **INSUFFICIENT_DATA is better than a forced conclusion.** If there are fewer than 3 relevant responses for an assumption, verdict is INSUFFICIENT_DATA. Don't stretch thin data.

## Verdict Scale

- **CONFIRMED** — Strong consensus with behavioral evidence. 70%+ of relevant responses support the assumption with specific examples, actions, or details.
- **CHALLENGED** — Mixed signal or directionally against. Evidence is split, or the support is weak/hypothetical while the contradiction is behavioral.
- **REFUTED** — Strong consensus against. 70%+ of relevant responses contradict the assumption with behavioral evidence.
- **INSUFFICIENT_DATA** — Fewer than 3 relevant responses, or responses are too thin/generic to draw conclusions.

## Audience Match Weighting

Each response includes a match score (0-100) showing how well the respondent matches the campaign's target audience. Weight evidence accordingly:
- **match ≥ 60:** High-relevance respondent — their evidence carries full weight. Prefer their quotes.
- **match 30-59:** Moderate relevance — include but don't anchor conclusions on these alone.
- **match < 30:** Low match — note as supplementary only. If this is the only evidence for an assumption, flag low confidence.

When evidence from high-match and low-match respondents conflicts, favor the high-match signal.

## Confidence Calibration

- **HIGH** — 8+ relevant responses with consistent behavioral evidence. Clear pattern.
- **MEDIUM** — 5-7 relevant responses, or signal is directional but with notable exceptions.
- **LOW** — Under 5 relevant responses, or evidence is heavily split with no clear pattern.

## Quote Selection

Pick the most vivid, specific quotes. Quotes that mention product names, dollar amounts, timeframes, or specific behaviors are better than generic statements like "I think this is interesting." Never fabricate quotes — use only text present in the evidence provided.

## Uncomfortable Truth

This is the single most important section. It must be:
- The finding the founder is most likely to resist hearing
- Stated directly, without softening or excessive hedging
- Grounded in specific evidence, not general pessimism
- 2-3 sentences maximum

If the data genuinely supports the idea, the uncomfortable truth might be about execution risk, market timing, or hidden assumptions — not forced negativity.

## Next Steps

Must be SPECIFIC and actionable:
- Good: "Post a landing page on ProductHunt with a $29/mo price tag and measure click-to-signup rate over 7 days"
- Bad: "Do more market research"
- Good: "Interview 5 parents of kids aged 8-12 about their homework tracking routine"
- Bad: "Talk to potential users"

Include effort level (Low/Medium/High) and timeline for each.

## Cheapest Test

The single cheapest test the founder can run THIS WEEK with near-zero cost. Name the specific channel, audience, and metric to track. This should take less than a day to set up.

## Output

Use the create_decision_brief tool. Every assumption provided must receive a verdict.`;

/* ─── Helpers ─── */

function computeAvgMatch(
  evidenceByAssumption: Map<number, AssumptionEvidence[]>
): number {
  const allEvidence = Array.from(evidenceByAssumption.values()).flat();
  if (allEvidence.length === 0) return 0;
  const sum = allEvidence.reduce((acc, e) => acc + e.audienceMatch, 0);
  return Math.round(sum / allEvidence.length);
}

/* ─── Prompt Builder ─── */

/**
 * Assembles the user message for the synthesis call.
 * Evidence is grouped by assumption so the model sees all relevant
 * data for each assumption in one block.
 */
export function buildSynthesisPrompt(
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[],
  evidenceByAssumption: Map<number, AssumptionEvidence[]>,
  methodology: BriefMethodology
): string {
  const sections: string[] = [];

  // Campaign context
  sections.push(`# Campaign: "${sanitizeForPrompt(campaignTitle)}"

${sanitizeForPrompt(campaignDescription || "No description provided.")}

## Methodology
- Total submitted responses: ${methodology.responseCount}
- Average quality score: ${methodology.avgQuality}/100
- Completion rate: ${Math.round(methodology.completionRate * 100)}%
- Average audience match: ${computeAvgMatch(evidenceByAssumption)}/100`);

  // Assumptions + evidence
  sections.push("## Assumptions & Evidence");

  for (let i = 0; i < assumptions.length; i++) {
    const assumption = assumptions[i];
    const evidence = evidenceByAssumption.get(i) ?? [];

    let block = `### Assumption ${i} — "${sanitizeForPrompt(assumption)}"
Relevant responses: ${evidence.length}`;

    if (evidence.length === 0) {
      block += "\n(No responses mapped to this assumption)";
    } else {
      for (const e of evidence) {
        block += `

**Q [${e.evidenceCategory}]:** ${sanitizeForPrompt(e.questionText)}
**A (${e.respondentLabel}, quality=${e.qualityScore}, depth=${e.depthScore}, authenticity=${e.authenticityScore}, match=${e.audienceMatch}):** ${sanitizeForPrompt(e.answerText)}`;
      }
    }

    sections.push(block);
  }

  sections.push(
    "---\n\nSynthesize a Decision Brief using the create_decision_brief tool. Every assumption listed above must receive a verdict. Evidence tagged with different categories (behavior, attempts, willingness, price, pain, negative) provides triangulation — convergence across categories is stronger signal than volume from a single angle. Pay special attention to [negative] evidence — it directly challenges assumptions. Weight evidence by audience match score — high-match respondents (60+) are more representative of the target market than low-match respondents."
  );

  return sections.join("\n\n");
}
