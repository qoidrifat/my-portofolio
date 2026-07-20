import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Github, Star, GitFork, Users, ExternalLink, BookOpen,
  AlertCircle, RefreshCw, Code2, Clock, Activity,
  TrendingUp, FolderOpen, GitBranch, Eye, MessageSquare,
} from 'lucide-react';
import {
  useGithubProfile, useGithubRepos, useGithubPRs, useGithubIssues, useGithubEvents,
  getLanguageColor,
} from '@/hooks/useGithubRepos';

// ── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  if (n == null) return '—';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

function timeAgo(dateStr) {
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

// ── Skeleton components ─────────────────────────────────────────────────────
function SkeletonLine({ width = '100%', height = '14px', className = '' }) {
  return (
    <div
      className={`animate-pulse rounded-md bg-white/[0.04] ${className}`}
      style={{ width, height }}
    />
  );
}

function StatSkeleton() {
  return (
    <>
      <SkeletonLine width="24px" height="24px" className="mb-4" />
      <SkeletonLine width="60%" height="28px" className="mb-2" />
      <SkeletonLine width="80%" height="12px" />
    </>
  );
}

function RepoSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2.5 mb-3">
        <SkeletonLine width="16px" height="16px" />
        <SkeletonLine width="50%" height="16px" />
      </div>
      <SkeletonLine width="100%" height="32px" className="mb-4" />
      <div className="flex items-center gap-4 mb-3">
        <SkeletonLine width="60px" height="12px" />
        <SkeletonLine width="40px" height="12px" />
        <SkeletonLine width="40px" height="12px" />
      </div>
      <div className="flex gap-1.5">
        <SkeletonLine width="50px" height="20px" />
        <SkeletonLine width="60px" height="20px" />
      </div>
    </div>
  );
}

function InsightSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
      <SkeletonLine width="20px" height="20px" className="mb-3" />
      <SkeletonLine width="50%" height="16px" className="mb-1" />
      <SkeletonLine width="70%" height="12px" />
    </div>
  );
}

// ── Stat Card ───────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, trend, isLoading, accent = 'blue' }) {
  const accentColors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  };
  const accentClass = accentColors[accent] || accentColors.blue;

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300"
    >
      <div className={`w-10 h-10 rounded-xl ${accentClass} flex items-center justify-center mb-4`}>
        <Icon className="w-5 h-5" aria-hidden="true" />
      </div>
      {isLoading ? (
        <StatSkeleton />
      ) : (
        <>
          <div className="text-3xl font-black text-white mb-1 tabular-nums tracking-tight">
            {value}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
              {label}
            </span>
            {trend != null && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400">
                <TrendingUp className="w-3 h-3" aria-hidden="true" />
                {trend}
              </span>
            )}
          </div>
        </>
      )}
    </motion.div>
  );
}

// ── Language dot ────────────────────────────────────────────────────────────
function LangDot({ language }) {
  const color = getLanguageColor(language);
  return (
    <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
      <span className="text-xs">{language}</span>
    </span>
  );
}

// ── Topic badge ─────────────────────────────────────────────────────────────
function TopicBadge({ topic }) {
  return (
    <span className="px-2 py-0.5 rounded-md bg-blue-500/8 border border-blue-500/12 text-[9px] font-medium text-blue-400/70 whitespace-nowrap">
      {topic}
    </span>
  );
}

