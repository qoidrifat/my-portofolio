import { useState, useRef } from 'react';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  GraduationCap, Code, Brain, FlaskConical, Rocket, Target, Wallet,
  ChevronDown, Calendar,
} from 'lucide-react';
import { journey } from '@/lib/data';

// ── Icon lookup ─────────────────────────────────────────────────────────────
const iconMap = {
  GraduationCap, Code, Brain, FlaskConical, Rocket, Target, Wallet,
};

// ── Static Tailwind class maps (avoids JIT dead-class problem) ──────────────
const badgeStyles = {
  blue:    'bg-blue-500/10 border-blue-500/20 text-blue-400',
  emerald: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
  purple:  'bg-purple-500/10 border-purple-500/20 text-purple-400',
  amber:   'bg-amber-500/10 border-amber-500/20 text-amber-400',
};

const expandedCardStyles = {
  blue:    'border-blue-500/30 bg-blue-500/5',
  emerald: 'border-emerald-500/30 bg-emerald-500/5',
  purple:  'border-purple-500/30 bg-purple-500/5',
  amber:   'border-amber-500/30 bg-amber-500/5',
};

const nodeBorderStyles = {
  blue:    'border-blue-500/40',
  emerald: 'border-emerald-500/40',
  purple:  'border-purple-500/40',
  amber:   'border-amber-500/40',
};

const shadowGlowStyles = {
  blue:    'shadow-blue-500/30',
  emerald: 'shadow-emerald-500/30',
  purple:  'shadow-purple-500/30',
  amber:   'shadow-amber-500/30',
};

const legendDotStyles = {
  blue:    'bg-blue-500/10 border-blue-500/30',
  emerald: 'bg-emerald-500/10 border-emerald-500/30',
  purple:  'bg-purple-500/10 border-purple-500/30',
  amber:   'bg-amber-500/10 border-amber-500/30',
};

const nodeBgStyles = {
  blue:    'bg-blue-500',
  emerald: 'bg-emerald-500',
  purple:  'bg-purple-500',
  amber:   'bg-amber-500',
};

// ── Category config ─────────────────────────────────────────────────────────
const categoryConfig = {
  education: { label: 'Education', color: 'blue' },
  project:   { label: 'Project',   color: 'emerald' },
  milestone: { label: 'Milestone', color: 'purple' },
  career:    { label: 'Career',    color: 'amber' },
};

