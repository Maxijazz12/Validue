import { BASELINE_QUESTIONS } from "@/lib/baseline-questions";
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

11. **Assumption mapping.** Every open and follow-up question must include an assumptionIndex (0-based, max = assumptions.length − 1) indicating which assumption from the assumptions array it primarily tests. Every assumption must have at least one question testing it. Do NOT use an index ≥ assumptions.length.

12. **Response anchors.** Every open and follow-up question must include 2-3 response anchors — short hints shown below the text area that guide respondents toward specific, useful answers. Examples: "Include: specific tools or apps you used", "Mention: how long ago and how often".

13. **Evidence categories required.** Every open and follow-up question must include exactly one evidenceCategory from: behavior, attempts, willingness, price, pain, negative. **Hard structural rule:** for EACH assumption, its mapped questions must span ≥3 distinct categories AND include exactly one "negative" (disconfirmation — designed to find evidence AGAINST the assumption). Plan your question-to-assumption mapping BEFORE generating questions to ensure coverage.

14. **Assumptions must be specific and testable.** Every assumption must include ALL THREE of: (a) a specific audience segment (not "users" or "people"), (b) a behavioral verb (spend, use, pay, switch, search, try, track, manage), (c) a temporal or quantitative marker (weekly, >3 hours, $20/month, currently). Drop an assumption rather than include a vague one. Bad → Good examples:
  - "Consumers buy products based on influencer recommendations" → "Trend-conscious shoppers aged 18–34 currently purchase ≥1 product per month directly from influencer links on Instagram or TikTok"
  - "People are willing to pay for this" → "Freelance designers currently spend $15–50/month on image editing tools and would switch to an AI alternative at the same price point"
  - "There is demand for a better solution" → "Solo founders spend >2 hours per validation cycle manually analyzing survey responses and have tried ≥2 tools in the past year"`;

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
- Assumptions (note: specific audience + behavioral verb + temporal/quantitative marker):
  1. Working professionals aged 25–44 currently spend >30 minutes per weeknight deciding what to cook and default to takeout ≥3 times per week
  2. People who have tried meal planning apps in the past 12 months abandon them within 3 weeks because the plans don't match their dietary preferences or schedule
  3. Health-conscious professionals currently spending $50–150/week on delivery would switch to a $15/month AI planner if it saved them ≥2 hours per week
- Open questions (evidence category coverage per assumption shown):
  - text: "Walk me through what a typical weeknight dinner looks like for you right now — from deciding what to eat to actually eating."
    assumptionIndex: 0, evidenceCategory: "behavior"
    anchors: ["Include: how you decide what to eat, how long it takes", "Mention: any tools or apps you use for meal planning"]
  - text: "Think about the last time you tried to eat healthier for a sustained period. What specifically made you stop?"
    assumptionIndex: 1, evidenceCategory: "pain"
    anchors: ["Include: what you tried, how long it lasted, what broke the habit", "Mention: specific obstacles — time, cost, taste, variety"]
  - text: "What tools, apps, or habits have you tried for meal planning in the past year? What made you quit each one?"
    assumptionIndex: 1, evidenceCategory: "attempts"
    anchors: ["Name specific tools or apps", "Include: what worked, what didn't, why you stopped"]
  - text: "What would make you NOT switch from your current food routine, even if a cheaper and healthier option existed?"
    assumptionIndex: 0, evidenceCategory: "negative"
    anchors: ["Include: specific things you'd lose by switching", "Mention: habits or convenience factors that are hard to give up"]
- Follow-up questions:
  - text: "How much do you currently spend per week on food delivery, and what would a meal planning tool need to do to be worth switching?"
    assumptionIndex: 2, evidenceCategory: "price"
    anchors: ["Include: your actual weekly delivery spend", "Mention: what 'worth it' means to you — time saved, money saved, health"]
  - text: "What's a reason you'd try an AI meal planner for a week and then never open it again?"
    assumptionIndex: 1, evidenceCategory: "negative"
    anchors: ["Include: specific dealbreakers or frustrations", "Mention: past experiences where you abandoned a similar tool"]
- Baseline IDs: ["bl-willingness-1", "bl-payment-1", "bl-behavior-1"]
- Audience: interests: ["Health"], expertise: ["Founder", "Product Manager"], ageRanges: ["25-34", "35-44"], occupation: "Working professional", industry: "Technology"

Notice: assumptions are specific (audience + action + number). Questions are grounded in behavior. Two assumptions have "negative" disconfirmation questions. No "Would you like an AI meal planner?" — that's leading and hypothetical.`;

/* ═══════════════════════════════════════════
   SECTION 3: SYSTEM PROMPT (assembled)
   ═══════════════════════════════════════════ */

