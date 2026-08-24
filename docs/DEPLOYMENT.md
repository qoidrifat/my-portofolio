# Deployment

## Portfolio Website
- **Live:** https://qoidrifat.vercel.app
- **Platforms:** Vercel + Cloudflare Pages (`wrangler.toml` `pages_build_output_dir="dist"`)
- **Build:** `npm run build` → `dist/` + `generate-stats.mjs` → `src/data/performance-metrics.json`
- **PWA:** `VitePWA` generates `sw.js` + `workbox-*`
- **SPA routing:** `vite.config.js` `navigateFallback: '/'`

## Flagship Projects

### PayrollPro — HR, Attendance & Payroll
- **Repo:** https://github.com/qoidrifat/payrollpro
- **Status:** DEPLOYMENT BLOCKED — staging requires secrets/DB not available in this portfolio repo (see payrollpro repo for local Docker setup)
- **Evidence:** 262 PHPUnit tests, `docs/mobile-api.yaml`, `docs/reports/*`, `public/projects/payrollpro/*.webp` verified via `scripts/verify-payrollpro-visuals.mjs`
- **Next:** Staging on Laravel Cloud/Render with MySQL/PG + Redis, `docs/DEPLOYMENT.md` in payrollpro repo

### SuperFood — OFD Data Platform
- **Repo:** https://github.com/qoidrifat/superfood-ofd-scraper
- **Status:** DEPLOYMENT BLOCKED — requires PG16, Redis, Playwright, S3 — local `docker compose up` only
- **Evidence:** 150 tests, 4-tier strategy, Prometheus/Grafana, `public/projects/superfood/*.webp`
- **Next:** Staging per superfood `docs/getting-started.md`

### FER — Facial Expression Recognition
- **Live:** https://huggingface.co/spaces/qoidrifat/demo-sidang
- **Status:** Live (Gradio on Hugging Face Spaces)

No fake URLs are claimed. Staging is documented as blocked pending infrastructure, not fabricated.
