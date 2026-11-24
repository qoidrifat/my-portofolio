import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, useInView, AnimatePresence } from 'framer-motion';
import {
  ExternalLink, Github, ArrowUpRight, Star, Code2, BookOpen,
  Search, X as XIcon, Eye, CheckCircle2,
} from 'lucide-react';
import { projects } from '@/lib/projects-data';
import ProjectModal from './ProjectModal';
import ProjectVisual from './ProjectVisual';
import { useLanguage } from '@/lib/LanguageContext';

const COPY = {
  en: {
    eyebrow: 'Engineering Portfolio',
    headingMain: 'Featured',
    headingAccent: 'Projects',
    intro: 'Production-ready full-stack systems, architectural case studies, and applied AI research with verifiable engineering evidence.',
    searchPlaceholder: 'Search by title, technology, category...',
    resultsSuffix: 'found',
    urlShareable: 'URL is shareable',
    featuredBadge: 'Featured Architecture',
    roleLabel: 'Role',
    outcomeLabel: 'Key Outcome',
    caseStudy: 'Case Study',
    liveDemo: 'Live Demo',
    code: 'Source',
    quickView: 'Quick View',
    emptyTitle: 'No projects match your filter',
    emptyDesc: 'Try adjusting your search terms or category selection.',
    clearFilters: 'Reset filters',
    githubCtaTitle: 'Inspect the Repositories',
    githubCtaDesc: 'Explore open-source architectures & commit history on GitHub →',
    underDev: 'Currently under development',
    allCategories: 'All',
  },
  id: {
    eyebrow: 'Portofolio Rekayasa',
    headingMain: 'Proyek',
    headingAccent: 'Unggulan',
    intro: 'Sistem full-stack siap produksi, studi kasus arsitektur, dan riset AI terapan dengan bukti rekayasa terverifikasi.',
    searchPlaceholder: 'Cari berdasarkan judul, teknologi, kategori...',
    resultsSuffix: 'ditemukan',
    urlShareable: 'URL dapat dibagikan',
    featuredBadge: 'Arsitektur Unggulan',
    roleLabel: 'Peran',
    outcomeLabel: 'Hasil Utama',
    caseStudy: 'Studi Kasus',
    liveDemo: 'Demo Langsung',
    code: 'Kode Sumber',
    quickView: 'Lihat Cepat',
    emptyTitle: 'Tidak ada proyek yang sesuai',
    emptyDesc: 'Coba sesuaikan kata kunci pencarian atau kategori.',
    clearFilters: 'Reset filter',
    githubCtaTitle: 'Telusuri Repositori',
    githubCtaDesc: 'Jelajahi arsitektur open-source & riwayat commit di GitHub →',
    underDev: 'Sedang dalam tahap pengembangan',
    allCategories: 'Semua',
  },
};

