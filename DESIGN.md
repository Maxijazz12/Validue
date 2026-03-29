# VLDTA Design System

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

---

## Design References

Active design references for specific components or areas. Each section documents the source, the tokens extracted, and which components use them.

<!--
To add a new reference:

### [Component/Area] — source: [Product Name]
**Extracted from:** [URL, screenshot, or training knowledge]
**Applied to:** [list of components]

**Typography:** [font, weights, sizes that differ from defaults]
**Colors:** [backgrounds, borders, text colors]
**Shape:** [border-radius, shadows, border styles]
**Spacing:** [padding, gaps if different from defaults]
**Motion:** [animation style, timing, easing]
**Special:** [any unique visual treatments — gradients, blur, textures]
-->

<!-- No active references yet. When Max references a product's design, extract tokens and add a section here. -->
