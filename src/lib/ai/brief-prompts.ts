import { sanitizeForPrompt } from "./sanitize-prompt";
import type { AssumptionEvidence, BriefMethodology } from "./assumption-evidence";
import { groupByBucket } from "./assumption-evidence";
import type { MatchBucket } from "@/lib/wall-ranking";
import type { PriceSignal } from "./extract-price-signal";
import type { ConsistencyReport } from "./detect-consistency-gaps";
import type { SegmentReport } from "./segment-disagreements";
import type { PriorRoundVerdicts } from "./synthesize-brief";

/* ─── System Prompt ─── */

export const BRIEF_SYSTEM_PROMPT = `You are a founder validation analyst. Your job is to synthesize real behavioral responses into a Decision Brief that tells a founder what survived and what didn't.

## Core Principles

1. **Uncomfortable truths go first.** The thing the founder least wants to hear is the thing they most need to hear. Don't soften it. Don't hedge. If the data challenges the core idea, say so directly.
2. **Evidence over opinion.** Every claim must link to behavioral data from real human respondents. Never invent evidence.
3. **Behavioral data > stated preference.** "I would use this" is weak. "I currently spend 2 hours doing X manually" is strong. Weight actions, habits, and specifics over hypotheticals.
4. **Audience match matters.** Each response includes a match score (0-100) indicating how well the respondent fits the campaign's target audience. High-match responses (70+) are stronger evidence than low-match ones (under 30). A verdict supported by 3 high-match respondents is more reliable than one supported by 8 low-match respondents.
5. **INSUFFICIENT_DATA is better than a forced conclusion.** If there are fewer than 2 relevant responses for an assumption, verdict is INSUFFICIENT_DATA. Don't stretch thin data.
6. **Partial responses are normal.** Each respondent answers a subset of 3-5 questions (not all questions), so different assumptions will have different evidence counts. An assumption with 4 responses from targeted respondents is stronger signal than one with 8 from random respondents.

## Verdict Scale

- **CONFIRMED** — Strong consensus with behavioral evidence. 70%+ of relevant responses support the assumption with specific examples, actions, or details.
- **CHALLENGED** — Mixed signal or directionally against. Evidence is split, or the support is weak/hypothetical while the contradiction is behavioral.
- **REFUTED** — Strong consensus against. 70%+ of relevant responses contradict the assumption with behavioral evidence.
- **INSUFFICIENT_DATA** — Fewer than 2 relevant responses, or responses are too thin/generic to draw conclusions.

## Evidence Weighting

Each response includes a pre-computed **weight** field that combines quality and audience match into a single 0-100 number. Use this as your primary evidence weighting signal:
- **weight ≥ 60:** Strong evidence — anchor verdicts and prefer quotes from these responses.
- **weight 30-59:** Moderate evidence — include but don't anchor conclusions on these alone.
- **weight < 30:** Weak evidence — supplementary only. If this is the only evidence for an assumption, flag low confidence.

When high-weight and low-weight responses conflict, favor the high-weight signal. A verdict supported by 3 high-weight responses outweighs 8 low-weight ones.

## Audience Segmentation

When evidence is segmented by fit bucket, it is grouped into three tiers:

- **CORE FIT** (match >= 70): The founder's actual target users. Their signal is the primary anchor for verdicts.
- **ADJACENT FIT** (match 40-69): Partial overlap. Useful context but should not override core-fit consensus.
- **OFF-TARGET** (match < 40): Low overlap. Do NOT ignore — they can reveal genuine patterns — but their opinion should not anchor verdicts about the target market.

**Segmentation rules:**
1. Anchor each assumption verdict primarily on core-fit evidence.
2. If core-fit and adjacent agree, boost confidence.
3. If core-fit and adjacent DISAGREE, flag this prominently — it may indicate the target definition is too narrow.
4. If off-target respondents show surprising agreement with core-fit, note it as a broader market signal.
5. When adjacent respondents show STRONGER support than core-fit, flag as a potential expansion opportunity.
6. NEVER ignore off-target evidence that reveals genuine patterns (e.g., "nobody in any segment has this problem").

For each assumption verdict, set segmentAlignment:
- **ALIGNED**: All segments with data point in the same direction.
- **SPLIT**: Core-fit diverges from adjacent or off-target.
- **CORE_ONLY**: Only core-fit data available for this assumption.
- **UNSEGMENTED**: Evidence was not segmented (too few responses or no core-fit).

## Confidence Calibration

Set confidence at BOTH the brief level and per-assumption level:

- **HIGH** — 8+ relevant responses with consistent behavioral evidence. Clear pattern. High-weight responses agree.
- **MEDIUM** — 5-7 relevant responses, or signal is directional but with notable exceptions.
- **LOW** — Under 5 relevant responses, evidence is heavily split, or only low-weight responses support the verdict.

Per-assumption confidence can differ from brief-level confidence. A brief can be HIGH confidence overall while one assumption is LOW confidence — this is valuable signal for the founder.

## Quote Selection

Pick the most vivid, specific quotes. Quotes that mention product names, dollar amounts, timeframes, or specific behaviors are better than generic statements like "I think this is interesting." Never fabricate quotes — use only text present in the evidence provided.

## Contradicting Signals

When evidence for an assumption is mixed, populate the contradictingSignal field with specifics:
1. What exactly contradicts — is it behavioral evidence vs stated willingness? Different price expectations? Different use-case priorities?
2. How many respondents hold the contradicting view and what their weights are
3. Whether contradictors tend to be high-match or low-match respondents (this determines how seriously the founder should take the disagreement)

A contradiction from high-match respondents is more threatening to the assumption than one from low-match respondents.

## Uncomfortable Truth

This is the single most important section. It must be:
- The finding the founder is most likely to resist hearing
- Stated directly, without softening or excessive hedging
- Grounded in specific evidence, not general pessimism
- 2-3 sentences maximum

If the data genuinely supports the idea, the uncomfortable truth might be about execution risk, market timing, or hidden assumptions — not forced negativity.

## Next Steps

Each next step must target a SPECIFIC assumption from the list. The "whatItTests" field should name the assumption being tested.

Must be SPECIFIC and actionable:
- Good: "Post a landing page on ProductHunt with a $29/mo price tag and measure click-to-signup rate over 7 days" (tests: willingness to pay assumption)
- Bad: "Do more market research"
- Good: "Interview 5 parents of kids aged 8-12 about their homework tracking routine" (tests: problem frequency assumption)
- Bad: "Talk to potential users"

Prioritize next steps for assumptions with CHALLENGED or INSUFFICIENT_DATA verdicts — these are where the founder's understanding is weakest. Include effort level (Low/Medium/High) and timeline for each.

## Cheapest Test

The single cheapest test the founder can run THIS WEEK with near-zero cost. It must directly test one of the assumptions listed above — name which one. Name the specific channel, audience, and metric to track. This should take less than a day to set up.

## Output

Use the create_decision_brief tool. Every assumption provided must receive a verdict.`;

