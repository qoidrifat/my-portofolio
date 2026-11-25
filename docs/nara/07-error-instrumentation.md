# NARA — Error Instrumentation (2026-11-25)

## Root cause of "NARA tidak merespon"

`src/lib/nara/chat-client.js` memanggil `/api/nara/chat`, sedangkan function
di-deploy di `/api/nara-chat` (hyphen). Path yang salah tidak cocok dengan
function mana pun sehingga jatuh ke catch-all rewrite `/(.*) -> /index.html`.
Respons yang diterima adalah HTML, `res.json()` gagal, dan klien mengembalikan
`status: 'error'` tanpa detail — visitor hanya melihat "NARA is unavailable".

Perbaikan: `ENDPOINT = '/api/nara-chat'`.

## Satu laporan error untuk seluruh app

`src/lib/errors.js`:

- `describeError(scope, error, { status, extra })` → `{ scope, reason, at, status?, extra? }`
- `logError(...)` → menulis satu baris console dan mengembalikan report yang sama.

`at` diambil dari frame pertama stack yang bukan milik `errors.js` sendiri,
dipotong ke `…/file.jsx:baris`. Visitor tetap menerima copy aman dari
`nara-copy.js` / `COPY` ContactSection; detail teknis hanya masuk console.

Titik yang sudah diinstrumentasi:

| Lokasi | Scope | Step |
| --- | --- | --- |
| `src/lib/nara/chat-client.js` | `NARA` | `fetch`, `parse`, `api` |
| `src/components/nara/NaraChatPanel.jsx` | `NARA` | `submit` |
| `src/components/portofolio/ContactSection.jsx` | `Contact` | `formspree-submit`, `clipboard-write` |
| `src/hooks/useGithubRepos.js` | `GitHub` | `profile`, `repos`, `search`, `events` |
| `src/components/SectionErrorBoundary.jsx` | `NARA` | `componentStack` |

## Isolasi widget

`SectionErrorBoundary` membungkus `<NaraWidget />` di `Layout.jsx` dengan
`fallback={null}`: chunk gagal dimuat atau render crash tidak lagi berisiko
mengosongkan halaman.

`NaraWidget` juga tidak lagi melempar saat `sessionStorage` diblokir (mode
incognito yang dikeraskan di sebagian browser Android) — nilai awal intro
dibaca lewat `readIntroDone()` yang menangkap exception.

## Bukti

- `tests/errors.test.js` — ekstraksi `file:line`, skip frame helper, string reason.
- E2E headless (mobile 420×860): thinking indicator tertangkap di poll 0
  ("Reading your question…", avatar 36 px, 4 segmen progres, timer 0s), jawaban
  grounded muncul setelahnya.
- Produksi `/api/nara-chat` (preview, bypass header): `200`
  `{"ok":true,"status":"ok","scope":"portfolio"}` dengan 4 pesan tersisa.
- Mode `id` diverifikasi lewat header `x-nara-lang: id` → jawaban bahasa Indonesia.

---

# Answer-reveal transition (2026-11-25)

## Source evaluation

| Link | What it actually is | Decision |
| --- | --- | --- |
| LottieFiles `loading-animation-wdzJDYJUKN` | Four dots filling left to right | **Adopted as the motion idea.** Four dots is the same count as the four thinking steps. |
| LottieFiles `chat-typing-indicator-S3mtGJygid` | Three grey dots, opacity pulse | Rejected: duplicates the emerald ping already in the bubble. |
| Jitter `the-prompt-ai-chat` | Animated chat-UI video template | **Adopted the reveal pattern** (message-by-message entry). The template itself is video, not a web asset. |
| Pinterest pin `1062427368363243804` | Static ChatGPT UI screenshot | Rejected: not an animation. |

## Why no `lottie-web`

`total-js` has ~123 KB of headroom and `bundle-count` is already at its 18
ceiling. Shipping `lottie-web` (~250 KB minified) would break two gates for an
effect that framer-motion (already in the bundle) reproduces. Measured cost of
the chosen approach: **+0.9 KB** (805.4 KB total, gate 927.7 KB).

## What was built

`src/components/nara/WordReveal.jsx` splits the reply into 3-word chunks and
fades each one in from `blur(4px)` + 4 px lift, staggered. Long answers are
capped at 1.4 s total so a wall of text never takes five seconds to appear.

`NaraChatPanel` only animates the newest assistant message: replaying the
stagger on every re-render would re-run the effect when the parent state
changed. The bubble itself also fades in from `opacity 0.4`, so the answer is
never waiting inside a fully painted empty box — the earlier build showed a
blank card for about a second.

Transform/opacity/filter only. `prefers-reduced-motion` renders the text
immediately.

## Measured in the browser

In-page recorder (rAF, no CDP round-trip overhead):

```
0/38 → 2 → 3 → 4 → 5 → 18 → 26 → 28 → 31 → 32 → 33 → 34 → 35 → 36 → 37 → 38
reveal duration: 1170 ms · intermediate states: 14
```
