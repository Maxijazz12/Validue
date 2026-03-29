<!-- BEGIN:nextjs-agent-rules -->
# Next.js 16.2 — Breaking Changes & Gotchas

This version has breaking changes from training data. Read `node_modules/next/dist/docs/` before writing new patterns.

## Critical Differences

- **App Router is default.** Pages router is legacy. All new routes go in `src/app/`.
- **Server Components are default.** Add `"use client"` only when you need hooks, state, or browser APIs.
- **Server Actions use `"use server"` directive.** Exported async functions in action files, not API routes for mutations.
- **`cookies()` and `headers()` are async.** Must `await cookies()`, not just `cookies()`. This changed in Next.js 15+.
- **Dynamic route params are async.** `params` in page/layout props must be awaited: `const { id } = await params`.
- **`searchParams` is async.** Same as params — `const sp = await searchParams`.

## VLDTA-Specific Gotchas

- **`Date.now()` in server components** — Linter thinks it's a hook dependency. Use a `serverNow()` helper.
- **`useEffect` for one-time localStorage sync** — Fires twice in strict mode. Use `useState` lazy initializer.
- **TailwindCSS 4** — Uses `@theme inline` in CSS, not `tailwind.config.ts`. Tokens defined in `globals.css`.
- **React 19** — `useFormStatus`, `useActionState` are available. `use()` hook for promises/context.

## Before Writing Code

1. Check `node_modules/next/dist/docs/01-app/03-api-reference/` for current API signatures
2. If using a pattern you're unsure about, verify against the docs — don't trust training data
3. When in doubt, look at existing patterns in the codebase first
<!-- END:nextjs-agent-rules -->
