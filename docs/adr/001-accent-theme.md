# ADR 001 — Accent Theme System via CSS Variables + data-accent

## Status
Accepted

## Context
Portfolio required dual-accent branding (web/ai) with user-selectable themes without redesigning UI or duplicating Tailwind config.

## Decision
Implement HSL CSS variables `--accent-web`, `--accent-web-btn`, `--accent-ai`, `--glow-web`, `--glow-ai` in `src/index.css` with 5 `data-accent` overrides (ocean, royal, sunset, forest, bloom) driven by `ThemeContext.jsx` `localStorage portfolio-accent-theme` and `document.documentElement.setAttribute('data-accent', id)`. `tailwind.config.js` maps colors to `hsl(var(--accent-web))` etc. All components use `text-accent-web`, `bg-accent-web/10` etc., not hardcoded hex.

## Alternatives Considered
- Tailwind `darkMode` per-theme class — would require 5× duplication
- CSS-in-JS theme provider — runtime overhead, hydration mismatch
- Hardcoded hex per component — unmaintainable (22 files migrated in #6ef5a1e)

## Consequences
- Single source of truth for theming, `Ctrl+Shift+T` cycle toast is trivial
- Theme switch is instant (CSS variable mutation), no reload
- Adding new theme = 4 CSS lines

## Reference
`src/index.css:8-40`, `src/lib/ThemeContext.jsx`, `tailwind.config.js:12-77`, commit `6ef5a1e`
