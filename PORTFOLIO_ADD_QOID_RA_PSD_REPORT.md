# Portfolio Add Qoid RA PSD Report

## File yang Dianalisis

- `src/lib/data.js`
  - Source of truth untuk data project portfolio.
- `src/components/portofolio/ProjectSection.jsx`
  - Komponen project grid dan project card.
- `src/components/portofolio/ProjectVisual.jsx`
  - Renderer thumbnail dari `imageUrl` dan fallback visual.
- `src/components/portofolio/ProjectModal.jsx`
  - Modal detail project dengan tombol Live Preview dan Source Code.
- `public/`
  - Folder static asset Vite/React yang dibaca dari root path `/`.
- Repository GitHub `https://github.com/qoidrifat/qoid_ra.psd`
  - Repo berisi output static Jupyter Book/Sphinx, notebook data mining, script Python/Streamlit, dataset `Wholesale customers data.csv`, dan workflow GitHub Pages.
- Live preview `https://qoidrifat.github.io/qoid_ra.psd/intro.html`
  - Halaman publik menampilkan dokumentasi `DATAMINING` dengan navigasi topik Proyek Sains Data.

## File yang Diubah

- `src/lib/data.js`
- `src/components/portofolio/ProjectSection.jsx`
- `public/project-qoid-ra-psd.png`
- `PORTFOLIO_ADD_QOID_RA_PSD_REPORT.md`

## Project Baru yang Ditambahkan

- Nama project: `Qoid RA PSD`
- Judul card: `Qoid RA PSD`
- Kategori: `Data Mining Documentation / Jupyter Book`
- Filter category: `Data Science`

## Analisis Aktual Repository

- Project bukan landing page interaktif murni, melainkan dokumentasi static site berbasis Jupyter Book/Sphinx.
- Konten utama berfokus pada tugas Proyek Sains Data, eksplorasi data, klasifikasi audio, Zero Crossing Rate, statistik audio, dan analisis Wholesale Customers Dataset.
- Repo juga memiliki script Streamlit untuk prototype klasifikasi audio dan prediksi channel Wholesale Customers.
- Karena itu, copywriting portfolio direvisi agar lebih akurat, profesional, dan tidak misleading sebagai web design showcase.

## Data Project yang Digunakan

```js
{
  title: 'Qoid RA PSD',
  category: 'Data Mining Documentation / Jupyter Book',
  filterCategory: 'Data Science',
  imageUrl: '/project-qoid-ra-psd.png',
  technologies: ['Jupyter Book', 'Python', 'Streamlit', 'scikit-learn', 'Pandas', 'librosa', 'GitHub Pages'],
  demoUrl: 'https://qoidrifat.github.io/qoid_ra.psd/intro.html',
  githubUrl: 'https://github.com/qoidrifat/qoid_ra.psd'
}
```

## Tech Stack yang Terdeteksi

- `Jupyter Book` / `Sphinx Book Theme`
- `Python`
- `Jupyter Notebook`
- `Streamlit`
- `pandas`
- `scikit-learn`
- `librosa`
- `NumPy`
- `Matplotlib`
- `GitHub Pages`

## Link Live Demo

- `https://qoidrifat.github.io/qoid_ra.psd/intro.html`

## Link Source Code GitHub

- `https://github.com/qoidrifat/qoid_ra.psd`

## Cara Icon GitHub Ditambahkan

- Menggunakan icon `Github` dari `lucide-react`, library yang sudah dipakai di portfolio.
- Tidak ada package baru yang di-install.
- Icon ditempatkan di kiri teks `Source Code`.
- Link valid dibuka dengan `target="_blank"` dan `rel="noopener noreferrer"`.

## Status Thumbnail/Image

- Thumbnail dibuat dari live preview yang diberikan.
- File asset lokal: `public/project-qoid-ra-psd.png`
- Path di kode: `/project-qoid-ra-psd.png`
- Tidak memakai path `/public/project-qoid-ra-psd.png` karena Vite membaca folder `public` sebagai root static asset.
- Tidak memakai gambar eksternal random.
- Thumbnail tetap memakai screenshot asli halaman Jupyter Book agar sesuai dengan isi project.

## Hasil Validasi Build/Lint

- `npm run lint`: berhasil.
- `npm run build`: berhasil.

## Catatan

- Thumbnail tersedia dan berhasil dimuat dari asset lokal.
- Tidak ada broken image, black screen, atau console error pada validasi runtime.
- Build masih menampilkan warning chunk > 500 kB, tetapi bukan error dan tidak terkait perubahan ini.
- Revisi terbaru menyesuaikan positioning project dari `Interactive Landing Page / Web Design Showcase` menjadi `Data Mining Documentation / Jupyter Book` berdasarkan isi repository aktual.