/* ─── Helpers ─── */

/** Truncate text to a max length, adding ellipsis if trimmed. */
function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 1) + "\u2026";
}

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
const BUCKET_LABELS: Record<MatchBucket, string> = {
  core: "CORE FIT (target audience)",
  adjacent: "ADJACENT FIT (partial match)",
  off_target: "OFF-TARGET (low match)",
};

export function buildSynthesisPrompt(
  campaignTitle: string,
  campaignDescription: string,
  assumptions: string[],
  evidenceByAssumption: Map<number, AssumptionEvidence[]>,
  methodology: BriefMethodology,
  priceSignal?: PriceSignal | null,
  consistencyReport?: ConsistencyReport | null,
  segmentReport?: SegmentReport | null,
  priorRoundVerdicts?: PriorRoundVerdicts | null,
  isSegmented?: boolean
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
    } else if (isSegmented) {
      // Group evidence by fit bucket for segmented briefs
      const bucketed = groupByBucket(evidence);
      for (const bucket of ["core", "adjacent", "off_target"] as MatchBucket[]) {
        const items = bucketed[bucket];
        if (items.length === 0) continue;
        block += `\n\n#### ${BUCKET_LABELS[bucket]} (${items.length} responses)`;
        for (const e of items) {
          const weight = Math.round(e.qualityScore * (0.6 + 0.4 * (e.audienceMatch / 100)));
          block += `\n**Q [${e.evidenceCategory}]:** ${truncate(sanitizeForPrompt(e.questionText), 150)}`;
          block += `\n**A (${e.respondentLabel}, w=${weight}, m=${e.audienceMatch}):** ${truncate(sanitizeForPrompt(e.answerText), 200)}`;
        }
      }
    } else {
      for (const e of evidence) {
        const weight = Math.round(e.qualityScore * (0.6 + 0.4 * (e.audienceMatch / 100)));
        block += `

**Q [${e.evidenceCategory}]:** ${truncate(sanitizeForPrompt(e.questionText), 150)}
**A (${e.respondentLabel}, w=${weight}, m=${e.audienceMatch}):** ${truncate(sanitizeForPrompt(e.answerText), 200)}`;
      }
    }

    sections.push(block);
  }

  // Price signal (if available)
  if (priceSignal && priceSignal.respondentCount > 0) {
    let priceBlock = `## Willingness-to-Pay Signal\n${priceSignal.respondentCount} respondents answered baseline price questions.\n`;

    if (Object.keys(priceSignal.priceCeilingDistribution).length > 0) {
      priceBlock += "\nPrice ceiling (max paid for similar tools):";
      for (const [tier, count] of Object.entries(priceSignal.priceCeilingDistribution)) {
        priceBlock += `\n- ${tier}: ${count} respondent${count === 1 ? "" : "s"}`;
      }
    }

    if (Object.keys(priceSignal.pastSpendingDistribution).length > 0) {
      priceBlock += "\n\nPast spending (last 12 months):";
      for (const [tier, count] of Object.entries(priceSignal.pastSpendingDistribution)) {
        priceBlock += `\n- ${tier}: ${count}`;
      }
    }

    if (priceSignal.forwardWtpDistribution && Object.keys(priceSignal.forwardWtpDistribution).length > 0) {
      priceBlock += "\n\nForward WTP (what they'd pay for a solution):";
      for (const [tier, count] of Object.entries(priceSignal.forwardWtpDistribution)) {
        priceBlock += `\n- ${tier}: ${count}`;
      }
    }

    if (priceSignal.preferredModelDistribution && Object.keys(priceSignal.preferredModelDistribution).length > 0) {
      priceBlock += "\n\nPreferred payment model:";
      for (const [tier, count] of Object.entries(priceSignal.preferredModelDistribution)) {
        priceBlock += `\n- ${tier}: ${count}`;
      }
    }

    if (priceSignal.matchSkew) {
      priceBlock += `\n\nNote: ${priceSignal.matchSkew}`;
    }

    priceBlock += "\n\nFactor this into WTP/pricing verdicts. Compare forward WTP against past spending.";

    sections.push(priceBlock);
  }

  // Consistency gaps (if available)
  if (consistencyReport && consistencyReport.gaps.length > 0) {
    let consistencyBlock = `## Behavioral Consistency Gaps\n${consistencyReport.summary}\n`;

    for (const gap of consistencyReport.gaps) {
      consistencyBlock += `\n- **${gap.respondentLabel}** (q=${gap.qualityScore}, ${gap.severity}): "${truncate(sanitizeForPrompt(gap.statedAnswer), 100)}" vs "${truncate(sanitizeForPrompt(gap.behavioralAnswer), 100)}" (${gap.gapType})`;
    }

    consistencyBlock += "\n\nFactor contradictions into verdict confidence and contradictingSignal.";

    sections.push(consistencyBlock);
  }

  // Audience segment disagreements (if available)
  if (segmentReport && segmentReport.disagreements.length > 0) {
    let segmentBlock = `## Audience Segment Disagreements\n${segmentReport.summary}\n`;

    for (const d of segmentReport.disagreements) {
      segmentBlock += `\n- **Assumption ${d.assumptionIndex} — "${sanitizeForPrompt(d.assumption)}"** (${d.severity} severity): ${d.signal}. High-match support: ${Math.round(d.highMatchSupportRatio * 100)}% (n=${d.highMatchCount}), Low-match support: ${Math.round(d.lowMatchSupportRatio * 100)}% (n=${d.lowMatchCount})`;
    }

    segmentBlock += "\n\nHigh-match contradictions are more threatening than low-match. Factor into verdicts.";

    sections.push(segmentBlock);
  }

  // Prior round context (for round 2+ campaigns)
  if (priorRoundVerdicts && priorRoundVerdicts.verdicts.length > 0) {
    let priorBlock = `## Prior Round Context\nPrevious recommendation: **${priorRoundVerdicts.recommendation}**\n\nPrevious assumption verdicts:`;

    for (const v of priorRoundVerdicts.verdicts) {
      priorBlock += `\n- "${sanitizeForPrompt(v.assumption)}": ${v.verdict} (${v.confidence} confidence)`;
    }

    priorBlock += "\n\nNote verdict changes between rounds (e.g. \"Previously CHALLENGED, now CONFIRMED\").";

    sections.push(priorBlock);
  }

  sections.push(
    "---\n\nSynthesize using create_decision_brief. Every assumption needs a verdict. Triangulate across evidence categories. Prioritize [negative] evidence and high-weight responses."
  );

  return sections.join("\n\n");
}
