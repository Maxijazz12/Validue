# Decision Brief: FitCheck

> This is the polished Variant B format with all simulation-derived improvements. Use this as the template for real-founder testing and for the Phase 1 synthesis engine.

---

## Limitations & Methodology

This brief is based on **22 respondent reactions** to your idea. Respondents were matched by interest and self-reported expertise — they are not a random sample. Findings are **directional signal**, not statistical proof. Use this to inform decisions, not make them blindly. Where findings are backed by established patterns beyond this sample, we note it.

---

## Top-Line Recommendation

# PIVOT

**Confidence: MEDIUM** — Strong signal on what's broken. Weaker signal on what to build instead. The core insight (your buyer is wrong) is well-supported. The alternative direction needs its own validation.

---

## The Idea

> "An AI-powered outfit rating app for Gen Z. Take a photo of your outfit before going out, get instant AI feedback on fit, color coordination, and style. Community feature where users rate each other's outfits. Premium: $6.99/month for personalized style recommendations and wardrobe tracking. Target: 18-24 year olds who care about fashion but can't afford stylists."

---

## Who Responded

22 respondents, ages 18-26. 14 identified as fashion-interested, 8 as casual dressers. 16 female, 6 male. Mix of college students (13), recent grads (6), and young professionals (3). Average response quality: 73/100. 91% completion rate.

**What this sample can tell you:** How fashion-interested Gen Z reacts to the concept, pricing, and features.
**What it can't tell you:** Whether the casual-dresser majority (who didn't opt in) would ever use this. Stated willingness to pay ≠ actual payment behavior.

---

## Assumptions Tested

### 1. Gen Z wants AI feedback on their outfits
**Verdict: CONFIRMED** | Evidence: Strong (18/22 + consistent behavioral descriptions)

18 of 22 said they'd try it at least once. But the use case is narrower than expected: **event-specific** (date night, job interview, going out), not daily. Nobody described wanting AI to rate their Tuesday morning outfit.

> "Before a first date, absolutely. I already send outfit photos to my group chat and wait for replies. This would be faster." — 22, college student
> "For everyday? No. But for something important where I'm overthinking it? Yes." — 24, young professional

**Contradicting signal:** 4 respondents said they'd never trust AI over their own judgment or friends' opinions. "AI doesn't know my vibe." — 19, art student

### 2. Community outfit rating is a compelling feature
**Verdict: CHALLENGED** | Evidence: Directional (split signal, n=22)

Split reaction. 9 said they'd participate. 8 said they'd browse but never post (fear of judgment). 5 said hard no — "that's just Instagram with extra anxiety."

> "I'd look at what other people are wearing for inspiration. I would never post my own outfit for strangers to rate." — 20, student
> "This could be toxic really fast. What happens when someone gets roasted?" — 21, student

The community feature has a lurker problem AND a toxicity risk. The 9 who'd participate skewed heavily toward users who already post outfit content on TikTok/Instagram — meaning the community feature attracts people who don't need it.

**Contradicting signal:** 3 respondents were enthusiastic about the community: "I'd love this — like OOTD but with actual feedback, not just likes." — 23, fashion student

### 3. Users will pay $6.99/month for personalized recommendations
**Verdict: REFUTED** | Evidence: Directional (17/22, consistent reasoning)

17 of 22 said no. The objection was unanimous: **Pinterest and TikTok already do personalized style recommendations for free.**

> "Pinterest literally shows me outfit ideas based on what I save. Why would I pay $7 for that?" — 19, student
> "I follow 10 fashion creators on TikTok. That's my stylist. It's free." — 21, student

The 5 who said "maybe" described a very specific scenario: **wardrobe inventory tracking** ("tell me what to wear based on what I actually own") — not general style recommendations. That's a different feature than what was proposed.

> "If it knew everything in my closet and told me combinations I haven't tried, I'd pay. Generic 'you'd look good in blue' — no." — 24, young professional

