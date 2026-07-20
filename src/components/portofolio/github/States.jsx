import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { AlertCircle, RefreshCw, FolderOpen, Github, Flame } from 'lucide-react';
import { SkeletonLine } from './Skeleton';

// ── Error state ─────────────────────────────────────────────────────────────
export function ErrorState({ onRetry }) {
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
export function EmptyState() {
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

// ── Streak counter ─────────────────────────────────────────────────────────
export function StreakBadge({ eventsCount, isLoading }) {
  const streak = useMemo(() => {
    if (eventsCount == null) return '\u2014';
    if (eventsCount > 80) return '15+';
    if (eventsCount > 50) return '7+';
    if (eventsCount > 20) return '3+';
    if (eventsCount > 5) return '1+';
    return '0';
  }, [eventsCount]);

  if (isLoading) {
    return (
      <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <SkeletonLine width="24px" height="24px" className="mb-3" />
        <SkeletonLine width="60%" height="24px" className="mb-1" />
        <SkeletonLine width="80%" height="10px" />
      </div>
    );
  }

  return (
    <motion.div
      whileHover={{ y: -2 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300 h-full"
    >
      <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mb-3">
        <Flame className="w-4 h-4 text-rose-400" aria-hidden="true" />
      </div>
      <div className="text-2xl font-black text-white mb-0.5 tabular-nums tracking-tight">
        {streak}
        <span className="text-base font-bold text-zinc-500 ml-0.5">days</span>
      </div>
      <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
        Current Streak
      </span>
    </motion.div>
  );
}
