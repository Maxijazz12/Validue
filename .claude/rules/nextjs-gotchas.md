---
description: VLDTA-specific Next.js/React gotchas and project conventions
globs: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"]
---

# VLDTA Gotchas

- **`cookies()`, `headers()`, `params`, `searchParams` are async** in this Next.js version. Always `await`.
- **`Date.now()` in server components** — Linter treats as hook dependency. Use `serverNow()` helper.
- **`useEffect` for one-time localStorage sync** — Fires twice in strict mode. Use `useState` lazy initializer.
- **TailwindCSS 4** — `@theme inline` in CSS, not `tailwind.config.ts`. Tokens in `globals.css`.
- When unsure about Next.js API signatures, check `node_modules/next/dist/docs/` or existing codebase patterns first.
