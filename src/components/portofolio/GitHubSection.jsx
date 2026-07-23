import { useState, useRef, useMemo, useCallback } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import {
  Github, Star, GitFork, Users, BookOpen, ExternalLink,
  FolderOpen, GitBranch, UserPlus, Activity,
  TrendingUp, Calendar, MessageSquare,
} from 'lucide-react';
import {
  useGithubProfile, useGithubRepos, useGithubPRs, useGithubIssues, useGithubEvents,
} from '@/hooks/useGithubRepos';

import ProfileCard from './github/ProfileCard';
import StatCard from './github/StatCard';
import ContributionHeatmap from './github/ContributionHeatmap';
import LanguageChart from './github/LanguageChart';
import RepoCard from './github/RepoCard';
import ContributionActivity from './github/ContributionActivity';
import DevInsights from './github/DevInsights';
import { ErrorState, EmptyState, StreakBadge } from './github/States';
import { RepoSkeleton } from './github/Skeleton';
import { fmt } from './github/utils';

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
            className="px-4 py-1.5 rounded-full bg-accent-web/10 border border-accent-web/20 text-accent-web text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-flex items-center gap-2"
          >
            <Github className="w-3.5 h-3.5" aria-hidden="true" />
            Open Source
          </motion.span>
          <motion.h2
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 } }
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-4"
          >
            GitHub <span className="text-zinc-500">Activity</span>
          </motion.h2>
          <motion.p
            initial={shouldReduceMotion ? false : { opacity: 0, y: 20 } }
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-500 text-sm md:text-base max-w-xl mx-auto"
          >
            Open Source &#183; Continuous Learning &#183; Real Development Activity
          </motion.p>
        </div>

        {/* ═══ ERROR STATE ═══ */}
        {isError && !isLoading && <ErrorState onRetry={handleRetry} />}

        {/* ═══ CONTENT ═══ */}
        {!isError && (
          <>
            {/* ── PROFILE CARD ── */}
            <div className="mb-8">
              <ProfileCard
                profile={profile}
                isLoading={isLoading}
                isInView={isSectionInView}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>

            {/* ── TOP STATISTICS ── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 } }
              animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4 mb-8"
            >
              <StatCard icon={FolderOpen} label="Repositories" value={profile?.publicRepos ?? '\u2014'} isLoading={isLoading} accent="blue" />
              <StatCard icon={Star} label="Stars Earned" value={fmt(totalStars)} isLoading={isLoading} accent="amber" />
              <StatCard icon={GitFork} label="Forks" value={fmt(totalForks)} isLoading={isLoading} accent="violet" />
              <StatCard icon={Users} label="Followers" value={fmt(profile?.followers)} isLoading={isLoading} accent="emerald" />
              <StatCard icon={GitBranch} label="Pull Requests" value={fmt(prCount)} isLoading={isLoading} accent="cyan" />
              <StatCard icon={UserPlus} label="Following" value={fmt(profile?.following)} isLoading={isLoading} accent="rose" />
            </motion.div>

            {/* ── SECONDARY STATS ── */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 10 } }
              animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8"
            >
              <StreakBadge eventsCount={pushEvents} isLoading={isLoading} />
              <StatCard icon={Activity} label="Recent Pushes" value={fmt(pushEvents)} isLoading={isLoading} accent="emerald" />
              <StatCard icon={MessageSquare} label="Issues Created" value={fmt(issueCount)} isLoading={isLoading} accent="violet" />
              <StatCard
                icon={Calendar}
                label="Account Age"
                value={profile?.createdAt ? `${Math.floor((Date.now() - new Date(profile.createdAt).getTime()) / (365.25 * 24 * 60 * 60 * 1000))}+ yrs` : '\u2014'}
                isLoading={isLoading}
                accent="blue"
              />
            </motion.div>

            {/* ── HEATMAP + LANGUAGE ── */}
            <div className="grid md:grid-cols-2 gap-4 mb-8">
              <ContributionHeatmap
                repos={repos}
                eventsCount={pushEvents}
                isLoading={isLoading}
                isInView={isSectionInView}
                shouldReduceMotion={shouldReduceMotion}
              />
              <LanguageChart
                repos={repos}
                isLoading={isLoading}
                isInView={isSectionInView}
                shouldReduceMotion={shouldReduceMotion}
              />
            </div>

            {/* ── RECENT PROJECTS + ACTIVITY ── */}
            <div className="grid lg:grid-cols-3 gap-6 mb-8">
              <div className="lg:col-span-2">
                <motion.div
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 10 } }
                  animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.5, delay: 0.3 }}
                  className="flex items-center justify-between mb-6"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-accent-web/10 border border-accent-web/20 flex items-center justify-center">
                      <BookOpen className="w-4 h-4 text-accent-web" aria-hidden="true" />
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
            <div className="mb-8">
              <motion.div
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 } }
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
                initial={shouldReduceMotion ? false : { opacity: 0, y: 10 } }
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
                  className="group inline-flex items-center gap-3 px-8 py-4 bg-accent-web/10 border border-accent-web/20 rounded-2xl hover:bg-accent-web/20 hover:border-accent-web/40 transition-all duration-300 shadow-lg shadow-accent-web/5"
                >
                  <Github className="w-5 h-5 text-accent-web" aria-hidden="true" />
                  <div className="text-left">
                    <p className="text-sm font-bold text-accent-web">
                      View Full GitHub Profile
                    </p>
                    <p className="text-[10px] text-accent-web/60 font-medium">
                      Explore all open source projects and contributions
                    </p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-accent-web/60 group-hover:text-accent-web transition-colors duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" aria-hidden="true" />
                </motion.a>
              </motion.div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
