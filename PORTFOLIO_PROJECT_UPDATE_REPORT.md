# Portfolio Project Update Report

## Ringkasan

Update ini menambahkan dua project baru ke section Projects/Portfolio tanpa mengubah tema utama, layout besar, warna utama, atau sistem visual portfolio yang sudah ada. Card baru mengikuti pattern card existing: dark glass card, rounded visual, tech badge, hover transition ringan, tombol case study, dan detail modal.

## File yang Diubah

- `src/lib/data.js`
  - Menambahkan data project `PayrollPro`.
  - Menambahkan data project `Explore Bali`.
  - Menambahkan metadata `features`, screenshot, tech stack, role, impact, dan icon.
  - Menghapus project `IoT & Hardware Modifications` karena tidak relevan dengan portfolio saat ini.

- `src/components/portofolio/ProjectSection.jsx`
  - Menggunakan data canonical dari `src/lib/data.js`.
  - Menampilkan generated thumbnail internal untuk project yang belum punya image real.
  - Menyembunyikan tombol GitHub jika link repository belum tersedia.

- `src/components/portofolio/ProjectModal.jsx`
  - Menggunakan thumbnail renderer yang sama dengan project card.
  - Menambahkan blok `Key Features` ketika data project menyediakan fitur.
  - Menyembunyikan tombol Live Preview / Source Code jika link belum tersedia.

- `src/components/portofolio/ProjectVisual.jsx`
  - Komponen baru untuk render screenshot image existing dengan fallback visual internal berbasis CSS dan icon jika suatu project belum punya screenshot.

- `PORTFOLIO_PROJECT_UPDATE_REPORT.md`
  - Laporan perubahan ini.

- `public/project-payrollpro.png`
  - Screenshot asli PayrollPro dari halaman publik lokal `http://127.0.0.1:8010/`.

- `public/project-explore-bali.png`
  - Screenshot asli Explore Bali dari `C:\laragon\www\bali-project\docs\assets\bali-project.png`.

- `public/project1.png`
  - Thumbnail project Facial Expression Recognition System with VGG16 & SE-Block Attention.

## Project yang Ditambahkan

### PayrollPro

- Category: Payroll & Employee Attendance Management System
- Description: Sistem payroll dan absensi karyawan berbasis web untuk mengelola employee, absensi QR, penggajian, payslip, approval, dan laporan dalam satu dashboard modern.
- Features:
  - Employee management
  - QR attendance system
  - Payroll calculation
  - Payslip generation
  - Admin & employee dashboard
  - Approval workflow
  - Attendance report
  - Role-based access

### Explore Bali

- Category: Travel Booking & Tourism Website
- Description: Website travel dan booking wisata Bali untuk destinasi, paket perjalanan, booking, invoice, dashboard user, dan dashboard admin.
- Features:
  - Destination showcase
  - Travel package management
  - Booking system
  - Internal booking flow
  - Invoice page
  - User dashboard
  - Admin dashboard
  - Responsive travel UI

## Penyesuaian UI

- Card baru mengikuti ukuran, spacing, border, shadow, rounded corner, hover transition, dan badge style card existing.
- Card project sekarang memakai screenshot lokal dari folder `public`: `/project1.png`, `/project-payrollpro.png`, dan `/project-explore-bali.png`.
- Thumbnail tetap mengikuti treatment card existing: object-cover, overlay gradient, rounded container, tech badges saat hover, dan modal preview.
- Modal detail tetap memakai struktur existing: overview, technologies, challenges, dan action links.
- Fitur project ditambahkan sebagai grid badge sederhana agar tetap rapi di desktop, tablet, dan mobile.
- Tidak ada tombol repository/live demo untuk PayrollPro dan Explore Bali karena link belum tersedia.

## Tech Stack yang Terdeteksi

### PayrollPro (`C:\laragon\www\project-kp`)

Berdasarkan `composer.json`, `package.json`, dan struktur `resources`:

- Laravel 12
- PHP 8.2+
- Vue 3
- Inertia.js
- Vite
- Tailwind CSS
- MySQL / Supabase
- JavaScript
- DomPDF
- Spatie Laravel Permission
- Laravel Sanctum
- ApexCharts
- QRCode

### Explore Bali (`C:\laragon\www\bali-project`)

Berdasarkan `README.md` dan struktur file:

- PHP Native
- MySQL / MariaDB
- mysqli
- HTML
- Custom CSS
- JavaScript
- Apache / Laragon / XAMPP / PHP built-in server

Project ini tidak memakai Laravel, React, Vue, Vite, npm, atau Composer.

## Cara Menjalankan Portfolio

```bash
npm install
npm run dev
```

Local URL default:

```text
http://127.0.0.1:5173/
```

Build production:

```bash
npm run build
```

Lint:

```bash
npm run lint
```

## Catatan Link dan Screenshot

- PayrollPro belum diberi link live demo atau source code, jadi tombol eksternal tidak ditampilkan.
- Explore Bali belum diberi link live demo atau source code, jadi tombol eksternal tidak ditampilkan.
- Screenshot PayrollPro diambil dari halaman publik lokal karena route `/demo` menghasilkan HTTP 500 pada database lokal saat membuat user demo.
- Screenshot Explore Bali memakai asset dokumentasi project yang sudah tersedia.
