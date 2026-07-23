import { motion } from 'framer-motion';
import { SkeletonLine } from './Skeleton';

const ACCENT_COLORS = {
  blue: 'text-accent-web bg-accent-web/10 border-accent-web/20',
  emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  violet: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  cyan: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
};

export default function StatCard({ icon: Icon, label, value, accent = 'blue', isLoading, href }) {
  const accentClass = ACCENT_COLORS[accent] || ACCENT_COLORS.blue;

  const content = (
    <motion.div
      whileHover={{ y: -3 }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] hover:bg-white/[0.03] transition-all duration-300 h-full"
    >
      <div className={`w-9 h-9 rounded-xl ${accentClass} flex items-center justify-center mb-3`}>
        <Icon className="w-4 h-4" aria-hidden="true" />
      </div>
      {isLoading ? (
        <>
          <SkeletonLine width="60%" height="24px" className="mb-1" />
          <SkeletonLine width="80%" height="10px" />
        </>
      ) : (
        <>
          <div className="text-2xl font-black text-white mb-0.5 tabular-nums tracking-tight">
            {value}
          </div>
          <span className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
            {label}
          </span>
        </>
      )}
    </motion.div>
  );

  if (href) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className="block group outline-none">
        {content}
      </a>
    );
  }

  return content;
}