// ── Single timeline entry ───────────────────────────────────────────────────
function TimelineCard({ item, isLeft, isExpanded, onToggle }) {
  const Icon = iconMap[item.icon] || Rocket;
  const cat = categoryConfig[item.category] || categoryConfig.milestone;
  const colorKey = cat.color;

  // Each card observes itself for staggered scroll-trigger
  const cardRef = useRef(null);
  const isCardInView = useInView(cardRef, { once: true, margin: '-80px' });

  return (
    <div
      ref={cardRef}
      className={`relative flex items-start gap-6 md:gap-10 ${isLeft ? 'md:flex-row' : 'md:flex-row-reverse'}`}
    >
      {/* ── Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.95 }}
        animate={isCardInView ? { opacity: 1, y: 0, scale: 1 } : {}}
        transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className={`w-full md:w-[calc(50%-2.5rem)] group`}
      >
        <button
          onClick={() => onToggle(item.year + item.title)}
          className={`w-full text-left rounded-2xl border transition-all duration-300 overflow-hidden ${
            isExpanded
              ? expandedCardStyles[colorKey] || expandedCardStyles.blue
              : 'border-white/[0.06] bg-white/[0.02] hover:border-white/[0.15] hover:bg-white/[0.04]'
          }`}
        >
          {/* Header */}
          <div className="p-5 md:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Year badge */}
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg ${badgeStyles[colorKey] || badgeStyles.blue} text-[10px] font-bold uppercase tracking-wider mb-3`}>
                  <Calendar className="w-3 h-3" aria-hidden="true" />
                  {item.year}
                </span>

                {/* Category badge */}
                <span className={`ml-2 inline-flex px-2 py-1 rounded-md bg-white/[0.04] border border-white/[0.06] text-[9px] font-medium text-zinc-500 uppercase tracking-wider`}>
                  {cat.label}
                </span>

                <h3 className="text-base md:text-lg font-bold text-white mt-2 leading-snug">
                  {item.title}
                </h3>
                <p className="text-sm text-zinc-400 mt-2 leading-relaxed line-clamp-2">
                  {item.description}
                </p>
              </div>

              {/* Expand icon */}
              <div className={`shrink-0 mt-1 w-8 h-8 rounded-full border border-white/[0.08] flex items-center justify-center transition-all duration-300 ${
                isExpanded ? 'rotate-180 border-blue-500/30 bg-blue-500/10' : ''
              }`}>
                <ChevronDown className={`w-4 h-4 ${isExpanded ? 'text-blue-400' : 'text-zinc-500'}`} aria-hidden="true" />
              </div>
            </div>

            {/* Expandable details */}
            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="overflow-hidden"
                >
                  <div className="pt-4 mt-4 border-t border-white/[0.06] space-y-4">
                    {item.details && (
                      <p className="text-sm text-zinc-400 leading-relaxed">{item.details}</p>
                    )}

                    {item.technologies && item.technologies.length > 0 && (
                      <div>
                        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider block mb-2">
                          Technologies & Skills
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.technologies.map((tech) => (
                            <span
                              key={tech}
                              className="px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/[0.06] text-[10px] font-medium text-zinc-400"
                            >
                              {tech}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </button>
      </motion.div>

      {/* ── Timeline Node (hidden on mobile, visible on md+) ── */}
      <div className="hidden md:flex absolute left-1/2 -translate-x-1/2 top-6 z-10">
        <div
          className={`w-12 h-12 rounded-full ${nodeBgStyles[colorKey] || nodeBgStyles.blue} border-4 ${nodeBorderStyles[colorKey] || nodeBorderStyles.blue} flex items-center justify-center shadow-xl ${shadowGlowStyles[colorKey] || shadowGlowStyles.blue} hover:scale-110 transition-transform duration-300`}
        >
          <Icon className="w-5 h-5 text-white" aria-hidden="true" />
        </div>
      </div>

      {/* ── Mobile Node (inline, md:hidden) ── */}
      <div className="md:hidden shrink-0 relative z-10">
        <div className={`w-10 h-10 rounded-full ${nodeBgStyles[colorKey] || nodeBgStyles.blue} border-4 ${nodeBorderStyles[colorKey] || nodeBorderStyles.blue} flex items-center justify-center shadow-lg ${shadowGlowStyles[colorKey] || shadowGlowStyles.blue}`}>
          <Icon className="w-4 h-4 text-white" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}

// ── Section ─────────────────────────────────────────────────────────────────
export default function CareerTimelineSection() {
  const [expandedItems, setExpandedItems] = useState(new Set());
  const sectionRef = useRef(null);
  const isSectionInView = useInView(sectionRef, { once: true, margin: '-100px' });

  const toggleExpand = (key) => {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <section
      className="py-24 md:py-32 relative overflow-hidden scroll-mt-20"
      ref={sectionRef}
    >
      {/* Background gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.04),transparent_70%)] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[radial-gradient(circle_at_100%_100%,rgba(59,130,246,0.04),transparent_70%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
        {/* ── Section Header ── */}
        <div className="text-center mb-20">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-[10px] font-bold uppercase tracking-[0.2em] mb-4 inline-block"
          >
            Timeline
          </motion.span>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-4xl md:text-6xl font-black text-white mb-6"
          >
            Career <span className="text-zinc-500">Journey</span>
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-zinc-400 max-w-2xl mx-auto text-lg"
          >
            From first lines of code to AI research — tracing the path that shaped my craft.
          </motion.p>
        </div>

        {/* ── Timeline ── */}
        <div className="relative max-w-5xl mx-auto">
          {/* Animated vertical line (desktop) */}
          <div className="hidden md:block absolute left-1/2 -translate-x-px top-0 bottom-0 w-0.5 z-0">
            <div className="absolute inset-0 bg-white/[0.04] rounded-full" />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isSectionInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 left-0 w-full origin-top bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500 rounded-full"
              style={{ height: '100%' }}
            />
          </div>

          {/* Animated vertical line (mobile) */}
          <div className="md:hidden absolute left-5 top-0 bottom-0 w-0.5 z-0">
            <div className="absolute inset-0 bg-white/[0.04] rounded-full" />
            <motion.div
              initial={{ scaleY: 0 }}
              animate={isSectionInView ? { scaleY: 1 } : {}}
              transition={{ duration: 1.2, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-0 left-0 w-full origin-top bg-gradient-to-b from-purple-500 via-blue-500 to-emerald-500 rounded-full"
              style={{ height: '100%' }}
            />
          </div>

          {/* Timeline entries */}
          <div className="relative z-10 space-y-12 md:space-y-16">
            {journey.map((item, index) => (
              <TimelineCard
                key={item.year + item.title}
                item={item}
                index={index}
                isLeft={index % 2 === 0}
                isExpanded={expandedItems.has(item.year + item.title)}
                onToggle={toggleExpand}
              />
            ))}
          </div>
        </div>

        {/* ── Legend ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isSectionInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.8 }}
          className="flex flex-wrap items-center justify-center gap-4 mt-16"
        >
          {Object.entries(categoryConfig).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.02] border border-white/[0.06] rounded-xl">
              <span className={`w-2.5 h-2.5 rounded-full ${legendDotStyles[cfg.color]} border`} />
              <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{cfg.label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
