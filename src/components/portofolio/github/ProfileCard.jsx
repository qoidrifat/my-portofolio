import { motion } from 'framer-motion';
import { ExternalLink, MapPin, Calendar, Link as LinkIcon } from 'lucide-react';
import OptimizedImage from '@/components/OptimizedImage';
import { SkeletonLine } from './Skeleton';
import { formatDate } from './utils';

export default function ProfileCard({ profile, isLoading, isInView, shouldReduceMotion }) {
  if (isLoading) {
    return (
      <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
        <div className="flex items-center gap-5">
          <SkeletonLine width="72px" height="72px" className="rounded-2xl" />
          <div className="flex-1">
            <SkeletonLine width="50%" height="20px" className="mb-2" />
            <SkeletonLine width="70%" height="14px" className="mb-1" />
            <SkeletonLine width="40%" height="12px" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) return null;

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 md:p-6 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-accent-web/20 hover:bg-white/[0.03] transition-all duration-300"
    >
      <div className="flex items-center gap-4 md:gap-5">
        {/* Avatar */}
        <a href={profile.htmlUrl} target="_blank" rel="noopener noreferrer" className="shrink-0 group">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-accent-web/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <OptimizedImage
              src={profile.avatarUrl}
              alt={profile.name || profile.login}
              className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-2xl object-cover border border-white/[0.08] relative"
            />
          </div>
        </a>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <a
            href={profile.htmlUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-2"
          >
            <h3 className="text-lg md:text-xl font-bold text-white group-hover:text-accent-web transition-colors duration-300 truncate">
              {profile.name || profile.login}
            </h3>
            <ExternalLink className="w-3.5 h-3.5 text-zinc-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shrink-0" aria-hidden="true" />
          </a>

          {profile.bio && (
            <p className="text-xs md:text-sm text-zinc-400 mt-0.5 line-clamp-1 leading-relaxed">
              {profile.bio}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px] text-zinc-500">
            {profile.location && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" aria-hidden="true" />
                {profile.location}
              </span>
            )}
            {profile.createdAt && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                Joined {formatDate(profile.createdAt)}
              </span>
            )}
            <span className="flex items-center gap-1">
              <LinkIcon className="w-3 h-3" aria-hidden="true" />
              <span className="lowercase">@{profile.login}</span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
