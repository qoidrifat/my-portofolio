import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code2, Star, TrendingUp, GitBranch } from 'lucide-react';
import { SkeletonLine } from './Skeleton';
import { fmt, timeAgo } from './utils';

export default function DevInsights({ repos, profile, isLoading, isInView, shouldReduceMotion }) {
  const insights = useMemo(() => {
    if (!repos || repos.length === 0 || !profile) return [];

    const langCounts = {};
    repos.forEach(r => {
      if (r.language) langCounts[r.language] = (langCounts[r.language] || 0) + 1;
    });
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]);
    const mostActiveLang = sortedLangs[0];
    const totalLangRepos = sortedLangs.reduce((s, [, c]) => s + c, 0);

    const mostStarred = [...repos].sort((a, b) => b.stars - a.stars)[0];
    const top3Starred = [...repos].sort((a, b) => b.stars - a.stars).slice(0, 3);
    const recentlyUpdated = [...repos].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0];
    const totalStars = repos.reduce((s, r) => s + r.stars, 0);
    const totalForks = repos.reduce((s, r) => s + r.forks, 0);

    return [
      {
        icon: Code2,
        label: 'Top Language',
        value: mostActiveLang ? mostActiveLang[0] : '\u2014',
        sub: mostActiveLang
          ? `${Math.round((mostActiveLang[1] / totalLangRepos) * 100)}% of repos`
          : '',
        accent: 'blue',
        progress: mostActiveLang
          ? Math.round((mostActiveLang[1] / totalLangRepos) * 100)
          : 0,
      },
      {
        icon: Star,
        label: 'Most Starred',
        value: mostStarred ? mostStarred.name : '\u2014',
        sub: mostStarred ? `${fmt(mostStarred.stars)} stars` : '',
        accent: 'amber',
        link: mostStarred?.htmlUrl,
        progress: mostStarred
          ? Math.round((mostStarred.stars / (top3Starred[0]?.stars || 1)) * 100)
          : 0,
      },
      {
        icon: TrendingUp,
        label: 'Open Source Impact',
        value: `${fmt(totalStars)} stars`,
        sub: `${repos.length} repos \u00b7 ${fmt(totalForks)} forks`,
        accent: 'emerald',
        progress: Math.min(100, Math.round((totalStars / (totalStars + totalForks || 1)) * 100)),
      },
      {
        icon: GitBranch,
        label: 'Recently Updated',
        value: recentlyUpdated ? recentlyUpdated.name : '\u2014',
        sub: recentlyUpdated ? timeAgo(recentlyUpdated.updatedAt) : '',
        accent: 'violet',
        link: recentlyUpdated?.htmlUrl,
        progress: 100,
      },
    ];
  }, [repos, profile]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <SkeletonLine width="20px" height="20px" className="mb-3" />
            <SkeletonLine width="50%" height="16px" className="mb-1" />
            <SkeletonLine width="70%" height="12px" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {insights.map((item, i) => {
          const accentMap = {
            blue: 'text-accent-web bg-accent-web/10 border-accent-web/20',
            amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          };
          const accentClass = accentMap[item.accent] || accentMap.blue;

          const content = (
            <motion.div
              whileHover={{ y: -2 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="p-4 md:p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-300 h-full"
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
                <div className="text-[11px] text-zinc-500 mb-2">{item.sub}</div>
              )}

              {/* Progress bar */}
              {item.progress != null && (
                <div className="w-full h-1 rounded-full bg-white/[0.04] overflow-hidden mt-1">
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={isInView ? { scaleX: 1 } : {}}
                    transition={{ duration: 0.8, delay: 0.6 + i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                    className="h-full rounded-full origin-left"
                    style={{
                      width: `${item.progress}%`,
                      backgroundColor: item.link ? undefined : 'currentColor',
                    }}
                  />
                </div>
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
