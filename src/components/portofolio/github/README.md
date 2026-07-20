# GitHub Section — Component Structure

Komponen-komponen GitHub dashboard yang dipecah dari `GitHubSection.jsx` untuk maintainability.

## File Overview

| File | Exports | Description |
|------|---------|-------------|
| `utils.js` | `fmt`, `timeAgo`, `formatDate`, `pluralize`, `generateContributionData`, `getHeatmapLevel`, `computeLanguageData`, constants | Pure utility functions — no React dependencies. Includes Mulberry32 seeded PRNG for deterministic heatmap data. |
| `Skeleton.jsx` | `SkeletonLine`, `RepoSkeleton` | Loading placeholder components used across all sub-components. |
| `badges.jsx` | `LangDot`, `TopicBadge` | Small inline badges: language dot with color, repo topic pill. |
| `ProfileCard.jsx` | `ProfileCard` (default) | GitHub profile card with avatar, bio, location, join date, username. |
| `StatCard.jsx` | `StatCard` (default) | Single metric card with icon, label, value, accent color, optional link. |
| `ContributionHeatmap.jsx` | `ContributionHeatmap` (default) | SVG contribution calendar — 52 weeks × 7 days, tooltips, month/day labels, legend. Data is generated deterministically from repo activity. |
| `LanguageChart.jsx` | `LanguageChart` (default) | SVG donut chart + horizontal progress bars showing top 5 language distribution. |
| `RepoCard.jsx` | `RepoCard` (default) | Repository card with name, description, topics, language dot, stars, forks, updated time. |
| `ContributionActivity.jsx` | `ContributionActivity` (default) | Timeline list of most recently updated repositories, with dot indicators and timestamps. |
| `DevInsights.jsx` | `DevInsights` (default) | 4-card grid: Top Language, Most Starred, Open Source Impact, Recently Updated — each with animated progress bar. |
| `States.jsx` | `ErrorState`, `EmptyState`, `StreakBadge` | Edge-case UI: error state with retry, empty state with CTA, contribution streak badge. |

## Data Flow

```
useGithubRepos hooks (react-query)
       │
       ▼
  GitHubSection.jsx  ← orchestrator, handles loading/error/data state
       │
       ├── ProfileCard          ← profile data
       ├── StatCard (×6)        ← profile + aggregated repo stats
       ├── StreakBadge           ← events count
       ├── StatCard (×3)         ← events + issues + account age
       ├── ContributionHeatmap  ← repos + events count
       ├── LanguageChart        ← repos (language distribution)
       ├── RepoCard (×N)        ← individual repo data
       ├── ContributionActivity ← repos (sorted by updatedAt)
       └── DevInsights          ← repos + profile
```

## Dependencies

- **`framer-motion`** — scroll-reveal animations, hover interactions
- **`lucide-react`** — icons
- **`@tanstack/react-query`** — data fetching via `useGithubRepos` hooks
- **Tailwind CSS** — all styling via utility classes

No external charting or SVG libraries — all charts (heatmap, donut) are hand-crafted SVG.
