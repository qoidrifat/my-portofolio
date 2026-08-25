import { useRef, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import {
  ArrowLeft, ExternalLink, Github, Layers, ListChecks, Target, Rocket,
  Calendar, User, BarChart3, ChevronRight, Sparkles, TrendingUp, ArrowUpRight,
  Gauge, ShieldCheck, BookOpen, FileText, Image as ImageIcon,
  Network, Lightbulb, Compass,
} from 'lucide-react';
import { projects } from '@/lib/data';
import ProjectVisual from '@/components/portofolio/ProjectVisual';
import ArchitectureViewer from '@/components/portofolio/ArchitectureViewer';
import TechGroups from '@/components/portofolio/TechGroups';

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
            className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(var(--accent-web-btn))] rounded-xl text-white font-bold hover:brightness-110 transition-all duration-300"
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
          <div className="absolute top-1/4 -left-32 w-[600px] h-[600px] bg-accent-web/8 rounded-full blur-[180px]" />
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
                  <ProjectVisual
                    project={project}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent opacity-70" />
                </div>

                {/* Impact metric bar */}
                {Array.isArray(project.impact) && project.impact.length > 0 && (
                  <div className="px-8 py-5 border-t border-white/[0.06] bg-zinc-950/60 flex items-center gap-3">
                    <TrendingUp className="w-5 h-5 text-accent-web shrink-0" />
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
                <span className="px-4 py-1.5 rounded-full bg-accent-web/10 border border-accent-web/20 text-accent-web text-[10px] font-bold uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
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
                  <User className="w-4 h-4 text-accent-web" />
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
                    className="flex items-center justify-center gap-2 px-8 py-4 bg-[hsl(var(--accent-web-btn))] rounded-2xl text-white font-bold hover:brightness-110 transition-all duration-300 shadow-lg shadow-accent-web/20 group"
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
                <div className="w-10 h-10 rounded-2xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center">
                  <Rocket className="w-5 h-5 text-accent-web" />
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

          {/* Impact / Key Results — kept directly after Overview for narrative consistency with every other project */}
          {Array.isArray(project.impact) && project.impact.length > 0 && (
            <FadeSection delay={0.15}>
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

          {/* Project Metrics */}
          {Array.isArray(project.metrics) && project.metrics.length > 0 && (
            <FadeSection delay={0.25}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center">
                    <Gauge className="w-5 h-5 text-accent-web" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Project Metrics</h2>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {project.metrics.map((metric, i) => (
                    <div
                      key={i}
                      className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-accent-web/20 transition-all duration-300"
                    >
                      <div className="text-2xl md:text-3xl font-black text-white mb-1">{metric.value}</div>
                      <div className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">{metric.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Architecture */}
          {project.architecture && (
            <FadeSection delay={0.3}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center">
                    <Network className="w-5 h-5 text-accent-web" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Architecture</h2>
                </div>
                <ArchitectureViewer architecture={project.architecture} />
              </div>
            </FadeSection>
          )}

          {/* Tier Strategy */}
          {Array.isArray(project.tiers) && project.tiers.length > 0 && (
            <FadeSection delay={0.35}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                    <Target className="w-5 h-5 text-amber-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Acquisition Strategy</h2>
                </div>
                <div className="grid gap-3">
                  {project.tiers.map((tier) => (
                    <div
                      key={tier.tier}
                      className={`relative p-5 rounded-2xl border transition-all duration-300 ${
                        tier.recommended
                          ? 'bg-accent-web/[0.06] border-accent-web/25 hover:border-accent-web/40'
                          : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.12]'
                      }`}
                    >
                      {tier.recommended && (
                        <div className="absolute top-4 right-4 px-2.5 py-1 bg-accent-web/15 border border-accent-web/30 rounded-full">
                          <span className="text-[9px] font-bold uppercase tracking-wider text-accent-web">Recommended Lane</span>
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-2">
                        <span className="text-[10px] font-black text-accent-web uppercase tracking-[0.18em]">{tier.tier}</span>
                        <h3 className="text-base font-bold text-white">{tier.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-white/[0.04] border border-white/[0.08] text-zinc-400">
                          {tier.reliability} reliability
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                          tier.legal === 'Clean'
                            ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                        }`}>
                          {tier.legal}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-1 rounded-lg bg-zinc-800/60 border border-zinc-700/50 text-zinc-400">
                          {tier.status}
                        </span>
                      </div>
                      <p className="text-sm text-zinc-400 leading-relaxed">{tier.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Platform Status */}
          {Array.isArray(project.platforms) && project.platforms.length > 0 && (
            <FadeSection delay={0.4}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5 text-emerald-500" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Platform Coverage</h2>
                </div>
                <div className="grid gap-3">
                  {project.platforms.map((platform) => (
                    <div
                      key={platform.name}
                      className="flex items-center justify-between gap-4 p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] transition-all duration-300"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-zinc-800/60 border border-zinc-700/50 flex items-center justify-center">
                          <span className="text-[10px] font-black text-zinc-300 uppercase">
                            {platform.name.slice(0, 2)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">{platform.name}</p>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-wider mt-0.5">
                            Production lane: {platform.lane}
                          </p>
                        </div>
                      </div>
                      <div className="hidden sm:flex flex-col items-end gap-1.5">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border ${
                          platform.publicStatus === 'warning'
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-400'
                            : 'bg-red-500/10 border-red-500/25 text-red-400'
                        }`}>
                          Public: {platform.public}
                        </span>
                        <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-emerald-500/10 border-emerald-500/25 text-emerald-400">
                          Merchant: {platform.merchant}
                        </span>
                      </div>
                      <div className="sm:hidden text-right">
                        <p className="text-[9px] font-bold text-emerald-400">Merchant: {platform.merchant}</p>
                        <p className="text-[9px] font-bold text-amber-400 mt-1">Public: {platform.public}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Screenshot Gallery */}
          {Array.isArray(project.screenshots) && project.screenshots.length > 0 && (
            <FadeSection delay={0.45}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                    <ImageIcon className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Gallery</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {project.screenshots.map((shot) => (
                    <div key={shot.src} className="group relative rounded-2xl overflow-hidden border border-white/[0.06] bg-zinc-950">
                      <img
                        src={shot.src}
                        alt={shot.label}
                        loading="lazy"
                        decoding="async"
                        className={`w-full aspect-[16/9] ${shot.portrait ? 'object-contain' : 'object-cover object-top'} transition-transform duration-700 group-hover:scale-105`}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/90 via-transparent to-transparent opacity-70 group-hover:opacity-90 transition-opacity duration-500" />
                      <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                        <span className="text-xs font-bold text-white uppercase tracking-wider">{shot.label}</span>
                        <span className="w-8 h-[1px] bg-white/30 group-hover:bg-accent-web group-hover:w-12 transition-all duration-300" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          <FadeSection delay={0.3}>
            <div className="space-y-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                  <Layers className="w-5 h-5 text-purple-500" />
                </div>
                <h2 className="text-2xl font-bold text-white">Technologies</h2>
              </div>
              {/* Grouped view for projects that ship techGroups — matches the modal presentation */}
              {Array.isArray(project.techGroups) && project.techGroups.length > 0 ? (
                <TechGroups groups={project.techGroups} />
              ) : (
                <div className="flex flex-wrap gap-2.5">
                  {project.technologies.map(tech => (
                    <span
                      key={tech}
                      className="px-5 py-2.5 bg-white/[0.03] border border-white/[0.06] rounded-xl text-sm font-semibold text-zinc-300 hover:bg-white/[0.06] hover:border-accent-web/30 hover:text-accent-web transition-all duration-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
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

          {/* Lessons Learned */}
          {Array.isArray(project.lessons) && project.lessons.length > 0 && (
            <FadeSection delay={0.45}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                    <Lightbulb className="w-5 h-5 text-violet-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Lessons Learned</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.lessons.map((lesson, i) => (
                    <div
                      key={i}
                      className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-violet-500/25 transition-all duration-300"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-6 h-6 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center shrink-0">
                          <span className="text-[10px] font-black text-violet-400">{String(i + 1).padStart(2, '0')}</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-[0.16em] text-zinc-500">
                          Takeaway
                        </span>
                      </div>
                      <h3 className="text-sm font-bold text-white mb-2 leading-snug">{lesson.title}</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">{lesson.detail}</p>
                    </div>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}

          {/* Future Roadmap */}
          {Array.isArray(project.roadmap) && project.roadmap.length > 0 && (
            <FadeSection delay={0.5}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center">
                    <Compass className="w-5 h-5 text-accent-web" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Future Roadmap</h2>
                </div>
                <div className="relative">
                  {/* Vertical timeline rail */}
                  <div className="absolute left-5 top-2 bottom-2 w-px bg-gradient-to-b from-accent-web/40 via-white/10 to-transparent" aria-hidden="true" />
                  <div className="space-y-5">
                    {project.roadmap.map((item, i) => (
                      <div key={item.phase} className="relative pl-14">
                        {/* Phase node — number duplicates the visible 'Phase N' label, so hide from AT */}
                        <div
                          className="absolute left-0 top-1 w-10 h-10 rounded-xl bg-accent-web/10 border border-accent-web/25 flex items-center justify-center shrink-0"
                          aria-hidden="true"
                        >
                          <span className="text-[10px] font-black text-accent-web">
                            {String(i + 1).padStart(2, '0')}
                          </span>
                        </div>
                        <div
                          className={`p-5 rounded-2xl border transition-all duration-300 ${
                            item.tone === 'active'
                              ? 'bg-accent-web/[0.04] border-accent-web/20 hover:border-accent-web/35'
                              : 'bg-white/[0.02] border-white/[0.06] hover:bg-white/[0.04]'
                          }`}
                        >
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-2">
                            <span className="text-[9px] font-black text-accent-web uppercase tracking-[0.16em]">
                              {item.phase}
                            </span>
                            <span
                              className={`text-[9px] font-bold px-2 py-1 rounded-lg border ${
                                item.tone === 'active'
                                  ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-400'
                                  : 'bg-zinc-800/60 border-zinc-700/50 text-zinc-400'
                              }`}
                            >
                              {item.status}
                            </span>
                          </div>
                          <h3 className="text-base font-bold text-white mb-2">{item.title}</h3>
                          <p className="text-sm text-zinc-400 leading-relaxed">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </FadeSection>
          )}

          {/* Documentation */}
          {Array.isArray(project.docs) && project.docs.length > 0 && (
            <FadeSection delay={0.55}>
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-sky-400" />
                  </div>
                  <h2 className="text-2xl font-bold text-white">Documentation</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {project.docs.map((doc) => (
                    <a
                      key={doc.href}
                      href={doc.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="group flex items-center gap-3 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-accent-web/25 transition-all duration-300"
                    >
                      <div className="w-9 h-9 rounded-xl bg-accent-web/10 border border-accent-web/20 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform duration-300">
                        <BookOpen className="w-4 h-4 text-accent-web" aria-hidden="true" />
                      </div>
                      <span className="text-sm font-bold text-zinc-200 group-hover:text-white transition-colors">{doc.label}</span>
                      <ArrowUpRight className="w-4 h-4 text-zinc-600 ml-auto group-hover:text-accent-web group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </div>
            </FadeSection>
          )}
        </div>
      </div>

      {/* ── Related Projects ── */}
      {relatedProjects.length > 0 && (
        <section className="border-t border-white/[0.06] py-20 md:py-28">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <FadeSection delay={0.1}>
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  Related <span className="text-zinc-500">Projects</span>
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
                        <h3 className="text-base font-bold text-white leading-snug group-hover:text-accent-web transition-colors mb-3">
                          {rp.title}
                        </h3>
                        <div className="flex items-center gap-1.5 text-accent-web text-xs font-bold">
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
