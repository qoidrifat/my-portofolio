# NARA — GATE 5 & 6: Quality Report & Release Candidate

**Date:** 2026-11-25
**Branch:** `feat/nara-portfolio-guide`
**HEAD:** `646ca7e`
**Latest preview:** `https://my-portofolio-fqmizdyw6-qoidrifat.vercel.app`
**Verdict: `CONDITIONAL_PASS`** — semua gate teknis lulus; GLB visual bukan photoreal-professional penuh dan production promotion menunggu otorisasi terpisah.

---

## 1. Ringkasan eksekusi GATE 0–6

| Gate | Status | Ringkasan |
|---|---|---|
| GATE 0 Baseline | ✅ PASS | 3 blocker diukur; 3 keputusan owner: budget split, Upstash KV, key via Vercel env |
| GATE 1 Knowledge | ✅ PASS | KB mekanis dari data asli; 34-test lock; context selection ≤3800 char |
| GATE 1-B Asset | ✅ PASS (Path A→real) | Ara 3D Gen MIT + MakeHuman CC0 + CMU mocap; 1.69 MB setelah Draco+WebP |
| GATE 2 Scene + Chat | ✅ PASS | R3F v8, state machine 21-test, chat panel 2 bahasa, fallback WebGL |
| GATE 3 Deploy API | ✅ PASS | Live smoke test: model ID echo, usage accounting, 3 bug live diperbaiki |
| GATE 4 Rate + Budget | ✅ PASS | 15 skenario edge-verified; USD 0.10 hard stop terbukti menutup request |
| GATE 5 Performance | ✅ PASS | Budget 6/6, initial-js 606.5/683.6 KB, no overflow 360–1440 |
| GATE 6 Release | ⏳ | Report ini; promotion menunggu otorisasi |

---

## 2. Arsitektur final

```
Browser
  └─ Layout.jsx (lazy Suspense)
      └─ NaraWidget.jsx          entrance dari intro flag asli, sekali/session
          ├─ NaraScene.jsx       lazy 3D, WebGL detect, error boundary
          │   └─ NaraCharacter.jsx  useGLTF + useAnimations + morph blink + gaze
          ├─ NaraFallback.jsx    static, chat tetap hidup
          └─ NaraChatPanel.jsx   floating panel / bottom sheet, EN+ID
                 ↓ same-origin POST /api/nara-chat
api/nara-chat.js               validate → gate → context → limits → budget
      └─ server/nara/          rate-limiter (Upstash) · deploy-provider
                               prompt-policy · response-validator
                                    ↓
                    Deploy API — zai-org/glm-5.3-flash (verified live)
```

---

## 3. Aset 3D — GATE 1-B resolved

| Properti | Nilai (terverifikasi parse GLB) |
|---|---|
| Sumber | Ara 3D Gen `github.com/olatunde85/3d-gen` (MIT tool) |
| Basis karakter | MakeHuman CC0, 900+ morph targets, 20 photo skins |
| Mocap | CMU Motion Capture Database (komersial OK, no resale of raw data) |
| Preset | The Corporate High-Flier |
| Detail | low (~27.6k upload vertices) |
| Animasi | Idle, Wave, Talk with gestures, Look around |
| Blendshapes | **34 ARKit-compatible** (eyeBlink L/R, brow, jawOpen…) |
| Skeleton | 70 joints, Mixamo-compatible |
| Ukuran | 6.9 MB → **1.69 MB** (Draco + WebP @1024px) |
| Lokasi | `public/models/nara-character.glb` — served `model/gltf-binary` di edge |

Ceklis lisensi PRD §5.4: ✓ komersial, ✓ web publik, ✓ modifikasi, ✓ terdokumentasi, ✓ bukan tiruan orang nyata.

---

## 4. Performance — GATE 5

| Gate | Nilai | Budget | Margin |
|---|---|---|---|
| **initial-js** | 606.5 KB | 683.6 KB | 77 KB (LCP-relevant, ketat) |
| total-js | 1.69 MB | 2.29 MB | 0.6 MB (semua chunk dihitung) |
| total-css | 89.4 KB | 92.8 KB | 3.4 KB |
| largest-js | 943.7 KB | 976.6 KB | 32.9 KB (chunk 3D, lazy) |
| largest-css | 89.4 KB | 97.7 KB | 8.3 KB |
| bundle-count | 19 | 24 | 5 |

Perubahan kebijakan (owner-approved): `initial-js` dipisah dari `total-js` — yang pertama diukur dari `dist/index.html` (eager only), yang kedua semua chunk. Threshold dinaikkan hanya setelah pengukuran: 3D runtime +797 KB, chunk 3D +drei/Draco 943.7 KB. **Tidak ada gate dihapus; LCP gate justru lebih ketat dari sebelum split.**

GLB (1.69 MB) bukan JS dan tidak masuk gate mana pun; di-load on-demand setelah page interaktif, dengan `Cache-Control: public, max-age=0, must-revalidate` di edge.

