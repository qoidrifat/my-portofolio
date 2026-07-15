import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X, ExternalLink, Github, Layers, ListChecks, Target, Rocket,
  ChevronLeft, ChevronRight, ArrowUpRight, BookOpen,
} from 'lucide-react';
import ProjectVisual from './ProjectVisual';

// ── Tab definitions ─────────────────────────────────────────────────────────
const TABS = [
  { id: 'overview',    label: 'Overview',    icon: Rocket },
  { id: 'tech',        label: 'Tech Stack',   icon: Layers },
  { id: 'features',    label: 'Features',     icon: ListChecks },
  { id: 'challenges',  label: 'Challenges',   icon: Target },
];

// ── Backdrop animation variants ──────────────────────────────────────────────
const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } },
};

const modalVariants = {
  hidden: { scale: 0.92, opacity: 0, y: 40 },
  visible: {
    scale: 1, opacity: 1, y: 0,
    transition: { type: 'spring', damping: 28, stiffness: 260, mass: 0.8 },
  },
  exit: {
    scale: 0.95, opacity: 0, y: 20,
    transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] },
  },
};

const tabContentVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
};

// ── Gallery placeholder images ───────────────────────────────────────────────
function getGalleryImages(project) {
  // Generate gallery images from the project's imageUrl and related screenshots
  const images = [];
  if (project.imageUrl) images.push({ src: project.imageUrl, label: 'Overview' });

  // Add generated thumbnails for projects without real screenshots
  if (!project.imageUrl || project.imageUrl.startsWith('/project')) {
    if (project.slug === 'payrollpro') {
      images.push({ src: null, label: 'Dashboard', visual: 'payroll' });
      images.push({ src: null, label: 'Attendance', visual: 'payroll' });
    } else if (project.slug === 'explore-bali') {
      images.push({ src: null, label: 'Destinations', visual: 'travel-booking' });
      images.push({ src: null, label: 'Booking Flow', visual: 'travel-booking' });
    } else if (project.slug === 'cashflow') {
      images.push({ src: null, label: 'Finance Dashboard', visual: 'cashflow' });
      images.push({ src: null, label: 'Receipt Scan', visual: 'cashflow' });
    }
  }
  return images;
}

