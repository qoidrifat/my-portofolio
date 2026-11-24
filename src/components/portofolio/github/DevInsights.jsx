import { useMemo } from 'react';
import { motion } from 'framer-motion';
import { Code2, Star, TrendingUp, GitBranch } from 'lucide-react';
import { SkeletonLine } from './Skeleton';
import { fmt, timeAgo } from './utils';
import { useCopy } from '@/lib/LanguageContext';

const COPY = {
  en: {
    topLanguage: 'Top Language',
    mostStarred: 'Most Starred',
    openSourceImpact: 'Open Source Impact',
    recentlyUpdated: 'Recently Updated',
  },
  id: {
    topLanguage: 'Bahasa Teratas',
    mostStarred: 'Bintang Terbanyak',
    openSourceImpact: 'Dampak Open Source',
    recentlyUpdated: 'Baru Diupt',
  },
};

export default function DevInsights({ repos, profile, isLoading, isInView, shouldReduceMotion }) {
  const t = useCopy(COPY);
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
        label: t.topLanguage,
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
        label: t.mostStarred,
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
        label: t.openSourceImpact,
        value: `${fmt(totalStars)} stars`,
        sub: `${repos.length} repos \u00b7 ${fmt(totalForks)} forks`,
        accent: 'emerald',
        progress: Math.min(100, Math.round((totalStars / (totalStars + totalForks || 1)) * 100)),
      },
      {
        icon: GitBranch,
        label: t.recentlyUpdated,
        value: recentlyUpdated ? recentlyUpdated.name : '\u2014',
        sub: recentlyUpdated ? timeAgo(recentlyUpdated.updatedAt) : '',
        accent: 'violet',
        link: recentlyUpdated?.htmlUrl,
        progress: 100,
      },
    ];
  }, [repos, profile, t]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
            <SkeletonLine width="60%" height="24px" className="mb-1" />
            <SkeletonLine width="80%" height="10px" />
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
        {insights.map((item, i) => (
          <div
            key={i}
            className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300"
          >
            <div className={`w-8 h-8 rounded-xl ${item.accentClass} flex items-center justify-center mb-3`}>
              <item.icon className="w-4 h-4" aria-hidden="true" />
            </div>
            <div>
              <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-1">{item.label}</p>
              <p className="text-sm font-bold text-white">{item.value}</p>
              {item.sub && <p className="text-[10px] text-zinc-500">{item.sub}</p>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}