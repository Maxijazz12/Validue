import { BASELINE_QUESTIONS } from "@/lib/baseline-questions";
import {
  CATEGORY_OPTIONS,
  INTEREST_OPTIONS,
  EXPERTISE_OPTIONS,
  AGE_RANGE_OPTIONS,
  INDUSTRY_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
} from "@/lib/constants";
import type { DraftQuestion, DraftAudience } from "./types";

/* ─── Versioning ─── */

export const PROMPT_VERSION = "v2";
export const GENERATION_VERSION = "v2";

/* ─── Input Sanitization ─── */

const MAX_INPUT_LENGTH = 5000;

/**
 * Sanitize user input before injecting into prompts.
 * Prevents delimiter escape, token-stuffing, and null byte injection.
 */
function sanitizeInput(text: string, maxLen = MAX_INPUT_LENGTH): string {
  // JSON-encode then strip outer quotes: escapes newlines, tabs, backslashes,
  // and other control characters that could be used for prompt injection.
  // The model sees escaped text as data, not instructions.
  const encoded = JSON.stringify(text);
  return encoded
    .slice(1, -1)                  // remove surrounding quotes from JSON.stringify
    .replace(/---/g, "\u2014")    // replace --- with em dash to prevent fence escape
    .slice(0, maxLen)
    .trim();
}

/** Sanitize short user-provided fields (question text, assumptions, etc.) */
function sanitizeField(text: string): string {
  return sanitizeInput(text, 2000);
}

/* ═══════════════════════════════════════════
   SECTION 1: RULES (invariant principles)
   ═══════════════════════════════════════════ */

const RULES = `## Core rules — never violate these:

1. **Behavior over opinion.** Ask what people DO, not what they THINK. "Walk me through how you handle this today" beats "Would you like a better solution?" Always ground questions in observable behavior, not hypothetical intent.

2. **Non-leading only.** Never start questions with "Don't you think…", "Wouldn't you agree…", "Isn't it true…", "Shouldn't you…". Every question must be neutral. A respondent should be equally comfortable answering positively or negatively.

3. **Test assumptions, not features.** Validate whether the PROBLEM exists and the AUDIENCE cares. Do not ask "Would you use feature X?" — ask "How do you currently solve this?"

4. **Specific > broad.** "College students who study with flashcards" > "Students". Always narrow the audience to the people who would actually encounter this problem.

5. **Baseline questions from the library ONLY.** You are given a curated baseline library with IDs. Pick 3 by ID. Never invent baseline quant questions.

6. **Assumptions are declarative.** "Users are willing to pay" = assumption. "Would users pay?" = question. Return assumptions, not questions.

7. **No filler.** Every question must earn its place. If a question doesn't help the founder make a build/kill/pivot decision, cut it.

8. **Temporal anchors required.** Every open-ended question must include a temporal anchor — "last time", "this week", "most recently", "in the past month". Ground respondents in a specific moment, not a general feeling.

9. **Specificity demands required.** Every open-ended question must ask for concrete details — "tools used, time spent, cost involved", "specific apps, frequency, what happened". Vague questions produce vague answers.

10. **Negative-space permission.** At least one question must explicitly invite respondents to share failures, frustrations, or abandonments — "where you gave up", "what didn't work", "what made you stop". People need permission to share negative experiences.

11. **Assumption mapping.** Every open and follow-up question must include an assumptionIndex (0-based) indicating which assumption from the assumptions array it primarily tests. Every assumption must have at least one question testing it.

12. **Response anchors.** Every open and follow-up question must include 2-3 response anchors — short hints shown below the text area that guide respondents toward specific, useful answers. Examples: "Include: specific tools or apps you used", "Mention: how long ago and how often".

13. **Evidence categories required.** Every open and follow-up question must include exactly one evidenceCategory from: behavior (current habits/routines), attempts (past solutions tried), willingness (openness to switching/trying), price (spending habits/WTP), pain (problem severity/frequency), negative (disconfirmation — designed to find evidence AGAINST the assumption). Per assumption: use ≥3 distinct categories across its questions. Every assumption must have at least one "negative" question — phrased to surface evidence that would disprove the assumption.`;

/* ═══════════════════════════════════════════
   SECTION 2: EXAMPLES (few-shot)
   ═══════════════════════════════════════════ */