export const SYSTEM_PROMPT = `You are a founder validation strategist working inside Validue — a platform where founders validate business ideas through structured research campaigns sent to matched respondents.

Your job: take a founder's rough, messy idea and transform it into a high-signal validation campaign. You are NOT a survey builder. You are a validation engine that helps founders test real assumptions against real people.

${RULES}

${FEW_SHOT_EXAMPLE}`;

/* ─── Focused System Prompts (token-efficient variants for sub-tasks) ─── */

export const QUESTION_REGEN_SYSTEM_PROMPT = `You are a validation question writer. Generate behavior-based, non-leading questions for founder validation campaigns.

Key rules:
- Behavior over opinion. Ask what people DO, not what they THINK.
- Non-leading only. Never "Don't you think…" or "Wouldn't you agree…"
- Temporal anchors required: "last time", "this week", "most recently".
- Specificity demands required: ask for concrete details — tools, time, cost.
- Every question must help the founder make a build/kill/pivot decision.
- No filler, no hypotheticals unless tied to a concrete scenario.`;

export const ASSUMPTION_IMPROVE_SYSTEM_PROMPT = `You are a founder validation specialist. Rewrite a vague or weak assumption to be specific, testable, and measurable.

Rules:
- Return a declarative statement, not a question
- Include a temporal marker (weekly, currently, per month, in the past year)
- Include a quantitative or measurable detail (numbers, dollar amounts, frequency, percentages)
- Reference a specific audience segment, not just "users"
- Include a behavioral verb (spend, use, pay, switch, search, try, track, manage)
- Avoid weasel words: some, many, most, generally, probably
- Must be falsifiable — 5-10 real respondents could confirm or refute it
- Keep it to one sentence, under 200 characters
- Preserve the core hypothesis — improve specificity, don't change the meaning
- Ground it in observable behavior, not opinions or desires`;

export const AUDIENCE_IMPROVE_SYSTEM_PROMPT = `You are an audience targeting specialist for founder validation campaigns. Improve targeting to reach people who actually experience the problem being validated.

Key rules:
- Narrow broad selections (>4 interests → 2-3 most relevant).
- Fill empty fields with specific suggestions based on the idea.
- Suggest a niche qualifier if the audience is generic.
- Optimize for respondent quality, not volume.`;

/* ═══════════════════════════════════════════
   SECTION 4: OPTION LISTS (injected into prompts)
   ═══════════════════════════════════════════ */

const BASELINE_BLOCK = `## Baseline Question Library

Pick exactly 3 by ID. Do NOT invent new baselines. Prefer diverse categories.

${BASELINE_QUESTIONS.map(
  (q) => `- "${q.id}" | ${q.category} | ${q.description.split("—")[0].trim()}`
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
- Assumptions: 2–3 testable, declarative statements this campaign will validate. No questions. Fewer strong assumptions beat many weak ones — each assumption needs ≥3 evidence categories across its questions, so keep assumptions tight.
- Open questions (3–4, section: "open"): explore current behavior, pain, and existing solutions. Start with "Walk me through…", "How do you currently…", "When was the last time…"
- Follow-up questions (1–2, section: "followup"): probe this specific idea's viability, willingness to switch, objections.
- Baseline IDs: pick exactly 3 from the library. Prefer diverse categories.
- Apply all assumption-mapping, anchor, and evidence category rules from Core Rules above.
- Audience: be specific. Fill in as many targeting fields as you can confidently infer.

Structural requirements (non-negotiable):
- For EACH assumption: its questions must use ≥3 distinct evidence categories AND include one "negative" category question. Plan this mapping before writing questions.
- Every assumption must have at least one question testing it. No orphan assumptions.
- At least one question must ask about CURRENT behavior (what they do today).
- At least one question must probe PAIN or URGENCY (what frustrates them, how often).
- At least one question should use evidenceCategory: "price" — explore spending habits, not just "how much would you pay."
- No hypotheticals unless tied to a concrete scenario. No generic questions like "What do you think?"
- Every question must help the founder make a build, kill, or pivot decision.

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

Call the improve_audience tool with your suggestions.`;
}

/* ─── Assumption Improvement (context-aware) ─── */

export function buildImproveAssumptionPrompt(
  scribbleText: string,
  currentAssumption: string,
  allAssumptions: string[],
  audienceSummary: string
): string {
  const input = sanitizeInput(scribbleText);
  const otherAssumptions = allAssumptions
    .filter((a) => a !== currentAssumption)
    .map((a) => `- ${sanitizeField(a)}`)
    .join("\n");

  return `A founder is building a validation campaign for this idea:

---
${input}
---

Target audience: ${sanitizeField(audienceSummary)}

Other assumptions in this campaign:
${otherAssumptions || "(none)"}

Rewrite this assumption to be more specific and testable:
"${sanitizeField(currentAssumption)}"

Call the improve_assumption tool with the improved version.`;
}
