# Response Collection Design — Council Synthesis

**Status:** Council Level 1 complete. 3 agents, varied framing, synthesized below. Ready for implementation.

## The Problem

The scoring system catches bad responses but doesn't produce good ones. A 60-character vague opinion passes all quality gates. Question design and response structure determine whether we get behavioral evidence or surface-level opinions. Input quality caps output quality.

## Design Decisions (picked sides on disagreements)

### 1. Question-to-Assumption Mapping (unanimous)
Every open/followup question maps to exactly one assumption via `assumptionIndex`. Baselines get `null`. Quality-pass verifies every assumption has at least 1 question. Respondents never see which assumption they're testing.

**Why:** Synthesis can't produce assumption verdicts without knowing which responses are evidence for which assumption. Moving this from synthesis-time inference to generation-time tagging is cheaper and more reliable.

### 2. Behavioral Probes Over Opinion Questions (unanimous)
Replace "Would you...?" with temporal-anchored behavioral probes:
- **Bad:** "Would you pay for a meal planning app?"
- **Good:** "Think about the last time you planned meals for a full week. Walk me through what you did — tools, time spent, where you gave up."

Every open question includes: temporal anchor ("last time", "this week"), specificity demands ("tools, duration, cost"), and negative-space permission ("where you gave up, what frustrated you").

### 3. Inferred WTP, Not Stated WTP
Never ask "would you pay $X?" directly. Instead:
- "How much do you currently spend (money or time) dealing with this problem?"
- "What's the most you've paid for a tool in this category?"
- "To get [X], would you give up [current solution]? What would make you hesitate?"

AI synthesis layer infers WTP from current spending + switching willingness. More accurate, harder to game.

### 4. Response Anchors on Open Questions
After the main question text, display 2-3 small gray hint lines:
"Include: what you used, how often, what didn't work"

Anchors make it psychologically harder to submit vague answers. They disappear after 100+ characters. AI generates them at campaign creation time. Stored as `anchors: string[]` on `DraftQuestion`.

### 5. Hide Founder Pitch From Respondents
Don't show campaign title/description/assumptions before questions. Show a neutral problem-space description: "This survey is about [meal planning and cooking habits]." Reveal the founder's actual idea AFTER submission with optional email signup: "Here's what this founder is building — want to be notified when it launches?"

Email signup rate = strongest behavioral signal for purchase intent.

### 6. Behavioral Screening Question (1 per campaign)
First question, always MC, derived from primary assumption:
"In the last 7 days, how many meals did you cook at home?" with concrete frequency options.

Not a filter — everyone completes. Used for stratification in synthesis: "Among people who cook 5+ meals/week, the signal is X. Among those who don't, Y."

### 7. Randomized Question Order + Hard Cap
Randomize assumption-question blocks per respondent (not individual questions — keep related questions together). Prevents fatigue from concentrating on last assumptions.

Hard cap: 6-8 questions total. If >5 assumptions, prioritize highest-risk ones for deep probing, use baselines for the rest.

### 8. Baseline Library v2 (Behavioral Rewrite)
Current baselines ask opinions ("Would you pay?"). Rewrite to behavioral anchors:
- `bl-payment` → "How much have you spent on similar tools in the past year? [$0 / <$50 / $50-200 / $200+]"
- `bl-interest` → "How often do you actively look for a better solution? [Weekly / Monthly / Rarely / Never / I don't have this problem]"
- `bl-behavior` → "What do you currently use to handle this? [Nothing / Free tools / Paid tool / Manual process / Other]"

Run v1 and v2 baselines in parallel for 4 weeks, then deprecate v1.

## Implementation Priority

| # | Change | Effort | Impact | Files |
|---|--------|--------|--------|-------|
| 1 | Assumption mapping on questions | Low | Critical for synthesis | `ai/types.ts`, `ai/prompts.ts`, `ai/schemas.ts`, `ai/quality-pass.ts` |
| 2 | Behavioral probe framing in AI prompt | Low | High — changes question quality at generation | `ai/prompts.ts` |
| 3 | Response anchors on open questions | Medium | High — directly addresses vague-response problem | `ai/types.ts`, `ai/prompts.ts`, `OpenEndedAnswer.tsx` |
| 4 | Hide founder pitch + post-reveal email signup | Medium | High — removes anchoring bias, adds behavioral signal | `ResponseFlow.tsx`, `CampaignDetail.tsx`, `SubmissionConfirmation.tsx` |
| 5 | Inferred WTP questions (replace direct WTP baselines) | Medium | High — fixes the stated-vs-revealed problem | `baseline-questions.ts`, `ai/prompts.ts` |
| 6 | Screening question | Low | Medium — enables stratified synthesis | `ai/prompts.ts`, `ai/types.ts`, response flow |
| 7 | Question order randomization | Low | Medium — distributes fatigue evenly | `QuestionStepper.tsx` |
| 8 | Baseline library v2 | Medium | Medium — but defer until v1 data collected | `baseline-questions.ts` |

## What We're NOT Doing (deferred)

- 2-part response structure (experience + details) — too much UX change for uncertain gain. Test anchors first.
- Context-aware typing nudges — complex to build, uncertain value. Ship post-submission quality feedback instead.
- Scenario-based forks — powerful but too complex for AI generation at this stage.
- Post-submission micro-tags — marginal gain for respondent burden at current scale.
- First-keystroke timing — incremental metadata, low priority.

## Biggest Risk

AI question generation quality. The current prompt produces decent questions. These changes require the AI to: map questions to assumptions, generate behavioral probes with temporal anchors, produce response anchors, and create screening questions. If the AI can't do this well, the system degrades. Mitigation: test the new prompt against 10 diverse ideas before shipping. If quality drops, roll back and ship only the assumption mapping + anchors.