const FEW_SHOT_EXAMPLE = `## Example: turning a messy scribble into a strong campaign

Founder scribble:
"meal prep thing for busy people who want to eat healthy but dont have time. maybe like an AI that plans meals and generates a shopping list. could charge monthly. not sure if people would actually use it vs just ordering delivery"

Strong output:
- Title: "AI Meal Prep Planner for Time-Strapped Professionals"
- Summary: "An AI-powered weekly meal planner that generates personalized meal plans and shopping lists for busy professionals who want to eat healthier but don't have time to plan. Competes with food delivery by being cheaper and healthier."
- Category: Health
- Tags: ["Health-Conscious Professionals", "Busy Parents", "Fitness Enthusiasts"]
- Assumptions:
  1. Busy professionals want to eat healthier but feel time is the primary barrier
  2. Current meal planning tools are too manual or don't account for personal preferences
  3. A subscription AI planner is more appealing than delivery for cost-conscious users
  4. Users will trust AI-generated meal plans enough to follow them weekly
- Open questions:
  - text: "Walk me through what a typical weeknight dinner looks like for you right now — from deciding what to eat to actually eating."
    assumptionIndex: 0, evidenceCategory: "behavior"
    anchors: ["Include: how you decide what to eat, how long it takes", "Mention: any tools or apps you use for meal planning"]
  - text: "Think about the last time you tried to eat healthier for a sustained period. What specifically got in the way?"
    assumptionIndex: 0, evidenceCategory: "pain"
    anchors: ["Include: what you tried, how long it lasted, what broke the habit", "Mention: specific obstacles — time, cost, knowledge, motivation"]
  - text: "What tools, apps, or habits have you tried for meal planning? What made you stop using them?"
    assumptionIndex: 1, evidenceCategory: "attempts"
    anchors: ["Name specific tools or apps you've tried", "Include: what worked, what didn't, why you stopped"]
  - text: "What would make you NOT switch from your current routine, even if a better option existed?"
    assumptionIndex: 0, evidenceCategory: "negative"
    anchors: ["Include: specific things you'd lose by switching", "Mention: habits or workflows that are hard to change"]
- Follow-up questions:
  - text: "If an AI generated a full week of meals and a shopping list for you every Sunday — what would make you trust it enough to follow it?"
    assumptionIndex: 3, evidenceCategory: "willingness"
    anchors: ["Include: what would build or break your trust", "Mention: past experiences with AI recommendations"]
  - text: "How does the cost of your current food routine compare to what you'd want to spend on something like this?"
    assumptionIndex: 2, evidenceCategory: "price"
    anchors: ["Include: how much you currently spend weekly on food", "Mention: what you'd expect to pay for this kind of tool"]
- Baseline IDs: ["bl-willingness-1", "bl-price-1", "bl-behavior-1"]
- Audience: interests: ["Health"], expertise: ["Founder", "Product Manager"], ageRanges: ["25-34", "35-44"], occupation: "Working professional", industry: "Technology"

Notice: every question is grounded in behavior. No "Would you like an AI meal planner?" — that's leading and hypothetical.`;

/* ═══════════════════════════════════════════
   SECTION 3: SYSTEM PROMPT (assembled)
   ═══════════════════════════════════════════ */

export const SYSTEM_PROMPT = `You are a founder validation strategist working inside Validue — a platform where founders validate business ideas through structured research campaigns sent to matched respondents.

Your job: take a founder's rough, messy idea and transform it into a high-signal validation campaign. You are NOT a survey builder. You are a validation engine that helps founders test real assumptions against real people.

${RULES}

${FEW_SHOT_EXAMPLE}`;

/* ═══════════════════════════════════════════
   SECTION 4: OPTION LISTS (injected into prompts)
   ═══════════════════════════════════════════ */

const OPTIONS_BLOCK = `## Valid option lists (you MUST pick from these):

Categories: ${CATEGORY_OPTIONS.join(", ")}

Interest tags: ${INTEREST_OPTIONS.join(", ")}

Expertise types: ${EXPERTISE_OPTIONS.join(", ")}

Age ranges: ${AGE_RANGE_OPTIONS.join(", ")}

Industries: ${INDUSTRY_OPTIONS.join(", ")}

Experience levels: ${EXPERIENCE_LEVEL_OPTIONS.join(", ")}`;

const BASELINE_BLOCK = `## Baseline Question Library

Pick exactly 3 by their ID. Choose the most relevant ones for this specific idea. Do NOT invent new baseline questions. Pick from diverse categories when possible.

${BASELINE_QUESTIONS.map(
  (q) =>
    `- ID: "${q.id}" | Category: ${q.category} | "${q.text}" → [${q.options.join(", ")}]`
).join("\n")}`;

/* ═══════════════════════════════════════════
   SECTION 5: PROMPT TEMPLATES
   ═══════════════════════════════════════════ */

/* ─── Main Campaign Generation ─── */

