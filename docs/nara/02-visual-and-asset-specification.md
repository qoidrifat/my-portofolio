# NARA — GATE 1-B: 3D Asset Specification & Licensing Audit

**Date:** 2026-11-25
**Status:** Asset decision required — free options exist but none meet the full "realistic professional male" brief. Two viable paths below.

---

## 1. Kebutuhan aset (dari PRD §5.4, FR-3D-001..003)

| Kebutuhan | Detail |
|---|---|
| Format | GLB/GLTF |
| Rig | Humanoid skeleton (Mixamo-compatible ideal) |
| Facial rig | Blendshapes: blink, smile, neutral, curious, thinking, surprised, viseme |
| Clips wajib | Idle, Greeting_Wave, Listening, Thinking, Speaking, Farewell |
| Ukuran | ≤ 5 MB setelah optimasi (Draco + KTX2) |
| Lisensi | Boleh dipakai publik komersial, dokumentasi jelas |
| Visual | Realistic professional male, charcoal overshirt, blue accent |

---

## 2. Hasil riset — opsi gratis (diverifikasi live 2026-11-25)

### 2.1 Three.js official examples — MIT, langsung pakai

Diverifikasi via GitHub API + HEAD request ke threejs.org:

| Model | Ukuran | Animations (verifikasi parse GLB JSON) | Morph | Catatan |
|---|---|---|---|---|
| `Xbot.glb` | 2.8 MB | `agree` (nod), `headShake`, `idle`, `run`, `sad_pose`, `sneak_pose`, `walk` | no | Semi-realistic, rig Mixamo-compatible, proporsi robot-ish |
| `Soldier.glb` | 2.1 MB | `Idle`, `Run`, `TPose`, `Walk` | no | Semi-realistic, military, tidak cocok gaya "engineer smart-casual" |

**Lisensi:** repo three.js = MIT. Model example dianggap bagian dari distribusi MIT — penggunaan bebas termasuk komersial. File `.license` per-model tidak ada di repo, tapi keseluruhan examples dilindungi MIT umbrella.

**Verdict:** bisa dipakai sebagai **placeholder fungsional** sekarang. Tidak memenuhi "realistic professional male" — Xbot terlihat seperti robot, Soldier seperti tentara. Wave animation **tidak ada** di keduanya (bisa dibuat via animation controller, bukan clip).

### 2.2 Sketchfab CC0 — hasil riset API

Query `human+rigged+man+downloadable+license=cc0` menghasilkan **nol** kandidat karakter humanoid realistis. Hasil CC0 yang ada: otak, tulang, teapot — bukan karakter. Karakter "realistic rigged man" dengan CC0 praktis tidak ada di pasar gratis.

### 2.3 KayKit / Quaternius — CC0 tapi stylized

Gaya low-poly/stylized, bukan realistic. Melanggar brief PRD §3.2. Tidak dipertimbangkan.

---

## 3. Opsi berbayar — kalau "realistic" harus dipenuhi penuh

| Sumber | Harga | Catatan |
|---|---|---|
| **Mixamo** (Adobe) | Gratis dengan akun Adobe | Rig + animasi wave/greeting tersedia, tapi **modelnya generic** (Y-Bot, X-Bot yang sama) atau perlu upload karakter sendiri |
| **Sketchfab** berbayar | $5–60/model | Realistic male rigged banyak; **cek lisensi per-model** (harus "Editorial + Commercial" atau CC Attribution) |
| **Reallusion Character Creator 4** | $199+ (tool) + asset | Kualitas realistic tertinggi, rigged + blendshapes + animasi library |
| **Ready Player Me** | Free tier | Half-body + full-body avatar, **butuh akun**, VRM/GLB export; gaya semi-realistic, bukan photoreal |
| **Freelance 3D artist** | $150–800 custom | Satu-satunya cara mendapat "professional engineer, charcoal overshirt, blue accent" persis sesuai brand |

---

## 4. Rekomendasi bertingkat

### Path A — Ship sekarang dengan Xbot (MIT, gratis)

- Ganti `MODEL_URL = null` → `https://<cdn>/Xbot.glb` (host same-origin di `public/models/`)
- Map: `idle` → idle, `agree` → greeting (nod bukan wave), `sad_pose` → thinking
- Wave dibuat prosedural di `NaraCharacter.jsx` (arm rotation, sudah ada)
- **Visual tidak memenuhi brief** — robot-like, bukan professional male
- Cost: $0. Waktu: 15 menit.

### Path B — Custom commission (menyatu dengan brand)

- Brief lengkap sudah ada di PRD §3 & §7.2
- Sketchfab marketplace atau Fiverr/ArtStation
- Checklist wajib: GLB, Mixamo-compatible rig, 7 blendshapes wajah, 7 clips, lisensi tertulis boleh komersial + redistribusi pada website publik
- Cost: $150–800. Waktu: 1–3 minggu.

### Path C — Hybrid (dianjurkan)

- Ship Path A sekarang (NARA hidup, chat berfungsi, semua gate lulus)
- Ganti model di GATE 6+ ketika aset custom jadi — **satu baris `MODEL_URL` + mapping clip**, tanpa perubahan kode lain karena seluruh kontrak interaksi sudah di `NaraCharacter.jsx`

---

## 5. Spesifikasi aset yang harus dibeli/dibuat (untuk Path B)

```
Format        : GLB (glTF binary)
Topology      : Humanoid, Mixamo-compatible skeleton (mixamorig:Hips root)
Polycount     : ≤ 60k triangles setelah decimation
Textures      : ≤ 2048×2048, KTX2/Basis (atau PNG yang bisa dikonversi)
Blendshapes   : blink_L/R, smile, neutral, curious, thinking, surprised,
                viseme_A/I/U/E/O (minimal 6)
Animations    : Idle (loop 4s), Greeting_Wave (2-3 cycles), Listening,
                Thinking, Speaking (viseme-driven), Farewell
Material      : PBR metal-roughness; skin roughness 0.5-0.7, no glossy plastic
Outfit        : Charcoal/graphite overshirt, neutral inner, muted cobalt accent
License       : Written grant — commercial use + web redistribution + modification
Size target   : ≤ 5 MB GLB setelah Draco compression
Delivery      : GLB + source (FBX/Blend) + license document
```

---

## 6. Rekomendasi saya

**Path C.** Reasoning:

1. Semua GATE 0–5 sudah lulus dengan placeholder — arsitektur tidak akan berubah
2. `MODEL_URL` + `clipMap` di satu file; swap aset = data change
3. Portfolio tetap mendapat upgrade "hidup" sekarang, bukan 3 minggu lagi
4. Risiko visual "robot-like" diketahui owner sebelum ship — bukan kejutan
