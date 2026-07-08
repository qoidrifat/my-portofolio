# Technical Documentation - Portfolio Website

## Overview
Website portofolio ini dirancang dengan standar teknologi modern untuk menciptakan pengalaman pengguna yang imersif, responsif, dan performan. Fokus utama adalah pada **Micro-interactions**, **Smooth Transitions**, dan **Aksesibilitas (WCAG 2.1)**.

## Tech Stack
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **Icons**: Lucide React & React Icons
- **Deployment**: Cloudflare Pages / Base44

## UI/UX Design Principles
1.  **Glassmorphism**: Menggunakan efek `backdrop-blur` dan `bg-white/5` untuk menciptakan tampilan yang bersih dan modern di atas latar belakang gelap.
2.  **Smooth Transitions**: Semua animasi transisi dikonfigurasi antara **200ms - 300ms** menggunakan easing function `easeOut` atau `spring` untuk feel yang organik.
3.  **Interactive Feedback**:
    - **Scroll Progress**: Indikator progres membaca di bagian atas navbar.
    - **Magnetic-like Effects**: Hover states yang responsif pada tombol dan kartu.
    - **Spotlight Background**: Efek cahaya radial yang mengikuti pergerakan mouse di Hero section.
4.  **Dark Mode First**: Desain berbasis palet warna Zinc-950/900 untuk kenyamanan mata dan kontras tinggi.

## Arsitektur Komponen
- **Layout.jsx**: Wrapper utama yang menangani navigasi global, scroll progress, dan footer.
- **HeroSection.jsx**: Landing point dengan animasi tipografi dan efek interaktif mouse.
- **ProjectSection.jsx**: Galeri proyek dengan sistem filtering kategori dan modal detail.
- **TechStackSection.jsx**: Marquee horizontal untuk menampilkan teknologi dengan layout grid kategori.
- **GallerySection.jsx**: Masonry grid untuk fotografi dengan fitur lightbox.

## Optimasi Performa
1.  **Lazy Loading**: Semua gambar menggunakan atribut `loading="lazy"` untuk mengurangi waktu pemuatan awal.
2.  **Framer Motion**: Menggunakan `AnimatePresence` untuk transisi masuk/keluar yang mulus tanpa lag.
3.  **Passive Listeners**: Scroll event listener dioptimalkan dengan opsi `{ passive: true }`.

## Aksesibilitas
- Penggunaan `aria-label` yang deskriptif pada elemen interaktif.
- Struktur heading (`h1`-`h4`) yang logis untuk pembaca layar.
- Kontras warna yang memenuhi standar WCAG 2.1 untuk keterbacaan maksimal.