// ── Project Card ────────────────────────────────────────────────────────────
const ProjectCard = React.forwardRef(({ project, index, onQuickView, t, isFeaturedHighlight = false }, ref) => {
  const hasDemo = Boolean(project.demoUrl && project.demoUrl !== '#');
  const hasValidSourceCode = Boolean(project.githubUrl && project.githubUrl !== '#');

  return (
    <motion.div
      ref={ref}
      layout
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{
        duration: 0.45,
        delay: index * 0.05,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={isFeaturedHighlight ? 'md:col-span-2' : ''}
    >
      {project.isPlaceholder ? (
        /* ── Minimalist Coming Soon Placeholder ── */
        <div className="relative bg-zinc-900/60 border border-zinc-800/80 rounded-3xl overflow-hidden flex flex-col group/card h-full transition-all duration-300 hover:border-zinc-700">
          <div className="relative h-48 md:h-56 overflow-hidden bg-zinc-950/80 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
              <project.icon className="w-8 h-8 text-zinc-400" />
            </div>
          </div>

          <div className="p-6 flex flex-col flex-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-accent-web mb-2">
              Upcoming
            </span>
            <h3 className="text-lg font-bold text-white mb-2">{project.title}</h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-4 flex-1">
              {project.longDescription}
            </p>
            <div className="pt-3 border-t border-zinc-800/60 flex items-center gap-2 text-[11px] text-zinc-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-accent-web/60" />
              <span>{t.underDev}</span>
            </div>
          </div>
        </div>
      ) : (
        /* ── Standard / Featured Project Card ── */
        <div
          className={`relative bg-zinc-900/60 border border-zinc-800/80 rounded-3xl overflow-hidden hover:border-zinc-700/80 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 flex flex-col group/card h-full ${
            isFeaturedHighlight ? 'lg:flex-row' : ''
          }`}
        >
          {/* Featured pill badge */}
          {project.featured && (
            <div className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1 bg-zinc-950/80 border border-accent-web/40 rounded-full backdrop-blur-md shadow-md">
              <Star className="w-3.5 h-3.5 text-accent-web fill-accent-web" aria-hidden="true" />
              <span className="text-white text-[10px] font-mono font-bold uppercase tracking-wider">
                {t.featuredBadge}
              </span>
            </div>
          )}

          {/* Visual Presentation Area */}
          <div
            className={`relative overflow-hidden bg-zinc-950 shrink-0 ${
              isFeaturedHighlight
                ? 'h-64 sm:h-72 lg:h-auto lg:w-5/12'
                : 'h-52 sm:h-64'
            }`}
          >
            <div className="w-full h-full transition-transform duration-500 group-hover/card:scale-102">
              <ProjectVisual project={project} className="w-full h-full object-cover" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent opacity-70" />

            {/* Quick View Button overlay */}
            <button
              onClick={() => onQuickView(project)}
              className="absolute inset-0 z-10 flex items-center justify-center bg-zinc-950/50 opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 transition-opacity duration-300 backdrop-blur-[2px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
              aria-label={`${t.quickView}: ${project.title}`}
            >
              <div className="flex items-center gap-2 px-4 py-2.5 bg-zinc-900/90 backdrop-blur-md border border-white/20 rounded-xl text-white font-bold text-xs shadow-lg transform transition-transform duration-200 group-hover/card:scale-105">
                <Eye className="w-3.5 h-3.5 text-accent-web" aria-hidden="true" />
                <span>{t.quickView}</span>
              </div>
            </button>
          </div>

          {/* Card Body Content */}
          <div className="p-5 sm:p-6 flex flex-col flex-1">
            {/* Category and Year / Status */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 min-w-0">
                <div className="p-1 rounded-md bg-zinc-800/80 border border-zinc-700/50 shrink-0">
                  <project.icon className="w-3.5 h-3.5 text-accent-web" />
                </div>
                <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider truncate">
                  {project.category}
                </span>
              </div>
              {project.status && (
                <span className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-[10px] font-mono font-medium text-emerald-400 shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  {project.status}
                </span>
              )}
            </div>

            {/* Title */}
            <h3 className="text-lg sm:text-xl font-bold text-white mb-1.5 leading-snug tracking-tight">
              {project.title}
            </h3>

            {/* Subtitle / Problem Statement */}
            {project.subtitle && (
              <p className="text-xs font-semibold text-accent-web mb-2 line-clamp-1">
                {project.subtitle}
              </p>
            )}

            {/* Description */}
            <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed mb-4 line-clamp-2">
              {project.description || project.longDescription?.slice(0, 160) + '...'}
            </p>

            {/* Verifiable Key Outcome / Impact point */}
            {project.impact && project.impact.length > 0 && (
              <div className="mb-4 p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-[11px] text-zinc-300 leading-relaxed line-clamp-2">
                  <span className="font-semibold text-zinc-200">{t.outcomeLabel}: </span>
                  {project.impact[0]}
                </p>
              </div>
            )}

            {/* Tech Stack Indicator Chips */}
            <div className="flex flex-wrap gap-1.5 mb-5 mt-auto">
              {project.technologies.slice(0, 4).map((tech) => (
                <span
                  key={tech}
                  className="px-2 py-0.5 rounded-md text-[10px] font-medium text-zinc-300 bg-white/[0.04] border border-white/[0.06]"
                >
                  {tech}
                </span>
              ))}
              {project.technologies.length > 4 && (
                <span className="px-2 py-0.5 rounded-md text-[10px] font-medium text-zinc-400 bg-white/[0.02] border border-white/[0.04]">
                  +{project.technologies.length - 4}
                </span>
              )}
            </div>

            {/* Actions Row */}
            <div className="flex flex-wrap items-center gap-2 pt-4 border-t border-zinc-800/60">
              {/* Primary Action: Case Study */}
              <Link
                to={`/projects/${project.slug}`}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-accent-web/15 border border-accent-web/40 text-accent-web rounded-xl text-xs font-bold hover:bg-accent-web hover:text-accent-web-foreground transition-all duration-200 group/btn focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{t.caseStudy}</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" aria-hidden="true" />
              </Link>

              {/* Secondary Action: Live Demo */}
              {hasDemo && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-200 hover:bg-zinc-700 hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
                  aria-label={`${project.title} ${t.liveDemo}`}
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-emerald-400" aria-hidden="true" />
                  <span>{t.liveDemo}</span>
                </a>
              )}

              {/* Tertiary Action: GitHub Repository */}
              {hasValidSourceCode && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-zinc-800/80 border border-zinc-700/80 rounded-xl text-xs font-semibold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
                  aria-label={`${project.title} ${t.code}`}
                >
                  <Github className="w-3.5 h-3.5 shrink-0 text-zinc-400" aria-hidden="true" />
                  <span>{t.code}</span>
                </a>
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
  const { lang } = useLanguage();
  const t = COPY[lang] || COPY.en;

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

  // Sync search query to URL
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

  // Listen for 'open-project' events from CommandPalette
  useEffect(() => {
    const handler = (e) => setSelectedProject(e.detail);
    window.addEventListener('open-project', handler);
    return () => window.removeEventListener('open-project', handler);
  }, []);

  const categories = useMemo(() => {
    return ['All', ...new Set(projects.map((p) => p.filterCategory || p.category))];
  }, []);

  const filteredProjects = useMemo(() => {
    let result = filter === 'All'
      ? projects
      : projects.filter((p) => (p.filterCategory || p.category) === filter);

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          p.technologies.some((tItem) => tItem.toLowerCase().includes(q)) ||
          p.category.toLowerCase().includes(q)
      );
    }

    return result;
  }, [filter, searchQuery]);

  return (
    <section id="projects" className="py-28 md:py-40 relative overflow-hidden scroll-mt-20" ref={ref}>
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-[550px] h-[550px] bg-accent-web/5 rounded-full blur-[140px] pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 left-0 w-[550px] h-[550px] bg-accent-ai/5 rounded-full blur-[140px] pointer-events-none" aria-hidden="true" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section Header */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8 mb-14">
          <div className="max-w-3xl">
            <motion.span
              initial={{ opacity: 0, y: 10 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5 }}
              className="px-3.5 py-1.5 rounded-full bg-accent-web/10 border border-accent-web/20 text-accent-web text-[10px] font-mono font-bold uppercase tracking-wider mb-4 inline-block"
            >
              {t.eyebrow}
            </motion.span>
            <motion.h2
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl lg:text-6xl font-black text-white mb-4 tracking-tight"
            >
              {t.headingMain} <span className="text-zinc-500">{t.headingAccent}</span>
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={isInView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-zinc-300 text-sm sm:text-base leading-relaxed max-w-2xl"
            >
              {t.intro}
            </motion.p>
          </div>
        </div>

        {/* ── Filter & Search Controls ── */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-10"
        >
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 bg-white/[0.02] p-1.5 rounded-2xl border border-white/[0.06]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => handleFilterChange(cat)}
                className={`relative px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web ${
                  filter === cat ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {filter === cat && (
                  <motion.div
                    layoutId="projectFilter"
                    className="absolute inset-0 bg-accent-web rounded-xl shadow-md shadow-accent-web/20"
                    transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  />
                )}
                <span className="relative z-10">
                  {cat === 'All' ? t.allCategories : cat}
                </span>
              </button>
            ))}
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 pointer-events-none" aria-hidden="true" />
            <input
              type="text"
              id="project-search"
              name="project-search"
              value={searchQuery}
              onChange={handleSearchChange}
              placeholder={t.searchPlaceholder}
              aria-label={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2.5 bg-white/[0.03] border border-white/[0.08] rounded-xl text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-accent-web focus:ring-1 focus:ring-accent-web transition-all"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={clearSearch}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-400 hover:text-white transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
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
                t={t}
                isFeaturedHighlight={filter === 'All' && !searchQuery && Boolean(project.featured)}
              />
            ))}
          </AnimatePresence>
        </motion.div>

        {/* Empty state */}
        {filteredProjects.length === 0 && (
          <div className="text-center py-20">
            <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Search className="w-5 h-5 text-zinc-500" />
            </div>
            <p className="text-zinc-300 font-semibold mb-1">{t.emptyTitle}</p>
            <p className="text-zinc-500 text-xs mb-4">{t.emptyDesc}</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilter('All');
                setSearchParams({}, { replace: true });
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-all"
            >
              {t.clearFilters}
            </button>
          </div>
        )}

        {/* ── GitHub CTA Card ── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="mt-16 text-center"
        >
          <a
            href="https://github.com/qoidrifat"
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex items-center gap-4 px-8 py-4 bg-zinc-900/60 border border-zinc-800 rounded-2xl hover:border-accent-web/40 hover:bg-zinc-900 transition-all duration-300 shadow-xl shadow-black/20"
          >
            <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/5 group-hover:border-accent-web/30 transition-colors">
              <Code2 className="w-5 h-5 text-zinc-400 group-hover:text-accent-web transition-colors" aria-hidden="true" />
            </div>
            <div className="text-left">
              <p className="text-white font-bold text-sm group-hover:text-accent-web transition-colors">
                {t.githubCtaTitle}
              </p>
              <p className="text-zinc-400 text-xs group-hover:text-zinc-300 transition-colors">
                {t.githubCtaDesc}
              </p>
            </div>
            <ArrowUpRight className="w-4 h-4 text-zinc-500 group-hover:text-accent-web group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" aria-hidden="true" />
          </a>
        </motion.div>
      </div>

      {/* Project Quick View Modal */}
      <ProjectModal
        project={selectedProject}
        onClose={() => setSelectedProject(null)}
      />
    </section>
  );
}
