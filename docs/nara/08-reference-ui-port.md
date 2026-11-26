# Reference UI port — thinking, typing, segmented nav (2026-11-26)

Two reference components were ported: `claude-chat.html` (thinking + streaming
answer) and `segmented-control.html` (navbar indicator).

## What was taken literally

| Reference mechanism | Where it landed |
| --- | --- |
| Normalised spring `1 − e^(−6.5p)(cos 9.86p + (6.5/9.86) sin 9.86p)` | `src/lib/motion/curves.js` → `spring()` |
| `smooth` (smoothstep), `soft` (critically damped), `expo` | same file |
| Shimmer sweep across "Thinking" | `.nara-shimmer` (gradient clipped to text) |
| Rolling elapsed seconds | `Roll` + `.rl` / `.rc` odometer slots |
| Typewriter with per-char fade + 3px rise | `.nara-word` / `.nara-ch` |
| Soft caret that fades instead of vanishing | `.nara-caret` |
| "Thought for Ns" post-state | `ThoughtFor` |
| Continuous nav position driving the indicator | `SegmentedNav` → `useGlide()` |
| Label weight flips at `|x − i| < 0.5` | same component |

Surfaces are used verbatim: `#050506`, `#1C1C20`, `#E4E4E8`, `#F2F2F4`,
`#8E8E93`, `#76767E`, `#F0EEE6`.

## The one deliberate deviation

The reference accents with another product's brand orange (`#D97757`). NARA
uses the portfolio accent (`#10b981`), kept in `src/components/nara/theme.js`
as a single constant.

## Implementation deviation, and why

The reference redraws its entire widget by `innerHTML` on every animation
frame. That is fine for a 236 px demo; a portfolio answer is ~800 characters.

Measured with the redraw approach, 4x CPU throttle:

```
p50 20.4 ms · p90 61.4 ms · p99 126.5 ms · max 234.2 ms · 12 frames > 100 ms
```

The port therefore runs the same visuals as CSS animations (compositor thread)
and only re-renders React on discrete changes (one second, one stage). Two
further fixes came out of measurement, not guesswork:

1. **Per-character transforms** promoted ~800 layers → p99 113 ms. Characters
   now fade only; the 3px rise is animated once per word.
2. **Mounting ~800 spans** in one commit cost a large synchronous frame.
   Characters are grouped into clusters of 6 for the reveal → p99 76.7 ms.

Final, same conditions:

```
p50 19.9 ms · p90 31.3 ms · p99 53.5 ms · max 151.2 ms · 2 frames > 100 ms
```

Baseline for the same page with no chat open: p99 51.3 ms. The chat is now
within noise of the idle page.

## Bug found and fixed during the port

`display:inline-block` on every character disabled word breaking, so the answer
rendered as `acq uisition` / `fea tures`. Word-level wrappers with inline
character spans inside fixed it; verified 123 intact word spans.

## Verification

- Screen recordings: `nara-ref-desktop.mp4`, `nara-ref-mobile.mp4`, `nara-nav.mp4`.
- Reveal sampled in-page (CDP round-trips are too slow for this): desktop 103
  intermediate states over 2450 ms, mobile 65 over 2483 ms.
- Nav glide sampled in-page: 85 distinct indicator positions with visible
  overshoot (`492.9 → 488.3 → … → 467.9`), proving a spring path, not a snap.
- `Thinking` shimmer confirmed by per-character colour variation in the DOM
  (`rgb(118,118,126)` → `rgb(240,238,230)`).
