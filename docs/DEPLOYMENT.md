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

## Deployment Readiness Checklist

| Area | Portfolio | PayrollPro | SuperFood | FER |
|------|-----------|------------|-----------|-----|
| Application | READY (Vite build) | READY (Laravel 12) | READY (FastAPI+ Svelte) | READY |
| Database | N/A (static) | BLOCKED (MySQL/PG + Redis, no secrets) | BLOCKED (PG16+Redis+S3) | N/A |
| Storage | READY (public/ + CDN) | BLOCKED (S3 for payslips) | BLOCKED (S3 raw archive) | READY (HF Spaces) |
| Secrets | N/A (no VITE secrets) | BLOCKED (APP_KEY, DB creds) | BLOCKED (Fernet vault) | N/A |
| Migrations | N/A | READY (Alembic/Migrate files) | READY (Alembic) | N/A |
| Health check | N/A (static) | PARTIALLY (Pulse, /health via status page) | PARTIALLY (Prometheus /metrics) | READY |
| Monitoring | N/A | READY (Pulse+Sentry) in repo | READY (Prometheus+Grafana) in repo | N/A |
| Rollback | READY (Vercel rollback) | READY (git + migrate rollback) | READY (git + Alembic downgrade) | N/A |
| Verdict | **READY** | **BLOCKED — infra/secrets** | **BLOCKED — infra/secrets** | **READY** |
