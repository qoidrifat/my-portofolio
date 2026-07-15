import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, Github, Layers, ListChecks, Target, Rocket,
  Calendar, User, BarChart3, ChevronRight, Sparkles, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { projects } from '@/lib/data';
import ProjectVisual from '@/components/portofolio/ProjectVisual';

// ── Section wrapper with scroll-trigger ─────────────────────────────────────
function FadeSection({ children, delay = 0, className = '' }) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 30 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ── Stat card ───────────────────────────────────────────────────────────────
function StatCard({ value, label }) {
  return (
    <div className="p-5 rounded-2xl bg-white/[0.03] border border-white/[0.06] text-center">
      <div className="text-2xl font-black text-white mb-1">{value}</div>
      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{label}</div>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function ProjectCaseStudy() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [imageFailed, setImageFailed] = useState(false);

  const project = projects.find(p => p.slug === slug);

  useEffect(() => {
    if (!project) return;
    document.title = `${project.title} — Qoid Rif'at`;
    return () => { document.title = "Qoid Rif'at — AI & Web Developer Portfolio"; };
  }, [project]);

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950 px-6">
        <div className="text-center max-w-md">
          <div className="text-8xl font-black text-zinc-800 mb-6">404</div>
          <h1 className="text-2xl font-bold text-white mb-3">Project not found</h1>
          <p className="text-zinc-400 mb-8">The case study you're looking for doesn't exist or has been removed.</p>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 rounded-xl text-white font-bold hover:bg-blue-500 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Portfolio
          </Link>
        </div>
      </div>
    );
  }

  const hasDemo = project.demoUrl && project.demoUrl !== '#';
  const hasValidSourceCode = Boolean(project.githubUrl && project.githubUrl !== '#');
  const relatedProjects = projects.filter(p => p.id !== project.id && (p.accent === project.accent || p.filterCategory === project.filterCategory)).slice(0, 3);

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* ── Back navigation ── */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-lg border-b border-white/[0.06]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link
              to="/"
              className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium group"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Back to Portfolio</span>
            </Link>

            <span className="text-xs text-zinc-500 font-medium hidden sm:block">
              Case Study
            </span>
          </div>
        </div>
      </div>

      {/* ── Hero ── */}
      <section className="relative pt-16">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-blue-500/8 rounded-full blur-[180px]" />
          <div className="absolute bottom-0 -right-32 w-[500px] h-[500px] bg-purple-500/8 rounded-full blur-[150px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12 md:pt-20 pb-0 relative">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            {/* Left — Visual */}
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="relative group"
            >
              <div className="relative rounded-[2.5rem] overflow-hidden border border-white/[0.08] bg-zinc-900/40 backdrop-blur-sm shadow-2xl shadow-black/30">
                <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
                  {!imageFailed ? (
                    <ProjectVisual
                      project={project}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                      <project.icon className="w-20 h-20 text-zinc-700" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent opacity-70" />
                </div>

                {/* Impact metric bar */}
                {Array.isArray(project.impact) && project.impact.length > 0 && (
                  <div className="px-8 py-5 border-t border-white/[0.06] bg-zinc-950/60 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-blue-500 shrink-0" />
                    <span className="text-sm font-bold text-zinc-200">{project.impact[0]}</span>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Right — Metadata */}
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-8"
            >
              {/* Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <span className="px-4 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
                  <Sparkles className="w-3 h-3" />
                  Case Study
                </span>
                <span className="px-3 py-1.5 rounded-full bg-zinc-800/50 border border-zinc-700/50 text-zinc-400 text-[10px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  {project.year}
                </span>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white leading-[1.1] tracking-tight">
                {project.title}
              </h1>

              {/* Role + Category */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2 text-zinc-400">
                  <User className="w-4 h-4 text-blue-500" />
                  <span>{project.role}</span>
                </div>
                <span className="text-zinc-700">/</span>
                <span className="text-zinc-500">{project.category}</span>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-3">
                <StatCard value={project.year} label="Year" />
                <StatCard value={project.technologies.length} label="Technologies" />
                <StatCard
                  value={Array.isArray(project.impact) ? project.impact.length : 0}
                  label="Key Results"
                />
              </div>

              {/* CTA buttons */}
              <div className="flex flex-col sm:flex-row gap-4 pt-2">
                {hasDemo && (
                  <a
                    href={project.demoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-blue-600 rounded-2xl text-white font-bold hover:bg-blue-500 transition-all duration-300 shadow-lg shadow-blue-500/20 group"
                  >
                    <span>Live Demo</span>
                    <ExternalLink className="w-4 h-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </a>
                )}
                {hasValidSourceCode && (
                  <a
                    href={project.githubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all duration-300"
                  >
                    <Github className="w-4 h-4" />
                    <span>Source Code</span>
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── Content sections ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
        <div className="max-w-4xl mx-auto space-y-24">
          {/* Overview */}
          <FadeSection delay={0.1}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-blue-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Overview</h2>
              </div>
              <div className="prose prose-invert max-w-none">
                {project.longDescription.split('\n\n').map((para, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed text-lg mb-6 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </FadeSection>

          {/* Impact / Key Results */}
          {Array.isArray(project.impact) && project.impact.length > 0 && (
            <FadeSection delay={0.2}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <BarChart3 className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Key Results</h2>
                </div>
                <div className="grid gap-3">
                  {project.impact.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-emerald-500/20 transition-all duration-300"
                    >
                      <div className="w-6 h-6 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      </div>
                      <span className="text-zinc-300 text-base">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Technologies */}
          <FadeSection delay={0.3}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Technologies</h2>
              </div>
              <div className="flex flex-wrap gap-2.5">
                {project.technologies.map(tech => (
                  <span
                    key={tech}
                    className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] hover:border-blue-500/30 hover:text-blue-300 transition-all duration-300"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>
          </FadeSection>

          {/* Key Features */}
          {Array.isArray(project.features) && project.features.length > 0 && (
            <FadeSection delay={0.35}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <ListChecks className="w-5 h-5 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Key Features</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.features.map(feature => (
                    <div
                      key={feature}
                      className="flex items-start gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]"
                    >
                      <div className="w-5 h-5 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                        <ChevronRight className="w-3 h-3 text-amber-500" />
                      </div>
                      <span className="text-sm text-zinc-300">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Challenges */}
          <FadeSection delay={0.4}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
                  <Target className="w-5 h-5 text-red-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Challenges & Solutions</h2>
              </div>
              <div className="prose prose-invert max-w-none">
                {project.challenges.split('\n\n').map((para, i) => (
                  <p key={i} className="text-zinc-300 leading-relaxed text-lg mb-6 last:mb-0">
                    {para}
                  </p>
                ))}
              </div>
            </div>
          </FadeSection>
        </div>
      </div>

      {/* ── Related Projects ── */}
      {relatedProjects.length > 0 && (
        <section className="border-t border-white/[0.06] py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeSection delay={0.1}>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Related <span className="text-zinc-700">Projects</span>
                </h2>
                <p className="text-zinc-400 text-lg">Explore more projects that share similar technologies or themes.</p>
              </div>
            </FadeSection>

            <div className="grid md:grid-cols-3 gap-6">
              {relatedProjects.map((rp, i) => (
                <FadeSection key={rp.id} delay={0.1 + i * 0.1}>
                  <Link
                    to={`/projects/${rp.slug}`}
                    className="block group"
                  >
                    <div className="rounded-[2rem] border border-white/[0.06] bg-white/[0.02] overflow-hidden hover:bg-white/[0.04] hover:border-white/[0.12] transition-all duration-500 h-full">
                      <div className="aspect-[16/10] bg-zinc-950 relative overflow-hidden">
                        <ProjectVisual project={rp} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                        <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-transparent to-transparent" />
                      </div>
                      <div className="p-6">
                        <div className="flex items-center gap-2 mb-3">
                          <div className="p-1.5 rounded-lg bg-zinc-800/50">
                            <rp.icon className="w-4 h-4 text-zinc-300" />
                          </div>
                          <span className="text-[9px] font-medium text-zinc-500 uppercase tracking-wider">{rp.category}</span>
                        </div>
                        <h3 className="text-base font-bold text-white leading-snug group-hover:text-blue-400 transition-colors mb-3">
                          {rp.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-blue-400 text-xs font-bold">
                          <span>Read Case Study</span>
                          <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  </Link>
                </FadeSection>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
