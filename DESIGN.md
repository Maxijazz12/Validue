# VLDTA Design System
<!-- Last reviewed: 2026-03-29 -->

This is a living design reference. Sections are updated when Max references another product's design. Tokens here map to CSS variables in `globals.css` and Tailwind theme config.

## How This Works

When a design reference is added (e.g. "make cards look like Linear"), the relevant tokens are extracted and documented in a section below. Components built against that reference should use these tokens. When a reference changes, update the section — don't accumulate stale references.

## Current VLDTA Defaults

The baseline design — used when no specific reference is active for a component.

### Typography
- **Primary font:** DM Sans (geometric sans, clean, modern)
- **Display font:** Instrument Serif (editorial feel for hero text)
- **Mono font:** Space Grotesk (technical/code contexts)
- **Scale:** Tailwind defaults (text-xs through text-6xl)
- **Heading weight:** 600-700, body: 400-500
- **Line height:** tight (1.2) for headings, normal (1.5) for body

### Colors
- **Background:** #FFFFFF (light), #0F1117 (dark)
- **Surface:** #F3F4F6 (elevated), #FAF9FA (warm), #F6F7FA (cool)
- **Glass:** rgba(255,255,255,0.85) + blur(16px)
- **Text:** #111111 (primary), #64748B (secondary), #94A3B8 (muted)
- **Brand warm:** #E8C1B0 (peach) — accent, glows, gradients
- **Brand cool:** #4F7BE8 (blue) — secondary accent
- **Borders:** #E2E8F0 (default), #CBD5E1 (hover)

### Shape
- **Border radius:** cards 12-16px, buttons 8-12px, inputs 8px, pills 9999px, avatars full
- **Border width:** 1px default, focus rings 2-3px
- **Shadows:** light and subtle — `0 1px 3px rgba(0,0,0,0.1)` base, warm glow on hover

### Spacing
- **Base unit:** 4px (Tailwind default)
- **Card padding:** 16-24px
- **Section gap:** 32-48px
- **Grid gap:** 16-24px

### Motion
- **Duration:** fast 150ms, normal 200-300ms, slow 400-500ms
- **Easing:** `cubic-bezier(0.16, 1, 0.3, 1)` for entrances, `cubic-bezier(0.4, 0, 0.2, 1)` for interactions
- **Entrance pattern:** fade + translateY(8-20px)
- **Micro-interactions:** scale bounce (1 -> 1.35 -> 1), 300ms

### Scrollbar
- Width: 5px, thumb: border color, track: transparent

### Focus
- Ring: 3px rgba(0,0,0,0.04) on focus-within
- Keyboard focus: 2px solid #111111 + 4px outer glow

## CSS Custom Properties (from globals.css @theme)

These are the actual variables — use these class names in Tailwind, not raw hex values.

```
/* Backgrounds */
--color-bg: #FFFFFF                    → bg-bg
--color-bg-elevated: #F3F4F6           → bg-bg-elevated
--color-bg-hero: #FAFAFA               → bg-bg-hero
--color-bg-card: #ffffff               → bg-bg-card

/* Text */
--color-text-primary: #111111          → text-text-primary
--color-text-secondary: #64748B        → text-text-secondary
--color-text-muted: #94A3B8            → text-text-muted

/* Borders */
--color-border: #E2E8F0                → border-border
--color-border-hover: #CBD5E1          → border-border-hover
--color-accent: #111111                → (CTA, dark accent)

/* Brand Warm (peach) */
--color-accent-warm: #E8C1B0           → accent color, glows
--color-accent-warm-dark: #D4A494      → hover states
--color-accent-warm-light: #FBF8F8     → light tint backgrounds
--color-accent-soft: rgba(232,193,176,0.10)  → subtle overlays
--color-accent-glow: rgba(232,193,176,0.15)  → hover glows

/* Brand Cool (blue) */
--color-accent-blue: #4F7BE8           → secondary accent
--color-accent-blue-dark: #3B6BD9      → hover
--color-accent-blue-soft: rgba(79,123,232,0.08)

/* Surfaces */
--color-surface-warm: #FAF9FA          → warm surface tint
--color-surface-cool: #F6F7FA          → cool surface tint
--color-surface-glass: rgba(255,255,255,0.85) → glass effect (+ blur 16px)
--color-surface-glass-border: rgba(0,0,0,0.06)

/* Fonts */
--font-sans: DM Sans                   → font-sans (body)
--font-mono: Space Grotesk             → font-mono (technical)
--font-display: Instrument Serif       → font-display (hero headings)
```

## Component Patterns (from globals.css)

**CTA Button (.gradient-btn):** Solid #111 bg, white text, warm glow shadow on hover (`0 4px 20px rgba(232,193,176,0.15)`). Dark mode inverts.

**Glass Surface (.glass):** `backdrop-filter: blur(16px)` + glass bg + glass border. Used for overlays, sticky headers.

**Card Hover (.card-hover):** `transition: all 0.2s ease-out`, hover adds subtle shadow + border-color shift to #CBD5E1.

**Gradient Text (.text-gradient-warm):** `linear-gradient(135deg, #E5654E 0%, #E8C1B0 100%)` with background-clip text. Coral → peach.

**Focus Ring (.focus-glow):** `border-color: #CBD5E1; box-shadow: 0 0 0 3px rgba(0,0,0,0.04)` on focus-within.

## Animations (defined keyframes)

| Name | Pattern | Duration | Easing | Used for |
|------|---------|----------|--------|----------|
| fadeUp | translateY(20px) → 0, opacity 0→1 | 700ms | cubic-bezier(0.16,1,0.3,1) | Page section entrances |
| slideUp | translateY(12px) → 0 | 500ms | cubic-bezier(0.16,1,0.3,1) | Card/element entrances |
| pulse | opacity 1→0.4→1 | 2.5s | ease | Status dots |
| bookmarkBounce | scale 1→1.35→1 | 300ms | ease | Bookmark toggle |
| checkFlash | scale 0.5→1.1→1, opacity 0→1→0 | 600ms | ease | Between questions |
| stepPulse | box-shadow glow 0→6px→0 | 2s | ease | Current question dot |
| confettiDrift | translateY 0→40px, rotate 0→180deg | — | — | Submission celebration |
| slideInRight | translateX(20px) → 0 | 300ms | cubic-bezier(0.16,1,0.3,1) | Question transitions |

## Dark Mode Strategy

Full dark theme via `.dark` class. Overrides all custom properties. Additionally has hardcoded overrides for Tailwind arbitrary values (bg-white, bg-[#FCFCFD], etc.) using `!important`. Dark bg: #0F1117, elevated: #1A1D27, borders: #2A2D3A.

## Design-Critical Components

These define the visual identity — changes here affect brand perception:
- `src/components/landing/Hero.tsx` — First impression, brand fonts + gradient text
- `src/components/landing/Pricing.tsx` — Revenue page, trust signals
- `src/components/dashboard/WallCard.tsx` — Core respondent experience
- `src/components/dashboard/create-idea/DraftReviewStep.tsx` — Core founder experience
- `src/app/globals.css` — All tokens live here

---

## Design References

Active design references for specific components or areas.

To add a new reference, create a section:
```
### [Component/Area] — source: [Product Name]
**Extracted from:** [URL, screenshot, or training knowledge]
**Applied to:** [list of components]
**Typography / Colors / Shape / Spacing / Motion / Special:** [tokens that differ from defaults]
```

<!-- No active references yet. -->