### 4. The target market (18-24, fashion-interested, can't afford stylists) is right
**Verdict: CHALLENGED** | Evidence: Directional (pattern observed, not quantified)

The price sensitivity is real — this audience genuinely can't afford stylists. But the users who showed the **strongest purchase intent** were 23-28 young professionals, not 18-22 students. The professionals have events they need to dress for (client meetings, networking, dates) AND disposable income.

> "$7/month is two coffees. I spend $200/month on clothes and still feel like I dress wrong for work." — 26, junior consultant

Students care about fashion but won't pay. Young professionals care about looking appropriate and will.

### 5. AI can provide useful style feedback
**Verdict: PARTIALLY CONFIRMED** | Evidence: Directional (hypothesis — no one tested a prototype)

Respondents were split on whether AI "gets" style. But there was surprising consensus on WHERE AI could help: **fit and proportion feedback** (does this look right on my body type?) rather than **taste judgments** (is this outfit cool?).

> "AI telling me my outfit is 'trendy' means nothing. AI telling me my proportions are off or my colors clash — that's useful." — 23, recent grad
> "I don't want AI to have taste. I want it to catch the things I can't see in the mirror." — 20, student

---

## The Uncomfortable Truth

**You're building a fashion toy for students who won't pay. The buyers are young professionals who need a different product.**

The 18-22 audience loves the concept but their price ceiling is zero — Pinterest and TikTok already serve their style inspiration needs for free. The audience that would actually pay ($6.99/month is "two coffees") is young professionals aged 23-28 who need to look appropriate for work and events but lack confidence in their style. That's a different product: less "rate my outfit for fun," more "help me dress right for this meeting."

The AI feedback that resonated was fit/proportion/color-matching — functional feedback — not taste or trend judgments. "Catch what I can't see in the mirror" is the use case with real pull.

---

## Strongest Signals

These are the threads worth chasing — what DID resonate:

- **Event-specific use case** (18/22) — "before a date / interview / going out" is the trigger, not daily use
- **Fit/proportion feedback over taste** — AI as mirror check, not fashion advisor
- **Wardrobe-aware recommendations** (5 "maybe" payers) — "tell me what to wear from what I own"
- **Young professional willingness to pay** — different segment, different product, but real purchase intent
- **Speed over depth** — "faster than sending photos to my group chat" was cited repeatedly

---

## Next Steps

| Action | Effort | Test in... | What you learn |
|--------|--------|-----------|----------------|
| Interview 5 young professionals (23-28) about getting-dressed-for-work pain | Low | 1 week | Whether the paying segment is real and what they'd actually buy |
| Build a "fit check" feature only (proportion + color feedback, no community, no trends) | Medium | 2 weeks | Whether the narrow AI use case delivers real value |
| Test wardrobe inventory → outfit suggestion as a premium feature | Medium | 3 weeks | Whether "what to wear from what I own" is the monetization path |
| Kill or defer the community rating feature | — | — | Lurker problem + toxicity risk outweigh engagement potential at launch |
| Retest pricing with young professional segment specifically | Low | 1 week | Whether $6.99 or $9.99 clears the bar for this audience |

**Cheapest test this week:** Post in 3 LinkedIn communities for young professionals: "Would you pay for an app that tells you if your outfit works for [meeting/date/event] before you leave the house?" Track responses. If <5% engagement, the segment may not be viable either.

---

## Decision Outcome Tracking

Log this decision and revisit when real data arrives:

| What we decided | Based on | What would change our mind |
|----------------|----------|---------------------------|
| Shift target from students to young professionals | 22 responses: students won't pay, professionals showed purchase intent | If 5 professional interviews show low interest, revert |
| Focus AI on fit/proportion, not taste | Consistent signal that "catch what I can't see" > "tell me what's trendy" | If prototype testing shows users actually want taste feedback |
| Defer community feature | Lurker + toxicity risk, not core to value prop | If early users organically request it |
| Explore wardrobe-aware recommendations as premium | 5 "maybe" payers described this specific feature | If prototype doesn't move conversion vs. basic fit check |
