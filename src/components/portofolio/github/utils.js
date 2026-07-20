// ── Constants ──────────────────────────────────────────────────────────────
export const HEATMAP_CELL = 13;
export const HEATMAP_GAP = 3;
export const HEATMAP_RADIUS = 3;
export const HEATMAP_LEVELS = [
  { threshold: 0,  fill: 'rgba(255,255,255,0.04)' },
  { threshold: 1,  fill: 'rgba(6,78,59,0.35)' },
  { threshold: 4,  fill: 'rgba(4,120,87,0.50)' },
  { threshold: 8,  fill: 'rgba(5,150,105,0.60)' },
  { threshold: 14, fill: 'rgba(16,185,129,0.70)' },
];

// ── Formatting ──────────────────────────────────────────────────────────────
export function fmt(n) {
  if (n == null) return '\u2014';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

export function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function pluralize(n, singular, plural) {
  return n === 1 ? `${n} ${singular}` : `${n} ${plural || singular + 's'}`;
}

// ── Seeded PRNG (Mulberry32) ──────────────────────────────────────────────
function mulberry32(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function deriveSeed(repos, eventsCount) {
  if (!repos || repos.length === 0) return eventsCount || 42;
  let hash = (eventsCount || 0) * 31;
  for (const r of repos) {
    hash = ((hash << 5) - hash + (r.id || 0)) | 0;
    if (r.updatedAt) {
      const ts = new Date(r.updatedAt).getTime();
      hash = ((hash << 5) - hash + Math.floor(ts / 86400000)) | 0;
    }
  }
  return Math.abs(hash) || 42;
}

// ── Generate deterministic contribution data ──────────────────────────────
export function generateContributionData(repos, eventsCount) {
  const today = new Date();
  const data = [];
  let totalContributions = 0;
  const rng = mulberry32(deriveSeed(repos, eventsCount));

  for (let w = 51; w >= 0; w--) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const date = new Date(today);
      date.setDate(date.getDate() - (w * 7 + (6 - d)));

      const recencyWeight = Math.max(0.1, 1 - w / 60);
      let count = 0;

      if (repos) {
        for (const repo of repos) {
          const updated = new Date(repo.updatedAt);
          const diffDays = Math.abs((date - updated) / (1000 * 60 * 60 * 24));
          if (diffDays < 3) {
            count += Math.max(1, Math.floor(rng() * 4));
          }
        }
      }

      count = Math.round(count * recencyWeight * (0.3 + rng() * 0.7));
      count = Math.min(count, 25);
      totalContributions += count;

      week.push({ date: date.toISOString().slice(0, 10), count });
    }
    data.push(week);
  }

  return { weeks: data, totalContributions };
}

export function getHeatmapLevel(count) {
  for (let i = HEATMAP_LEVELS.length - 1; i >= 0; i--) {
    if (count >= HEATMAP_LEVELS[i].threshold) return HEATMAP_LEVELS[i];
  }
  return HEATMAP_LEVELS[0];
}

// ── Language distribution ───────────────────────────────────────────────────
export function computeLanguageData(repos) {
  if (!repos || repos.length === 0) return [];
  const counts = {};
  repos.forEach(r => {
    if (r.language) counts[r.language] = (counts[r.language] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return Object.entries(counts)
    .map(([name, count]) => ({
      name,
      count,
      percentage: Math.round((count / total) * 100),
      color: getLanguageColor(name),
    }))
    .sort((a, b) => b.count - a.count);
}

// Lazy import of getLanguageColor to avoid circular dependency
import { getLanguageColor } from '@/hooks/useGithubRepos';
