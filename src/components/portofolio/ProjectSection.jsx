import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, Github, ArrowUpRight, Star, Code2, BookOpen,
  Search, X as XIcon, Eye, Sparkles,
} from 'lucide-react';
import { projects } from '@/lib/data';
import ProjectModal from './ProjectModal';
import ProjectVisual from './ProjectVisual';
import { useTiltEffect } from '@/hooks/useTiltEffect';

// ── Project Card ────────────────────────────────────────────────────────────
const ProjectCard = React.forwardRef(({ project, index, onQuickView }, ref) => {
  const hasDemo = Boolean(project.demoUrl && project.demoUrl !== '#');
  const hasValidSourceCode = Boolean(project.githubUrl && project.githubUrl !== '#');
  const { ref: tiltRef, handleMouseMove, handleMouseLeave } = useTiltEffect({
    maxTilt: 5,
    scale: 1.01,
    perspective: 1000,
  });

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -30, scale: 0.95 }}
      transition={{
        duration: 0.45,
        delay: index * 0.06,
        ease: [0.16, 1, 0.3, 1],
      }}
    >
      {project.isPlaceholder ? (
        /* ── Premium Coming Soon Placeholder ── */
        // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Tilt effect is a pointer-tracking visual decoration, not an interactive control. The card itself is not a button; keyboard navigation reaches its child links/buttons normally.
        <div
          ref={tiltRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          className="relative bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700/80 hover:shadow-xl hover:shadow-black/20 transition-shadow duration-500 flex flex-col group/card h-full"
          style={{ willChange: 'transform' }}
        >
          {/* Animated gradient border */}
          <div className="absolute inset-0 rounded-3xl p-[1px] pointer-events-none">
            <motion.div
              className="absolute inset-0 rounded-3xl bg-gradient-to-br from-violet-500/20 via-fuchsia-500/20 to-transparent"
              animate={{ opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
            />
          </div>

          {/* Image area — glassmorphism placeholder */}
          <div className="relative h-56 md:h-72 overflow-hidden bg-zinc-950 shrink-0">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-fuchsia-500/5 to-transparent" />
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.05, 1],
                  opacity: [0.5, 0.8, 0.5],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
                className="relative"
              >
                <div className="w-24 h-24 rounded-[2rem] bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-violet-500/20 flex items-center justify-center backdrop-blur-sm">
                  <project.icon className="w-10 h-10 text-violet-400/60" />
                </div>
                {/* Floating glow */}
                <motion.div
                  className="absolute -inset-4 rounded-[2.5rem] bg-violet-500/10 blur-xl"
                  animate={{ opacity: [0.2, 0.5, 0.2] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </motion.div>
            </div>

            {/* Dashed outline decoration */}
            <div className="absolute inset-6 border border-dashed border-violet-500/10 rounded-[2rem]" />
          </div>

          {/* Content */}
          <div className="p-5 md:p-6 flex flex-col flex-1 relative z-10">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-violet-500/10 border border-violet-500/20">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
              </div>
              <span className="text-[8px] font-medium text-zinc-500 uppercase tracking-[0.15em]">Upcoming</span>
            </div>

            <h3 className="text-base md:text-lg font-bold text-white mb-2 leading-snug tracking-tight">
              {project.title}
            </h3>

            <p className="text-xs text-zinc-500 leading-relaxed mb-5 flex-1">
              {project.longDescription}
            </p>

            {/* Subtle animated border accent */}
            <div className="pt-4 border-t border-zinc-800/50">
              <motion.div
                className="flex items-center gap-2 text-violet-400/60 text-[11px] font-semibold"
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
              >
                <motion.div
                  className="w-1.5 h-1.5 rounded-full bg-violet-400"
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                />
                <span>Currently under development</span>
              </motion.div>
            </div>
          </div>
        </div>
      ) : (
      // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Tilt effect is a pointer-tracking visual decoration, not an interactive control. The card itself is not a button; keyboard navigation reaches its child links/buttons normally.
      <div
        ref={tiltRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="relative bg-zinc-900/60 border border-zinc-800 rounded-3xl overflow-hidden hover:border-zinc-700/80 hover:shadow-xl hover:shadow-black/20 transition-shadow duration-500 flex flex-col group/card h-full"
        style={{ willChange: 'transform' }}
      >
        {project.featured && (
          <div className="absolute top-5 left-5 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-accent-web/15 border border-accent-web/25 rounded-full backdrop-blur-sm">
            <Star className="w-3 h-3 text-accent-web fill-accent-web" aria-hidden="true" />
            <span className="text-accent-web text-[9px] font-semibold uppercase tracking-wider">Featured</span>
          </div>
        )}

        {/* Image */}
        <div className="relative h-56 md:h-72 overflow-hidden bg-zinc-950 shrink-0">
          <motion.div className="w-full h-full transition-transform duration-700 group-hover/card:scale-105">
            <ProjectVisual project={project} className="w-full h-full object-cover" />
          </motion.div>
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-60" />

          {/* Floating tech badges */}
          <div className="absolute bottom-4 left-4 right-4 flex flex-wrap gap-1.5">
            {project.technologies.slice(0, 3).map(tech => (
              <span key={tech} className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-[9px] font-medium text-zinc-400 backdrop-blur-sm">
                {tech}
              </span>
            ))}
            {project.technologies.length > 3 && (
              <span className="px-2.5 py-1 bg-zinc-900/80 border border-zinc-700/50 rounded-lg text-[9px] font-medium text-zinc-400 backdrop-blur-sm">
                +{project.technologies.length - 3}
              </span>
            )}
          </div>

          {/* Quick view overlay */}
          <button
            onClick={() => onQuickView(project)}
            className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/40 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity duration-400 backdrop-blur-[2px] focus-visible:ring-2 focus-visible:ring-accent-web/50 focus-visible:outline-none"
            aria-label={`Quick view ${project.title}`}
          >
            <motion.div
              initial={false}
              whileHover={{ scale: 1.05 }}
              className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white font-bold text-sm shadow-xl"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              <span>Quick View</span>
            </motion.div>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 md:p-6 flex flex-col flex-1">
          <div className="flex items-center gap-2 mb-3">
            <div className="p-1.5 rounded-lg bg-zinc-800/80 border border-zinc-700/50">
              <project.icon className="w-3.5 h-3.5 text-zinc-300" />
            </div>
            <span className="text-[8px] font-medium text-zinc-400 uppercase tracking-[0.15em] truncate">{project.category}</span>
            {project.status && (
              <span className="ml-auto inline-flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/25 rounded-full shrink-0">
                <span className="relative flex w-1.5 h-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-400" />
                </span>
                <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400">{project.status}</span>
              </span>
            )}
          </div>

          <h3 className="text-base md:text-lg font-bold text-white mb-2 leading-snug tracking-tight line-clamp-2">
            {project.title}
          </h3>

          {project.subtitle && (
            <p className="text-[10px] font-bold text-accent-web/90 uppercase tracking-wider leading-relaxed mb-2 line-clamp-1">
              {project.subtitle}
            </p>
          )}

          <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2 mb-5 flex-1">
            {project.description
              ? project.description
              : (project.longDescription.length > 150
                  ? project.longDescription.slice(0, 150) + '...'
                  : project.longDescription)}
          </p>

          {/* Actions row */}
          <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-800/50">
            <Link
              to={`/projects/${project.slug}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition-all duration-300 group/btn"
            >
              <BookOpen className="w-3 h-3 shrink-0" aria-hidden="true" />
              <span>Study</span>
              <ArrowUpRight className="w-3 h-3 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" aria-hidden="true" />
            </Link>

            {hasDemo && (
              <motion.a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition-all duration-300"
                whileTap={{ scale: 0.97 }}
                aria-label={`${project.title} live demo`}
              >
                <ExternalLink className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Demo</span>
              </motion.a>
            )}

            {hasValidSourceCode && (
              <motion.a
                href={project.githubUrl}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800 border border-zinc-700 rounded-xl text-[11px] font-semibold text-zinc-200 hover:bg-zinc-700 hover:border-zinc-600 transition-all duration-300"
                whileTap={{ scale: 0.97 }}
                aria-label={`${project.title} source code`}
              >
                <Github className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Code</span>
              </motion.a>
            )}

            {!hasValidSourceCode && project.githubUrl && (
              <span className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-800/50 border border-zinc-800 rounded-xl text-[11px] font-semibold text-zinc-600 opacity-60 cursor-not-allowed">
                <Github className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Code</span>
              </span>
            )}
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
});

// ── Section ─────────────────────────────────────────────────────────────────
export default function ProjectSection() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState(() => searchParams.get('filter') || 'All');
  const [searchQuery, setSearchQuery] = useState(() => searchParams.get('q') || '');
  const [selectedProject, setSelectedProject] = useState(null);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Sync filter to URL
  const handleFilterChange = useCallback((newFilter) => {
    setFilter(newFilter);
    const params = new URLSearchParams(searchParams);
    if (newFilter === 'All') params.delete('filter');
    else params.set('filter', newFilter);
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // Sync search query to URL (debounced)
  const handleSearchChange = useCallback((e) => {
    const val = e.target.value;
    setSearchQuery(val);
    const params = new URLSearchParams(searchParams);
    if (val) params.set('q', val);
    else params.delete('q');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  const clearSearch = useCallback(() => {
    setSearchQuery('');
    const params = new URLSearchParams(searchParams);
    params.delete('q');
    setSearchParams(params, { replace: true });
  }, [searchParams, setSearchParams]);

  // ── Listen for 'open-project' events from CommandPalette ──
  useEffect(() => {
    const handler = (e) => setSelectedProject(e.detail);
    window.addEventListener('open-project', handler);
    return () => window.removeEventListener('open-project', handler);
  }, []);

  const categories = useMemo(() => {
    return ['All', ...new Set(projects.map(p => p.filterCategory || p.category))];
  }, []);

  const filteredProjects = useMemo(() => {
    let result = filter === 'All'
      ? projects
      : projects.filter(p => (p.filterCategory || p.category) === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.technologies.some(t => t.toLowerCase().includes(q)) ||
        p.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, searchQuery]);

  return (
    <section className="py-32 md:py-48 relative overflow-hidden scroll-mt-20" ref={ref}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[hsl(var(--accent-web))]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-purple-600/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-16">
          <div className="max-w-3xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="px-4 py-1.5 rounded-full bg-[hsl(var(--accent-web))]/10 border border-[hsl(var(--accent-web))]/20 text-[hsl(var(--accent-web))] text-[10px] font-bold uppercase tracking-[0.2em] mb-6 inline-block"
            >
              My Portfolio
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-5xl md:text-7xl font-black text-white mb-6 tracking-tight"
            >
              Selected <span className="text-zinc-500">Works</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-zinc-400 text-lg leading-relaxed max-w-2xl"
            >
              A curated collection of projects where I blend innovative design
              with cutting-edge technology to create high-impact digital solutions.
            </motion.p>
          </div>
        </div>

        {/* ── Filter bar ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 mb-12"
        >
          {/* Filter pills */}
          <div className="flex flex-wrap items-center gap-2 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.06]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange(cat)}
                className={`relative px-5 py-2.5 rounded-xl text-[10px] font-bold uppercase tracking-[0.1em] transition-all duration-300 ${
                  filter === cat
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter === cat && (
                  <motion.div
                    layoutId="projectFilter"
                    className="absolute inset-0 bg-[hsl(var(--accent-web-btn))] rounded-xl shadow-lg shadow-[hsl(var(--accent-web))]/25"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                  />
                )}
                <span className="relative z-10">{cat}</span>
              </button>
            ))}
          </div>

          {/* Search input */}
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              id="project-search"
              name="project-search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder="Search by name, tech..."
              className="w-full pl-10 pr-9 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-[hsl(var(--accent-web))]/30 focus:bg-[hsl(var(--accent-web))]/5 transition-all duration-300"
            />
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Result count */}
          {searchQuery && (
            <span className="text-[11px] font-medium text-zinc-500 whitespace-nowrap">
              {filteredProjects.length} result{filteredProjects.length !== 1 ? 's' : ''}
            </span>
          )}

          {/* Shareable URL hint */}
          {(searchQuery || filter !== 'All') && (
            <span className="text-[10px] font-medium text-zinc-600 flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-green-500/60" />
              URL is shareable
            </span>
          )}
        </motion.div>

        {/* ── Projects Grid ── */}
        <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          <AnimatePresence mode="popLayout">
            {filteredProjects.map((project, index) => (
              <ProjectCard
                key={project.id}
                project={project}
                index={index}
                onQuickView={setSelectedProject}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredProjects.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Search className="w-6 h-6 text-zinc-500" />
            </div>
            <p className="text-zinc-400 font-medium mb-1">No projects match your search</p>
            <p className="text-zinc-400 text-sm">Try a different filter or search term.</p>
            <button
              onClick={() => { setSearchQuery(''); setFilter('All'); setSearchParams({}, { replace: true }); }}
              className="mt-4 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            >
              Clear all filters
            </button>
          </motion.div>
        )}

        {/* ── GitHub CTA ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-20 text-center"
        >
          <a
            href="https://github.com/qoidrifat"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-4 px-10 py-5 bg-white/5 border border-white/10 rounded-[2rem] hover:bg-white/10 hover:border-[hsl(var(--accent-web))]/30 transition-all duration-500 shadow-xl shadow-black/20"
          >
            <Code2 className="w-6 h-6 text-zinc-400 group-hover:text-[hsl(var(--accent-web))] transition-colors" aria-hidden="true" />
            <div className="text-left">
              <p className="text-white font-bold text-lg group-hover:text-[hsl(var(--accent-web))] transition-colors">
                Dive Into the Code
              </p>
              <p className="text-zinc-500 text-sm group-hover:text-zinc-400 transition-colors">
                Explore all projects on GitHub →
              </p>
            </div>
            <div className="w-10 h-10 rounded-full bg-[hsl(var(--accent-web))]/10 border border-[hsl(var(--accent-web))]/20 flex items-center justify-center group-hover:bg-[hsl(var(--accent-web))]/20 group-hover:border-[hsl(var(--accent-web))]/40 group-hover:translate-x-1 transition-all duration-500">
              <ArrowUpRight className="w-5 h-5 text-[hsl(var(--accent-web))]" aria-hidden="true" />
            </div>
          </a>
        </motion.div>
      </div>

      {/* Project Modal — Quick View (conditionally rendered with exit animation) */}
      <AnimatePresence>
        {selectedProject && (
          <ProjectModal
            project={selectedProject}
            onClose={() => setSelectedProject(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}
