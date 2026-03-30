---
description: VLDTA-specific Next.js/React gotchas and project conventions
globs: ["src/app/**/*.{ts,tsx}", "src/components/**/*.{ts,tsx}"]
---

# VLDTA Gotchas

- **App Router is default.** Pages router is legacy. All new routes go in `src/app/`.
- **Server Components are default.** Add `"use client"` only when you need hooks, state, or browser APIs.
- **Server Actions use `"use server"` directive.** Exported async functions in action files, not API routes for mutations.
- **`cookies()`, `headers()`, `params`, `searchParams` are async** in this Next.js version. Always `await`.
- **`Date.now()` in server components** — Linter treats as hook dependency. Use `serverNow()` helper.
- **`useEffect` for one-time localStorage sync** — Fires twice in strict mode. Use `useState` lazy initializer.
- **TailwindCSS 4** — `@theme inline` in CSS, not `tailwind.config.ts`. Tokens in `globals.css`.
- **React 19** — `useFormStatus`, `useActionState`, `use()` hook available.
- When unsure about Next.js API signatures, check `node_modules/next/dist/docs/` or existing codebase patterns first.
