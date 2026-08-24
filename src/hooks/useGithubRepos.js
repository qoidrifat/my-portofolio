import { useQuery } from '@tanstack/react-query';

const GITHUB_USERNAME = 'qoidrifat';

// ── GitHub API ────────────────────────────────────────────────────────────
// Uses unauthenticated requests (60 req/hr). Since react-query caches for 15
// minutes, the rate limit is sufficient for a personal portfolio.
// If rate limiting becomes an issue, proxy through a serverless function.
// NEVER embed a Personal Access Token in client-side code — Vite inlines
// all VITE_ prefixed variables into the public bundle.

// ── Language color map ──────────────────────────────────────────────────────
const LANGUAGE_COLORS = {
  JavaScript:  '#f1e05a',
  TypeScript:  '#3178c6',
  Python:      '#3572A5',
  HTML:        '#e34c26',
  CSS:         '#563d7c',
  PHP:         '#4F5D95',
  Java:        '#b07219',
  Kotlin:      '#A97BFF',
  'C++':       '#f34b7d',
  C:           '#555555',
  'C#':        '#178600',
  Go:          '#00ADD8',
  Rust:        '#dea584',
  Swift:       '#F05138',
  Ruby:        '#701516',
  Dart:        '#00B4AB',
  Shell:       '#89e051',
  'Jupyter Notebook': '#DA5B0B',
  Vue:         '#41b883',
  SCSS:        '#c6538c',
  Less:        '#1d365d',
  Dockerfile:  '#384d54',
};

export function getLanguageColor(lang) {
  return LANGUAGE_COLORS[lang] || '#8b8b8b';
}

// ── Fetch profile ───────────────────────────────────────────────────────────
async function fetchProfile() {
  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
  if (!res.ok) throw new Error('Failed to fetch GitHub profile');
  const data = await res.json();
  return {
    login: data.login,
    name: data.name,
    avatarUrl: data.avatar_url,
    bio: data.bio,
    publicRepos: data.public_repos,
    followers: data.followers,
    following: data.following,
    htmlUrl: data.html_url,
    location: data.location,
    createdAt: data.created_at,
  };
}

// ── Curated descriptions ─────────────────────────────────────────────────────
// Some repos ship without a GitHub description field — provide a first-party
// fallback so cards stay informative instead of falling back to a placeholder.
const CURATED_DESCRIPTIONS = {
  'superfood-ofd-scraper':
    'Enterprise data acquisition platform for Indonesian online food delivery — four-tier scraping strategy, merchant portal integration, FastAPI + Celery + Svelte dashboard.',
  'payrollpro':
    'Modern HR, attendance & payroll management system for Indonesian companies — Laravel 12 + Vue 3 + Inertia.js, QR & mobile attendance, BPJS/PPh 21 tax engine, payslip PDFs, self-service portal.',
  'explore-bali':
    'PHP-native Bali travel & tour booking platform — 6 destinations with detail galleries, flight/hotel/bus/car search flows, tiket.com booking deep-links, and a 14-table MySQL schema. Zero framework, shared-hosting ready.',
};

// ── Fetch repos ─────────────────────────────────────────────────────────────
async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=20&type=public`
  );
  if (!res.ok) throw new Error('Failed to fetch GitHub repos');
  const data = await res.json();
  return data
    .filter(repo => !repo.fork && !repo.archived)
    .map(repo => ({
      id: repo.id,
      name: repo.name,
      description:
        CURATED_DESCRIPTIONS[repo.name] ||
        repo.description ||
        'No description provided.',
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      htmlUrl: repo.html_url,
      updatedAt: repo.updated_at,
      topics: repo.topics || [],
    }));
}

// ── Search API helper ────────────────────────────────────────────────────────
async function fetchSearchCount(query) {
  const res = await fetch(
    `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=1`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  return data.total_count ?? 0;
}

// ── Fetch PR count ──────────────────────────────────────────────────────────
async function fetchPRs() {
  return fetchSearchCount(`author:${GITHUB_USERNAME}+type:pr`);
}

// ── Fetch issue count ───────────────────────────────────────────────────────
async function fetchIssues() {
  return fetchSearchCount(`author:${GITHUB_USERNAME}+type:issue`);
}

// ── Fetch recent push events (proxy for contributions) ───────────────────────
async function fetchEvents() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/events?per_page=100`
  );
  if (!res.ok) return 0;
  const data = await res.json();
  if (!Array.isArray(data)) return 0;
  return data.filter(e => e.type === 'PushEvent').length;
}

// ── Hooks ───────────────────────────────────────────────────────────────────
export function useGithubProfile() {
  return useQuery({
    queryKey: ['github-profile', GITHUB_USERNAME],
    queryFn: fetchProfile,
    staleTime: 1000 * 60 * 15,     // 15 min
    gcTime: 1000 * 60 * 60,        // 1 hr
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGithubRepos() {
  return useQuery({
    queryKey: ['github-repos', GITHUB_USERNAME],
    queryFn: fetchRepos,
    staleTime: 1000 * 60 * 15,    // 15 min
    gcTime: 1000 * 60 * 60,       // 1 hr
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGithubPRs() {
  return useQuery({
    queryKey: ['github-prs', GITHUB_USERNAME],
    queryFn: fetchPRs,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGithubIssues() {
  return useQuery({
    queryKey: ['github-issues', GITHUB_USERNAME],
    queryFn: fetchIssues,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 2,
    retryDelay: 1000,
  });
}

export function useGithubEvents() {
  return useQuery({
    queryKey: ['github-events', GITHUB_USERNAME],
    queryFn: fetchEvents,
    staleTime: 1000 * 60 * 15,
    gcTime: 1000 * 60 * 60,
    retry: 2,
    retryDelay: 1000,
  });
}
