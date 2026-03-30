# Engineering Constraints

- New DB tables require RLS
- New routes require validation, rate limiting, and error logging
- New AI features require deterministic fallbacks
- Use existing logging paths for ops and AI events
- Test non-trivial logic before finishing
- Prefer existing codebase patterns before inventing new ones
- Treat Stripe, auth, and payout flows as state-machine-sensitive areas