// ── Repo card ──────────────────────────────────────────────────────────────
function RepoCard({ repo, index, isInView, shouldReduceMotion }) {
  const langColor = getLanguageColor(repo.language);

  return (
    <motion.a
      href={repo.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="block group outline-none"
    >
      <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 h-full relative overflow-hidden group-focus-visible:ring-2 group-focus-visible:ring-blue-400/50">
        {/* Hover accent bar */}
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500/0 via-blue-500/0 to-blue-500/0 group-hover:via-blue-500/40 group-hover:to-transparent transition-all duration-500" />

        <div className="flex items-start justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-blue-400/60 shrink-0 mt-0.5 transition-colors duration-300 group-hover:text-blue-400" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white truncate transition-colors duration-300 group-hover:text-blue-400">
              {repo.name}
            </h3>
          </div>
          <motion.div
            initial={{ opacity: 0, x: -4 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
          </motion.div>
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-3 min-h-[2rem]">
          {repo.description}
        </p>

        {/* Topics */}
        {repo.topics && repo.topics.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {repo.topics.slice(0, 3).map(topic => (
              <TopicBadge key={topic} topic={topic} />
            ))}
            {repo.topics.length > 3 && (
              <span className="text-[9px] font-medium text-zinc-600">
                +{repo.topics.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Metadata row */}
        <div className="flex items-center gap-4 text-[11px]">
          {repo.language && <LangDot language={repo.language} />}
          <span className="flex items-center gap-1 text-zinc-500">
            <Star className="w-3.5 h-3.5" aria-hidden="true" />
            {fmt(repo.stars)}
          </span>
          <span className="flex items-center gap-1 text-zinc-500">
            <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
            {fmt(repo.forks)}
          </span>
          <span className="flex items-center gap-1 text-zinc-600 ml-auto">
            <Clock className="w-3 h-3" aria-hidden="true" />
            <span className="text-[10px]">{timeAgo(repo.updatedAt)}</span>
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ── Contribution activity card ─────────────────────────────────────────────
function ContributionActivity({ repos, isLoading, isInView, shouldReduceMotion }) {
  // Build a timeline from recent repo updates
  const recentActivity = useMemo(() => {
    if (!repos || repos.length === 0) return [];
    return [...repos]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 8);
  }, [repos]);

  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <SkeletonLine width="160px" height="18px" className="mb-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-start gap-3 mb-4">
            <SkeletonLine width="8px" height="8px" className="rounded-full mt-1.5" />
            <div className="flex-1">
              <SkeletonLine width="60%" height="14px" className="mb-1" />
              <SkeletonLine width="40%" height="10px" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
      className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
    >
      <div className="flex items-center gap-2.5 mb-6">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          <p className="text-[10px] text-zinc-500 font-medium">Latest repository updates</p>
        </div>
      </div>

      <div className="relative">
        {/* Vertical timeline line */}
        <div className="absolute left-[11px] top-2 bottom-0 w-px bg-white/[0.06]" />

        <div className="space-y-0">
          {recentActivity.map((repo, i) => (
            <motion.a
              key={repo.id}
              href={repo.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              initial={shouldReduceMotion ? false : { opacity: 0, x: -10 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.35, delay: 0.4 + i * 0.06, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3 py-2.5 group relative hover:bg-white/[0.02] rounded-lg px-2 -mx-2 transition-colors duration-200"
            >
              {/* Timeline dot */}
              <div className={`w-[22px] shrink-0 flex items-center justify-center relative z-10`}>
                <div className={`w-2 h-2 rounded-full border-2 transition-colors duration-300 ${
                  i === 0
                    ? 'bg-emerald-400 border-emerald-400/40'
                    : 'bg-zinc-700 border-zinc-600/40 group-hover:bg-zinc-600'
                }`} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-zinc-200 group-hover:text-blue-400 transition-colors truncate">
                    {repo.name}
                  </span>
                  {i === 0 && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[8px] font-semibold text-emerald-400 uppercase tracking-wider">
                      Latest
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  {repo.language && <LangDot language={repo.language} />}
                  <span className="text-[10px] text-zinc-600">{timeAgo(repo.updatedAt)}</span>
                </div>
              </div>
              <ExternalLink className="w-3 h-3 text-zinc-700 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
            </motion.a>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

// ── Development Insights ────────────────────────────────────────────────────
function DevInsights({ repos, profile, isLoading, isInView, shouldReduceMotion }) {
  const insights = useMemo(() => {
    if (!repos || repos.length === 0 || !profile) return [];

    const langCounts = {};
    repos.forEach(r => {
      if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    });
    const mostActiveLang = Object.entries(langCounts).sort((a, b) => b[1] - a[1])[0];

    const mostStarred = [...repos].sort((a, b) => b.stars - a.stars)[0];
    const recentlyUpdated = [...repos].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const totalStars = repos.reduce((s, r) => s + r.stars, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks, 0);

    return [
      {
        icon: Code2,
        label: 'Most Active Language',
        value: mostActiveLang ? mostActiveLang[0] : '—',
        sub: mostActiveLang ? `${mostActiveLang[1]} repositories` : '',
        accent: 'blue',
      },
      {
        icon: Star,
        label: 'Most Starred Repository',
        value: mostStarred ? mostStarred.name : '—',
        sub: mostStarred ? `${fmt(mostStarred.stars)} stars` : '',
        accent: 'amber',
        link: mostStarred?.htmlUrl,
      },
      {
        icon: TrendingUp,
        label: 'Total Open Source Impact',
        value: `${fmt(totalStars)} stars`,
        sub: `${repos.length} repos · ${fmt(totalForks)} forks`,
        accent: 'emerald',
      },
      {
        icon: GitBranch,
        label: 'Recently Updated',
        value: recentlyUpdated ? recentlyUpdated.name : '—',
        sub: recentlyUpdated ? timeAgo(recentlyUpdated.updatedAt) : '',
        accent: 'violet',
        link: recentlyUpdated?.htmlUrl,
      },
    ];
  }, [repos, profile]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <InsightSkeleton key={i} />)}
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-2 gap-4">
        {insights.map((item, i) => {
          const accentMap = {
            blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
            amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          };
          const accentClass = accentMap[item.accent] || accentMap.blue;

          const content = (
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 h-full"
            >
              <div className={`w-9 h-9 rounded-xl ${accentClass} flex items-center justify-center mb-3`}>
                <item.icon className="w-4 h-4" aria-hidden="true" />
              </div>
              <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider mb-1">
                {item.label}
              </div>
              <div className="text-sm font-bold text-white truncate mb-0.5">
                {item.value}
              </div>
              {item.sub && (
                <div className="text-[11px] text-zinc-500">{item.sub}</div>
              )}
            </motion.div>
          );

          if (item.link) {
            return (
              <a key={i} href={item.link} target="_blank" rel="noopener noreferrer" className="block group outline-none">
                {content}
              </a>
            );
          }
          return <div key={i}>{content}</div>;
        })}
      </div>
    </motion.div>
  );
}

// ── Error state ─────────────────────────────────────────────────────────────
function ErrorState({ onRetry }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-center py-20"
    >
      <div className="w-16 h-16 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center mx-auto mb-5">
        <AlertCircle className="w-6 h-6 text-red-400" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">Unable to load GitHub data</h3>
      <p className="text-zinc-500 text-sm max-w-md mx-auto mb-8 leading-relaxed">
        The GitHub API rate limit may have been exceeded. Data will be available again shortly.
      </p>
      <motion.button
        onClick={onRetry}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="inline-flex items-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-sm font-semibold text-zinc-300 hover:text-white hover:bg-white/10 hover:border-white/20 transition-all duration-300"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" />
        Retry
      </motion.button>
    </motion.div>
  );
}

// ── Empty state ─────────────────────────────────────────────────────────────
function EmptyState() {
  return (
    <div className="text-center py-16">
      <div className="w-16 h-16 rounded-2xl bg-zinc-800/50 border border-zinc-700/50 flex items-center justify-center mx-auto mb-5">
        <FolderOpen className="w-6 h-6 text-zinc-500" aria-hidden="true" />
      </div>
      <h3 className="text-lg font-bold text-white mb-2">No repositories to show</h3>
      <p className="text-zinc-500 text-sm max-w-md mx-auto mb-6 leading-relaxed">
        No original public repositories are currently available. Check back later for new projects.
      </p>
      <a
        href="https://github.com/qoidrifat"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/20"
      >
        <Github className="w-4 h-4" aria-hidden="true" />
        Browse on GitHub
      </a>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────
export default function GitHubSection() {
  const sectionRef = useRef(null);
  const isSectionInView = useInView(sectionRef, { once: true, margin: '-80px' });
  const shouldReduceMotion = useReducedMotion();
  const [showAll, setShowAll] = useState(false);

  const {
    data: profile,
    isLoading: profileLoading,
    isError: profileError,
    refetch: refetchProfile,
  } = useGithubProfile();

  const {
    data: repos,
    isLoading: reposLoading,
    isError: reposError,
    refetch: refetchRepos,
  } = useGithubRepos();

  const {
    data: prCount,
    isLoading: prLoading,
    isError: prError,
    refetch: refetchPRs,
  } = useGithubPRs();

  const {
    data: issueCount,
    isLoading: issueLoading,
    isError: issueError,
    refetch: refetchIssues,
  } = useGithubIssues();

  const {
    data: pushEvents,
    isLoading: eventsLoading,
    isError: eventsError,
    refetch: refetchEvents,
  } = useGithubEvents();

  const isLoading = profileLoading || reposLoading || prLoading || issueLoading || eventsLoading;
  const isError = profileError || reposError || prError || issueError || eventsError;
  const hasData = profile && repos && repos.length > 0;
  const displayRepos = useMemo(() => {
    if (!repos) return [];
    return showAll ? repos : repos.slice(0, 6);
  }, [repos, showAll]);

  const handleRetry = useCallback(() => {
    refetchProfile();
    refetchRepos();
    refetchPRs();
    refetchIssues();
    refetchEvents();
  }, [refetchProfile, refetchRepos, refetchPRs, refetchIssues, refetchEvents]);

  const totalStars = useMemo(() => repos?.reduce((s, r) => s + r.stars, 0) ?? 0, [repos]);
  const totalForks = useMemo(() => repos?.reduce((s, r) => s + r.forks, 0) ?? 0, [repos]);

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden scroll-mt-20"
      ref={sectionRef}
      aria-label="GitHub Activity Dashboard"
    >
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* ═══ HEADER ═══ */}
        <div className="text-center mb-16">
          <motion.span
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2"
          >
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            Open Source
          </motion.span>
          <motion.h2
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-4"
          >
            GitHub <span className="text-zinc-500">Activity</span>
          </motion.h2>
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto"
          >
            Open Source · Continuous Learning · Real Development Activity
          </motion.p>
        </div>

        {/* ═══ ERROR STATE ═══ */}
        {isError && !isLoading && <ErrorState onRetry={handleRetry} />}

        {/* ═══ CONTENT ═══ */}
        {!isError && (
          <>
            {/* ── TOP STATISTICS ── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
              animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4 mb-16"
            >
              <StatCard
                icon={FolderOpen}
                label="Repositories"
                value={profile?.publicRepos ?? '—'}
                isLoading={isLoading}
                accent="blue"
              />
              <StatCard
                icon={Star}
                label="Stars Earned"
                value={fmt(totalStars)}
                isLoading={isLoading}
                accent="amber"
              />
              <StatCard
                icon={GitFork}
                label="Forks"
                value={fmt(totalForks)}
                isLoading={isLoading}
                accent="violet"
              />
              <StatCard
                icon={Users}
                label="Followers"
                value={fmt(profile?.followers)}
                isLoading={isLoading}
                accent="emerald"
              />
              <StatCard
                icon={GitBranch}
                label="Pull Requests"
                value={fmt(prCount)}
                isLoading={isLoading}
                accent="blue"
              />
              <StatCard
                icon={Activity}
                label="Recent Pushes"
                value={fmt(pushEvents)}
                isLoading={isLoading}
                accent="amber"
              />
              <StatCard
                icon={MessageSquare}
                label="Issues Created"
                value={fmt(issueCount)}
                isLoading={isLoading}
                accent="violet"
              />
              <StatCard
                icon={Eye}
                label="Following"
                value={fmt(profile?.following)}
                isLoading={isLoading}
                accent="emerald"
              />
            </motion.div>

            {/* ── RECENT PROJECTS + ACTIVITY ── */}
            <div className="grid lg:grid-cols-3 gap-6 mb-16">
              {/* Repos column */}
              <div className="lg:col-span-2">
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                  animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-blue-400" aria-hidden="true" />
                    </div>
                    <h3 className="text-sm font-bold text-white">Recent Projects</h3>
                  </div>
                  {repos && repos.length > 6 && (
                    <button
                      onClick={() => setShowAll(!showAll)}
                      className="text-[11px] font-semibold text-zinc-500 hover:text-zinc-200 transition-colors duration-200"
                    >
                      {showAll ? 'Show less' : `View all ${repos.length}`}
                    </button>
                  )}
                </motion.div>

                {isLoading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <RepoSkeleton key={i} />)}
                  </div>
                ) : hasData ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {displayRepos.map((repo, i) => (
                      <RepoCard
                        key={repo.id}
                        repo={repo}
                        index={i}
                        isInView={isSectionInView}
                        shouldReduceMotion={shouldReduceMotion}
                      />
                    ))}
                  </div>
                ) : (
                  <EmptyState />
                )}
              </div>

              {/* Activity column */}
              <div className="space-y-6">
                <ContributionActivity
                  repos={repos}
                  isLoading={isLoading}
                  isInView={isSectionInView}
                  shouldReduceMotion={shouldReduceMotion}
                />
              </div>
            </div>

            {/* ── DEVELOPMENT HIGHLIGHTS ── */}
            <div className="mb-16">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.3 }}
                className="flex items-center gap-2.5 mb-6"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-amber-400" aria-hidden="true" />
                </div>
                <h3 className="text-sm font-bold text-white">Development Highlights</h3>
              </motion.div>
              <DevInsights
                repos={repos}
                profile={profile}
                isLoading={isLoading}
                isInView={isSectionInView}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>

            {/* ── CTA ── */}
            {hasData && (
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
                animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.5, delay: 0.5 }}
                className="text-center"
              >
                <motion.a
                  href={profile?.htmlUrl || 'https://github.com/qoidrifat'}
                  target="_blank"
                  rel="noopener noreferrer"
                  whileHover={shouldReduceMotion ? undefined : { y: -2 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-blue-500/30 transition-all duration-300"
                >
                  <Github className="w-5 h-5 text-zinc-400 group-hover:text-blue-400 transition-colors duration-300" aria-hidden="true" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-white group-hover:text-blue-400 transition-colors duration-300">
                      View Full GitHub Profile
                    </p>
                    <p className="text-[10px] text-zinc-500 font-medium">
                      Explore all open source projects and contributions
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-zinc-500 group-hover:text-blue-400 transition-colors duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
                </motion.a>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