// ── Component ───────────────────────────────────────────────────────────────
const ProjectModal = ({ project, onClose }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [galleryIndex, setGalleryIndex] = useState(0);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') nextImage();
      if (e.key === 'ArrowLeft') prevImage();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  if (!project) return null;

  const hasDemo = project.demoUrl && project.demoUrl !== '#';
  const hasValidSourceCode = Boolean(project.githubUrl && project.githubUrl !== '#');
  const galleryImages = getGalleryImages(project);
  const hasMultipleImages = galleryImages.length > 1;

  const nextImage = () => setGalleryIndex((g) => (g + 1) % galleryImages.length);
  const prevImage = () => setGalleryIndex((g) => (g - 1 + galleryImages.length) % galleryImages.length);

  // Tab content renderer
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="prose prose-invert max-w-none">
            {project.longDescription.split('\n\n').map((para, i) => (
              <p key={i} className="text-zinc-300 leading-relaxed text-sm md:text-base mb-4 last:mb-0">
                {para}
              </p>
            ))}
          </div>
        );

      case 'tech':
        return (
          <div className="flex flex-wrap gap-2">
            {project.technologies.map(tech => (
              <span
                key={tech}
                className="px-4 py-2 bg-white/5 border border-white/5 rounded-xl text-xs font-bold text-zinc-300 hover:bg-white/10 hover:border-blue-500/30 hover:text-blue-300 transition-all duration-300"
              >
                {tech}
              </span>
            ))}
          </div>
        );

      case 'features':
        if (!Array.isArray(project.features) || project.features.length === 0) {
          return (
            <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
              <ListChecks className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm font-medium">Feature list not available for this project.</p>
            </div>
          );
        }
        return (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {project.features.map(feature => (
              <div
                key={feature}
                className="flex items-start gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.03]"
              >
                <div className="w-5 h-5 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                </div>
                <span className="text-xs font-semibold text-zinc-300">{feature}</span>
              </div>
            ))}
          </div>
        );

      case 'challenges':
        return (
          <div className="prose prose-invert max-w-none">
            {project.challenges.split('\n\n').map((para, i) => (
              <p key={i} className="text-zinc-300 leading-relaxed text-sm md:text-base mb-4 last:mb-0 italic">
                {para}
              </p>
            ))}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        key="backdrop"
        variants={backdropVariants}
        initial="hidden"
        animate="visible"
        exit="exit"
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-lg z-[100] flex items-center justify-center p-3 md:p-6"
        onClick={onClose}
      >
        <motion.div
          key="modal"
          variants={modalVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          className="bg-zinc-900/90 border border-white/10 rounded-[2rem] w-full max-w-5xl max-h-[88vh] overflow-hidden relative shadow-2xl shadow-black/40 flex flex-col md:flex-row"
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Close Button ── */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-50 p-2.5 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10 text-zinc-400 hover:text-white hover:scale-110 transition-all duration-300"
            aria-label="Close modal"
          >
            <X size={18} aria-hidden="true" />
          </button>

          {/* ── Left: Gallery / Visual ── */}
          <div className="relative w-full md:w-[45%] h-56 md:h-auto overflow-hidden bg-zinc-950 shrink-0 group">
            {/* Image display */}
            <AnimatePresence mode="wait">
              <motion.div
                key={galleryIndex}
                initial={{ opacity: 0, scale: 1.05 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0"
              >
                <ProjectVisual
                  project={{
                    ...project,
                    imageUrl: galleryImages[galleryIndex]?.src || project.imageUrl,
                    visual: galleryImages[galleryIndex]?.visual || project.visual,
                  }}
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </AnimatePresence>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/20 to-transparent md:bg-gradient-to-r pointer-events-none" />

            {/* Gallery navigation arrows */}
            {hasMultipleImages && (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); prevImage(); }}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); nextImage(); }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-20 p-2 rounded-xl bg-zinc-950/60 backdrop-blur-md border border-white/10 text-zinc-300 hover:text-white hover:bg-zinc-900 transition-all opacity-0 group-hover:opacity-100"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dot indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2">
                  {galleryImages.map((_, i) => (
                    <button
                      key={i}
                      onClick={(e) => { e.stopPropagation(); setGalleryIndex(i); }}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        i === galleryIndex ? 'bg-white w-4' : 'bg-white/30 hover:bg-white/50'
                      }`}
                      aria-label={`Image ${i + 1}`}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Category badge */}
            <div className="absolute top-4 left-4 z-20">
              <span className="px-3 py-1.5 rounded-lg bg-blue-500/15 border border-blue-500/25 backdrop-blur-md text-blue-400 text-[9px] font-bold uppercase tracking-widest">
                {project.category}
              </span>
            </div>
          </div>

          {/* ── Right: Content Panel ── */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <div className="px-6 pt-6 pb-3 border-b border-white/[0.06]">
              <h2 className="text-xl md:text-2xl font-black text-white leading-tight pr-8">
                {project.title}
              </h2>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{project.year}</span>
                <span className="text-zinc-700">·</span>
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">{project.role}</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/[0.06] px-6 overflow-x-auto scrollbar-none shrink-0">
              {TABS.map((tab) => {
                // Skip features tab if no features data
                if (tab.id === 'features' && (!Array.isArray(project.features) || project.features.length === 0)) return null;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider whitespace-nowrap transition-colors ${
                      isActive ? 'text-blue-400' : 'text-zinc-500 hover:text-zinc-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{tab.label}</span>
                    {isActive && (
                      <motion.div
                        layoutId="modalTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-500 rounded-full"
                        transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  variants={tabContentVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                >
                  {renderTabContent()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer actions */}
            <div className="px-6 py-4 border-t border-white/[0.06] bg-zinc-950/30 flex items-center gap-3 shrink-0">
              {/* View Full Case Study */}
              <Link
                to={`/projects/${project.slug}`}
                onClick={onClose}
                className="flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 rounded-xl text-white text-xs font-bold hover:bg-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/20 whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span>Full Case Study</span>
                <ArrowUpRight className="w-3 h-3" />
              </Link>

              {/* Live Demo */}
              {hasDemo && (
                <a
                  href={project.demoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300 text-xs font-bold hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Live Demo</span>
                </a>
              )}

              {/* Source Code */}
              {hasValidSourceCode && (
                <a
                  href={project.githubUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={(e) => e.stopPropagation()}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-zinc-300 text-xs font-bold hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>Code</span>
                </a>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ProjectModal;
