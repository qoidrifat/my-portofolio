import { useQuery } from '@tanstack/react-query';

const GITHUB_USERNAME = 'qoidrifat';

// ── GitHub API auth ──────────────────────────────────────────────────────
// Uses VITE_GITHUB_TOKEN env var to authenticate and avoid rate limiting (60 req/hr unauthenticated vs 5000 req/hr authenticated).
// Create a classic Personal Access Token at https://github.com/settings/tokens with no scopes needed (public data only).
function getAuthHeaders() {
  const token = import.meta.env.VITE_GITHUB_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

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
  const res = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`, {
    headers: getAuthHeaders(),
  });
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
  };
}

// ── Fetch repos ─────────────────────────────────────────────────────────────
async function fetchRepos() {
  const res = await fetch(
    `https://api.github.com/users/${GITHUB_USERNAME}/repos?sort=updated&per_page=20&type=public`,
    { headers: getAuthHeaders() }
  );
  if (!res.ok) throw new Error('Failed to fetch GitHub repos');
  const data = await res.json();
  return data
    .filter(repo => !repo.fork && !repo.archived)
    .map(repo => ({
      id: repo.id,
      name: repo.name,
      description: repo.description || 'No description provided.',
      language: repo.language,
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      htmlUrl: repo.html_url,
      updatedAt: repo.updated_at,
      topics: repo.topics || [],
    }));
}

// ── Hook ────────────────────────────────────────────────────────────────────
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
