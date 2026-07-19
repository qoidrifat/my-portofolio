import { useState, useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Github, Star, GitFork, ExternalLink, Users, BookOpen,
  AlertCircle, RefreshCw,
} from 'lucide-react';
import { useGithubProfile, useGithubRepos, getLanguageColor } from '@/hooks/useGithubRepos';

// ── Format number ────────────────────────────────────────────────────────────
function fmt(n) {
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k';
  return n;
}

// ── Skeleton ────────────────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded-xl bg-white/[0.04] ${className}`} />;
}

// ── Stat card ────────────────────────────────────────────────────────────────
function StatCard({ icon: Icon, label, value, isLoading }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
      <Icon className="w-5 h-5 mx-auto mb-3 text-blue-400" aria-hidden="true" />
      {isLoading ? (
        <Skeleton className="h-7 w-16 mx-auto mb-1" />
      ) : (
        <div className="text-2xl font-black text-white mb-1">{value}</div>
      )}
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ── Repo card ────────────────────────────────────────────────────────────────
function RepoCard({ repo, index, isInView }) {
  const langColor = getLanguageColor(repo.language);

  return (
    <motion.a
      href={repo.htmlUrl}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.4, delay: 0.05 + index * 0.04, ease: [0.16, 1, 0.3, 1] }}
      className="block group"
    >
      <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.04] hover:border-blue-500/30 transition-all duration-300 h-full">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BookOpen className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" aria-hidden="true" />
            <h3 className="text-sm font-bold text-white truncate group-hover:text-blue-400 transition-colors">
              {repo.name}
            </h3>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-4 min-h-[2.5rem]">
          {repo.description}
        </p>

        <div className="flex items-center gap-4 text-[11px]">
          {repo.language && (
            <span className="flex items-center gap-1.5 text-zinc-400 font-medium">
              <span
                className="w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: langColor }}
              />
              {repo.language}
            </span>
          )}
          <span className="flex items-center gap-1 text-zinc-500">
            <Star className="w-3.5 h-3.5" aria-hidden="true" />
            {fmt(repo.stars)}
          </span>
          <span className="flex items-center gap-1 text-zinc-500">
            <GitFork className="w-3.5 h-3.5" aria-hidden="true" />
            {fmt(repo.forks)}
          </span>
        </div>
      </div>
    </motion.a>
  );
}

// ── Repo skeleton ────────────────────────────────────────────────────────────
function RepoSkeleton() {
  return (
    <div className="p-5 rounded-2xl border border-white/[0.06] bg-white/[0.02]">
      <div className="flex items-center gap-2.5 mb-3">
        <Skeleton className="w-4 h-4 rounded" />
        <Skeleton className="h-4 w-40" />
      </div>
      <Skeleton className="h-8 w-full mb-4" />
      <div className="flex items-center gap-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-3 w-12" />
        <Skeleton className="h-3 w-12" />
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────
export default function GitHubSection() {
  const sectionRef = useRef(null);
  const isSectionInView = useInView(sectionRef, { once: true, margin: '-80px' });
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

  const isLoading = profileLoading || reposLoading;
  const isError = profileError || reposError;
  const hasData = profile && repos && repos.length > 0;
  const displayRepos = showAll ? repos : (repos || []).slice(0, 6);

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden scroll-mt-20"
      ref={sectionRef}
    >
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_100%_100%,rgba(139,92,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* ── Header ── */}
        <div className="text-center mb-16">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2"
          >
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            Open Source
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            GitHub <span className="text-zinc-500">Activity</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            Live data from my public repositories — fetched via the GitHub API.
          </motion.p>
        </div>

        {/* ── Error state ── */}
        {isError && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-400" />
            </div>
            <p className="text-zinc-300 font-medium mb-1">Unable to load GitHub data</p>
            <p className="text-zinc-500 text-sm mb-6">Rate limit may have been exceeded. Try again later.</p>
            <button
              onClick={() => { refetchProfile(); refetchRepos(); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </motion.div>
        )}

        {/* ── Stats grid ── */}
        {!isError && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.25 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16"
          >
            <StatCard icon={Github} label="Repositories" value={profile?.publicRepos ?? '—'} isLoading={isLoading} />
            <StatCard icon={Star} label="Stars" value={repos?.reduce((s, r) => s + r.stars, 0) ?? '—'} isLoading={isLoading} />
            <StatCard icon={GitFork} label="Forks" value={repos?.reduce((s, r) => s + r.forks, 0) ?? '—'} isLoading={isLoading} />
            <StatCard icon={Users} label="Followers" value={profile?.followers ?? '—'} isLoading={isLoading} />
          </motion.div>
        )}

        {/* ── Repo grid ── */}
        {!isError && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => <RepoSkeleton key={i} />)
              : displayRepos.map((repo, i) => (
                  <RepoCard key={repo.id} repo={repo} index={i} isInView={isSectionInView} />
                ))}
          </div>
        )}

        {/* ── Empty state — API succeeded but every repo is a fork/archived ── */}
        {!isError && !isLoading && repos && repos.length === 0 && (
          <div className="text-center py-12">
            <p className="text-zinc-400 font-medium">
              No original public repositories to show right now.
            </p>
            <a
              href="https://github.com/qoidrifat"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-4 text-blue-400 hover:text-blue-300 text-sm font-bold transition-colors"
            >
              Browse everything on GitHub →
            </a>
          </div>
        )}

        {/* ── Show more / View on GitHub ── */}
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="flex flex-wrap items-center justify-center gap-4 mt-12"
          >
            {repos.length > 6 && (
              <button
                onClick={() => setShowAll(!showAll)}
                className="px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              >
                {showAll ? 'Show less' : `Show all ${repos.length} repos`}
              </button>
            )}
            <a
              href={profile?.htmlUrl || 'https://github.com/qoidrifat'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-xs font-bold text-white hover:bg-blue-500 transition-all shadow-lg shadow-blue-500/20"
            >
              <Github className="w-4 h-4" />
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </motion.div>
        )}
      </div>
    </section>
  );
}
