# Qoid Rif'at — Portfolio

Personal portfolio website showcasing projects, skills, and experience in AI & web development.

Built with **Vite**, **React 18**, **Tailwind CSS**, and **Framer Motion**.

## Tech Stack

| Category | Technologies |
|----------|-------------|
| **Frontend** | React 18, Vite 6, Tailwind CSS 3, Framer Motion |
| **Routing** | React Router 6 |
| **State / Data** | TanStack React Query |
| **Icons** | Lucide React, React Icons |
| **UI Components** | Radix UI (Dialog, Slot), cmdk |
| **PWA** | vite-plugin-pwa |
| **Fonts** | Inter, JetBrains Mono |
| **Tooling** | TypeScript, ESLint, PostCSS |

## Getting Started

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run build` | Production build + generate bundle stats |
| `npm run preview` | Preview production build locally |
| `npm run lint` | Run ESLint |
| `npm run lint:fix` | Run ESLint with auto-fix |
| `npm run typecheck` | TypeScript type checking |

## Project Structure

```
src/
├── api/                    # API clients & SDK wrappers
├── components/
│   ├── portofolio/         # Section components (Hero, About, Projects, etc.)
│   └── ui/                 # Shared UI primitives (Toast, etc.)
├── data/                   # Static data files
├── hooks/                  # Custom React hooks
├── lib/                    # Utilities & providers
├── pages/                  # Route page components
├── App.jsx                 # Root app with routing & intro
├── Layout.jsx              # Shared layout (navbar, footer, etc.)
├── main.jsx                # Entry point
└── index.css               # Global styles & Tailwind imports
```

## Sections

- **Hero** — Introduction with animated terminal emulator
- **About** — Background & expertise
- **Projects** — Featured project cards with case study modals
- **Gallery** — Photography collection with lightbox
- **GitHub** — Live repo stats from GitHub API
- **Tech Stack** — Technologies & tools used
- **Career Timeline** — Professional experience
- **Performance** — Lighthouse metrics showcase
- **Contact** — Get in touch form

## Deployment

Deployed via **Cloudflare Pages** / **Vercel** with SPA fallback routing.

## License

© 2026 Qoid Rif'at. All rights reserved.