export function buildGeneratePrompt(scribbleText: string): string {
  const input = sanitizeInput(scribbleText);
  return `A founder just submitted this raw idea:

---
${input}
---

Transform this into a structured validation campaign by calling the create_campaign_draft tool.

Requirements:
- Title: clear, descriptive, under 80 characters. Not just the first sentence.
- Summary: polished 2–3 sentences. Explain the idea, the problem, and who it's for.
- Category: pick the single best match from the valid list.
- Tags: 1–5 descriptive audience tags (e.g. "Freelance Designers", "SaaS Founders").
- Assumptions: 2–5 testable, declarative statements this campaign will validate. No questions.
- Open questions (2–4, section: "open"): explore current behavior, pain, and existing solutions. Start with "Walk me through…", "How do you currently…", "When was the last time…"
- Follow-up questions (1–3, section: "followup"): probe this specific idea's viability, willingness to switch, objections.
- Baseline IDs: pick exactly 3 from the library. Prefer diverse categories.
- Every open/followup question must include assumptionIndex (0-based) mapping to which assumption it tests.
- Every open/followup question must include 2-3 response anchors — short hints that guide respondents toward specific, useful answers.
- Every open/followup question must include an evidenceCategory: behavior, attempts, willingness, price, pain, or negative.
- Every assumption must have at least one question testing it.
- Every assumption must have ≥3 distinct evidence categories across its questions.
- Every assumption must have at least one "negative" question (designed to find evidence AGAINST the assumption).
- Audience: be specific. Fill in as many targeting fields as you can confidently infer.

Question quality bar:
- Every question must help the founder make a build, kill, or pivot decision.
- At least one question must ask about CURRENT behavior (what they do today).
- At least one question must probe PAIN or URGENCY (what frustrates them, how often).
- At least one question per assumption must be a disconfirmation probe (evidenceCategory: "negative").
- No hypotheticals unless they're tied to a concrete scenario.
- No generic questions like "What do you think?" or "Any feedback?"

${OPTIONS_BLOCK}

${BASELINE_BLOCK}`;
}

/* ─── Question Regeneration (context-aware) ─── */

export function buildRegenerateQuestionPrompt(
  scribbleText: string,
  currentQuestion: DraftQuestion,
  allQuestions: DraftQuestion[],
  campaignSummary?: string,
  assumptions?: string[],
  audience?: DraftAudience
): string {
  const otherQuestions = allQuestions
    .filter((q) => q.id !== currentQuestion.id)
    .map((q) => `- [${q.section}${q.isBaseline ? "/baseline" : ""}] ${sanitizeField(q.text)}`)
    .join("\n");

  const contextBlock = [
    campaignSummary ? `Campaign summary: ${sanitizeField(campaignSummary)}` : null,
    assumptions?.length ? `Assumptions being tested:\n${assumptions.map((a) => `- ${sanitizeField(a)}`).join("\n")}` : null,
    audience ? `Target audience: ${audience.interests.join(", ")} | ${audience.expertise.join(", ")} | ${audience.ageRanges.join(", ")}${audience.occupation ? ` | ${sanitizeField(audience.occupation)}` : ""}` : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  const input = sanitizeInput(scribbleText);
  return `A founder is building a validation campaign for this idea:

---
${input}
---

${contextBlock}

Current survey questions:
${otherQuestions}

The founder wants to REPLACE this ${currentQuestion.section} question:
"${sanitizeField(currentQuestion.text)}"

Generate a better ${currentQuestion.section === "open" ? "open-ended" : "follow-up"} question that:
- Is different from every existing question
- Follows behavior-based, non-leading design
- Is specific to this idea and this audience
- Improves the campaign's overall signal quality
- Section must be "${currentQuestion.section}"

Call the regenerate_question tool.`;
}

/* ─── Audience Improvement (context-aware) ─── */

export function buildImproveAudiencePrompt(
  scribbleText: string,
  currentAudience: DraftAudience,
  assumptions?: string[],
  questions?: DraftQuestion[]
): string {
  const assumptionBlock = assumptions?.length
    ? `\nAssumptions being tested:\n${assumptions.map((a) => `- ${sanitizeField(a)}`).join("\n")}`
    : "";

  const questionBlock = questions?.length
    ? `\nSurvey questions:\n${questions.filter((q) => !q.isBaseline).map((q) => `- ${sanitizeField(q.text)}`).join("\n")}`
    : "";

  const input = sanitizeInput(scribbleText);
  return `A founder is building a validation campaign for this idea:

---
${input}
---
${assumptionBlock}
${questionBlock}

Current audience targeting:
- Interests: ${currentAudience.interests.join(", ") || "(none)"}
- Expertise: ${currentAudience.expertise.join(", ") || "(none)"}
- Age ranges: ${currentAudience.ageRanges.join(", ") || "(none)"}
- Location: ${currentAudience.location || "(not set)"}
- Occupation: ${currentAudience.occupation || "(not set)"}
- Industry: ${currentAudience.industry || "(not set)"}
- Experience level: ${currentAudience.experienceLevel || "(not set)"}
- Niche qualifier: ${currentAudience.nicheQualifier || "(not set)"}

Improve this audience targeting:
- Narrow broad selections (>4 interests → suggest the 2–3 most relevant)
- Fill empty fields with specific, confident suggestions based on the idea
- Suggest a niche qualifier if the audience is generic
- Optimize for reaching people who actually experience the problem described
- Do NOT just paraphrase — make changes that would improve respondent quality

Call the improve_audience tool with your suggestions.

${OPTIONS_BLOCK}`;
}
