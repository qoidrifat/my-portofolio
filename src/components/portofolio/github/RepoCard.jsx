import { motion } from 'framer-motion';
import { BookOpen, Star, GitFork, ExternalLink, Clock } from 'lucide-react';
import { LangDot, TopicBadge } from './badges';
import { fmt, timeAgo } from './utils';

export default function RepoCard({ repo, index, isInView, shouldReduceMotion }) {
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
          <ExternalLink className="w-3.5 h-3.5 text-zinc-600 shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300" aria-hidden="true" />
        </div>

        <p className="text-sm text-zinc-400 leading-relaxed line-clamp-2 mb-3 min-h-[2.2rem]">
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
        <div className="flex items-center gap-4 text-xs">
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
