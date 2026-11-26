# E2E with the `e2e` framework (2026-11-26)

Audit E2E for two areas only: the NARA guide and the navbar/header.

## Setup

| Item | Value |
| --- | --- |
| Framework | `e2e` 0.25.0 (`e2e-inc/e2e`), engine `@e2e-dev/web` 0.17.0 over Playwright |
| Config | `e2e.config.ts`, scoped by `tests` to the two files |
| App under test | local harness on `:5640` (serves `dist/`, runs the real answer pipeline) |
| Video | `--video=on` (framework records WebM itself) |
| Model | the provider NARA already uses, via `@ai-sdk/openai-compatible` |

The framework is a real tool, not a hosted service: `e2e.com` is the docs site,
the CLI installs from npm, and the runner executes Playwright locally.

## Result

```
Test Files  2 passed (2)
     Tests  7 passed (7)
  Duration  33.82s
        AI  9.5k tokens · 1 model call
```

| Test | Area | Duration |
| --- | --- | --- |
| the guide opens from the floating launcher | NARA | 2 985 ms |
| thinking shows a shimmering label with a live second counter | NARA | 2 174 ms |
| the answer types in and settles on portfolio facts | NARA | 3 992 ms |
| the agent can open the guide and ask about skills | NARA | 23 011 ms |
| every nav item renders and Home is current on load | Navbar | 1 517 ms |
| tapping Projects marks it current | Navbar | 1 455 ms |
| the indicator glides instead of jumping | Navbar | 2 488 ms |

Deterministic steps (6 of 7 tests) call no model. The single `agent.act` is
where every token above comes from.

## Three product bugs the framework found

These are app defects, not test defects. All three were fixed in the app.

1. **The launcher was unclickable by automation** — `AUTOMATION_UNSUPPORTED:
   "element is not stable"`. The idle bob animated the whole `<button>`, so the
   hit target never held still. A moving target is also harder for a real thumb.
   Fixed by moving the motion inside the button: the face breathes, the button
   stays put.
2. **Two live regions at once** — the greeting bubble was `role="status"` while
   the thinking block was also `role="status"`. A screen reader would announce
   both. The bubble is now `role="complementary"`.
3. **The odometer leaked 30 digits to assistive tech** — every slot glyph was in
   the accessibility tree, so the timer read as
   "0 1 2 3 4 5 6 7 8 9 0 1 2 …". The track is now `aria-hidden` with one
   `sr-only` value behind it.

## Recordings

`--video=on` produced one WebM per test from Playwright's own capture. The two
MP4s are those recordings, normalised and concatenated — nothing re-recorded:

| File | Content | Duration | Size |
| --- | --- | --- | --- |
| `e2e-nara.mp4` | 4 NARA tests | 31.92 s | 659 KB |
| `e2e-navbar.mp4` | 3 navbar tests | 5.00 s | 164 KB |

Two artifacts had to be handled, both measured:

- Playwright starts recording before the page paints, so each clip opened on
  ~0.35 s of blank white. Dropped with an input-side seek.
- Concatenating raw clips blended the end of one with the start of the next,
  producing a white flash present in neither source. Each clip is normalised
  first, then joined.

Verified: 0 white frames across 11 samples of the joined video.

## Replay cache

`.e2e/cache/` replays recorded `agent.act` steps with no model call, so CI can
gate on this suite without spending tokens. `--strict-cache` makes a stale
recording fail instead of silently going live.