### Runtime verification (CDP, edge-equivalent harness)

```
widgetPresent: true | canvas: true | chat dialog: opens + closes
suggestions: 4 | input + close button: present
360/390/768/1024/1440 → hasHorizontalOverflow: false (semua)
console: clean — hanya GitHub API 422 eksternal yang sudah diketahui
```

---

## 5. AI quality — bukti edge

| Pertanyaan | Jawaban (excerpt) |
|---|---|
| "What projects has Qoid built?" | "Qoid has built three featured projects: 1. Facial Expression Recognition System (2024)… VGG16 and SE-Block… 66.9% accuracy on FER-2013… deployed on Hugging Face Spaces. 2. Agent Status…" |
| "Tell me about the Explore Bali project" | "…travel and tour booking platform built in 2026 using pure PHP and MySQL — no framework at all…" |
| "What technologies does Qoid use?" | Full-stack toolkit dibedah per kategori |

Semua angka berasal dari portfolio yang dipublikasikan. "Coming Soon" tidak pernah lagi jadi jawaban (placeholder-guard + test).

---

## 6. Keamanan — GATE 3-4 evidence ringkas

- Provider key: server-only, `Encrypted` di Vercel, 0 kemunculan di repo/bundle/log
- Origin allowlist: 403 untuk origin asing; same-origin diutamakan
- Payload: 8 KB cap, 400 invalid, 413 oversize, 405 method
- Topic gate: out-of-scope + injection ditolak **sebelum** provider — biaya 0
- Rate limits: IP burst 3/5min, IP 15/day, session 5/day, global 25/day, 400/month — semua atomic Redis, salted-hash IP, fail-closed
- Budget: USD 0.10 hard stop terbukti (`monthly_budget` saat spent > cap); reconciliation dari provider usage; reservation released di semua error path
- Output: length cap, markdown flatten, internal-leak detection → fixed refusal

Full evidence: `docs/nara/04-ai-and-security-implementation.md`.

---

## 7. Files added / modified

**Added (12):**
```
api/nara-chat.js
server/nara/{deploy-provider,prompt-policy,rate-limiter,response-validator}.js
src/components/nara/{NaraWidget,NaraScene,NaraCharacter,NaraFallback,NaraChatPanel}.jsx
src/lib/nara/{knowledge,topic-guard,animation-states,chat-client,nara-copy}.js
public/models/nara-character.glb
tests/nara/{knowledge,topic-guard,animation-states}.test.js
docs/nara/{00,02,04}-*.md + laporan ini
```
**Modified (3):** `src/Layout.jsx`, `eslint.config.js`, `performance-budget.json`, `scripts/check-budget.mjs`, `package.json`, `package-lock.json`

**Dependencies added:** `three@0.187.0`, `@react-three/fiber@8.18.0`, `@react-three/drei@9.122.0` — semuanya prod deps, React 18-compatible, npm audit 0 vulnerabilities.

---

## 8. Known limitations

| # | Limitasi | Dampak | Mitigasi |
|---|---|---|---|
| L1 | GLB "Corporate High-Flier" semi-realistic, bukan photoreal professional-engineer penuh | Medium — gaya sesuai theme, outfit office-formal | Upgrade ke commission custom kapan saja via `MODEL_URL` + clip map |
| L2 | `DEPLOY_API_KEY` belum ada di Preview env | Chat 403 di preview baru; production OK | Owner: add di dashboard, centang Preview |
| L3 | Tidak ada wave morph-driven lip-sync | Rendah — talking clip sudah ada | Phase lanjutan |
| L4 | Conversation hanya 2 turns terakhir | Sesuai PRD F-13 MVP | By design |

---

## 9. Remaining blockers

| # | Blocker | Owner action |
|---|---|---|
| BL-1 | Preview env key | `vercel env add DEPLOY_API_KEY preview` |
| BL-2 | Production promotion | Otorisasi eksplisit — `vercel promote` atau `--prod` |
| BL-3 | GLB photoreal upgrade (opsional) | Commission via Path B |
| R6/R7 | Git history + Formspree direct POST | Tetap OPEN — di luar scope NARA |

---

## 10. Release recommendation

**`CONDITIONAL_PASS` untuk release candidate NARA.**

Semua kriteria teknis AC-01..AC-20 terpenuhi **kecuali** visual fotoreal penuh (L1, dikompromi dengan sadar lewat Path C) dan **production promotion yang memang di luar otorisasi task ini**.

Rollback siap: SVG mascot lama utuh di `src/components/mascot/`, NARA terpasang lazy di `Layout.jsx` — hapus satu blok `Suspense` dan widget hilang tanpa menyentuh kode lain.

**Production promotion = keputusan terpisah.** Staged production sebelumnya (`ii8o2egnc`, Phase 13-A2) tidak menyertakan NARA; promotion NARA harus dari deployment branch ini setelah owner menyetujui.
