import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Activity, ExternalLink } from 'lucide-react';
import { LangDot } from './badges';
import { SkeletonLine } from './Skeleton';
import { timeAgo } from './utils';

export default function ContributionActivity({ repos, isLoading, isInView, shouldReduceMotion }) {
  const recentActivity = useMemo(() => {
    if (!repos || repos.length === 0) return [];
    return [...repos]
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .slice(0, 6);
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

  if (recentActivity.length === 0) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
    >
      <div className="flex items-center gap-2.5 mb-5">
        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Activity className="w-4 h-4 text-emerald-400" aria-hidden="true" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white">Recent Activity</h3>
          <p className="text-[10px] text-zinc-500 font-medium">Latest repository updates</p>
        </div>
      </div>

      <div className="relative">
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
              <div className="w-[22px] shrink-0 flex items-center justify-center relative z-10">
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
