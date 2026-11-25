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
