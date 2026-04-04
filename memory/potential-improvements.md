# Potential Improvements

Spotted during development. Not urgent — revisit when we have real usage data.

---

## Wall Feed Ranking (WallFeed.tsx)

- **Category diversity** — No penalty for same-category clustering. Top of feed could be all one type if profile skews heavily.
- **Seen dampening** — Same cards stay pinned to the top across visits. Could decay score for cards the user has already scrolled past.
- **Reward weight vs match** — Reward (15 pts max) is strong relative to match score (35 pts). A high-paying but poorly matched campaign can outrank a great match. May want to rebalance after observing click-through data.
- **Fill ratio tradeoff** — Boosting nearly-full campaigns is good for founders (fills faster) but arguably bad for respondents (less chance of getting in). Worth watching drop-off rates on high-fill cards.
