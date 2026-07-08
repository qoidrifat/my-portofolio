import React, { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import { ArrowUpRight, ExternalLink, Github, Sparkles, TrendingUp } from 'lucide-react';
import { projects, featuredProjectId } from '@/lib/data';
import OptimizedImage from '@/components/OptimizedImage';

export default function FeaturedProjectSection() {
  const [imageFailed, setImageFailed] = useState(false);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-80px' });
  const shouldReduceMotion = useReducedMotion();

  const project = projects.find(p => p.id === featuredProjectId);
  if (!project) return null;
  const hasScreenshot = Boolean(project.imageUrl);

  // Extract first 2-3 sentences for elevator pitch
  const elevatorPitch = project.longDescription
    .split(/(?<=\.)\s+/)
    .slice(0, 3)
    .join(' ');

  // Motion helpers — no-ops when reduced motion is preferred
  const fadeUp = shouldReduceMotion
    ? {}
    : { initial: { opacity: 0, y: 24 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

  const stagger = (delay = 0) =>
    shouldReduceMotion ? { duration: 0 } : { duration: 0.6, delay, ease: [0.23, 1, 0.32, 1] };

  return (
    <section
      id="featured"
      className="py-32 md:py-48 relative overflow-hidden"
      ref={ref}
    >
      {/* Background decoration — emerald AI tint */}
      <div className="absolute top-1/4 -left-32 w-[700px] h-[700px] bg-[hsl(var(--accent-ai))]/5 rounded-full blur-[180px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[hsl(var(--accent-web))]/5 rounded-full blur-[150px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Section badge */}
        <motion.div
          {...fadeUp}
          transition={stagger(0)}
          className="text-center mb-16"
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[hsl(var(--accent-ai))]/10 border border-[hsl(var(--accent-ai))]/20 text-[hsl(var(--accent-ai))] text-[10px] font-bold uppercase tracking-[0.2em] mb-6">                <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Featured AI Spotlight
          </span>
        </motion.div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left — Visual card */}
          <motion.div
            {...fadeUp}
            transition={stagger(0.1)}
            {...(!shouldReduceMotion && { whileHover: { y: -4 } })}
            className="relative group"
          >
            <div className="relative rounded-[2.5rem] overflow-hidden border border-[hsl(var(--accent-ai))]/20 shadow-glow-ai bg-zinc-900/40 backdrop-blur-md">
              {/* Category badge overlay */}
              <div className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 bg-[hsl(var(--accent-ai))]/15 border border-[hsl(var(--accent-ai))]/25 rounded-full backdrop-blur-md">
                <project.icon className="w-4 h-4 text-[hsl(var(--accent-ai))]" aria-hidden="true" />
                <span className="text-[hsl(var(--accent-ai))] text-[10px] font-bold uppercase tracking-wider">
                  {project.category}
                </span>
              </div>

              {/* Image */}
              <div className="relative aspect-[4/3] overflow-hidden bg-zinc-950">
                {!imageFailed ? (
                  <OptimizedImage
                    src={project.imageUrl}
                    alt={project.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    onError={() => setImageFailed(true)}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950">
                    <div className="text-center p-8">
                      <project.icon className="w-16 h-16 mx-auto mb-4 text-zinc-700" />
                      <p className="text-zinc-400 text-sm font-medium">{project.title}</p>
                    </div>
                  </div>
                )}
                <div className={`absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent ${hasScreenshot ? 'opacity-70' : 'opacity-90'}`} />

                {/* Tech badges on hover */}
                <div className="absolute bottom-6 left-6 right-6 flex flex-wrap gap-2 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500">
                  {project.technologies.slice(0, 5).map(tech => (
                    <span
                      key={tech}
                      className="px-3 py-1.5 bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-xl text-[10px] font-bold text-zinc-300 uppercase tracking-wider"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              </div>

              {/* Impact metric bar */}
              <div className="px-8 py-5 border-t border-[hsl(var(--accent-ai))]/10 bg-zinc-950/60 flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-[hsl(var(--accent-ai))] shrink-0" aria-hidden="true" />
                <span className="text-sm font-bold text-text-body">
                  {Array.isArray(project.impact) ? project.impact[0] : project.impact}
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right — Narrative */}
          <div className="space-y-8">
            {/* Headline */}
            <motion.div {...fadeUp} transition={stagger(0.15)}>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black leading-[1.1] tracking-tight mb-4">
                <span className="text-gradient">{project.title}</span>
              </h2>
            </motion.div>

            {/* Role */}
            <motion.div {...fadeUp} transition={stagger(0.2)}>
              <p className="text-text-muted text-sm font-bold uppercase tracking-[0.15em]">
                {project.role}
              </p>
            </motion.div>

            {/* Elevator pitch */}
            <motion.div {...fadeUp} transition={stagger(0.25)}>
              <p className="text-text-body text-lg leading-relaxed">
                {elevatorPitch}
              </p>
            </motion.div>

            {/* Impact bullets */}
            {Array.isArray(project.impact) && project.impact.length > 1 && (
              <motion.div {...fadeUp} transition={stagger(0.3)}>
                <ul className="space-y-3">
                  {project.impact.map((item, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-[hsl(var(--accent-ai))] shrink-0" />
                      <span className="text-text-body text-sm leading-relaxed">{item}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}

            {/* Tech stack badges */}
            <motion.div {...fadeUp} transition={stagger(0.35)}>
              <div className="flex flex-wrap gap-2">
                {project.technologies.slice(0, 5).map(tech => (
                  <span
                    key={tech}
                    className="px-4 py-2 bg-white/5 border border-border-soft rounded-xl text-xs font-bold text-text-body hover:bg-white/10 hover:border-border-soft-strong transition-colors"
                  >
                    {tech}
                  </span>
                ))}
                {project.technologies.length > 5 && (
                  <span className="px-4 py-2 bg-white/5 border border-border-soft rounded-xl text-xs font-bold text-text-muted">
                    +{project.technologies.length - 5} more
                  </span>
                )}
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              {...fadeUp}
              transition={stagger(0.4)}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-4"
            >
              {/* Primary — View Full Case Study */}
              <Link
                to={`/projects/${project.slug}`}
                className="group/btn inline-flex items-center justify-center gap-3 px-8 py-5 bg-[hsl(var(--accent-ai))] rounded-2xl text-white font-bold hover:brightness-110 transition-all duration-300 shadow-lg shadow-[hsl(var(--accent-ai))]/20"
              >
                <span>View Full Case Study</span>
                <ArrowUpRight className="w-5 h-5 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" aria-hidden="true" />
              </Link>

              {/* Secondary — Live Demo */}
              <motion.a
                href={project.demoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-8 py-5 bg-white/5 border border-border-soft rounded-2xl text-white font-bold hover:bg-white/10 hover:border-border-soft-strong transition-all duration-300"
                {...(!shouldReduceMotion && { whileTap: { scale: 0.98 } })}
              >
                <span>Live Demo</span>
                <ExternalLink className="w-4 h-4" aria-hidden="true" />
              </motion.a>

              {/* Tertiary — Source Code */}
              <motion.a
                href={project.githubUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 px-8 py-5 bg-zinc-950 border border-border-soft rounded-2xl text-text-muted hover:text-white hover:border-border-soft-strong transition-all duration-300 font-bold"
                {...(!shouldReduceMotion && { whileTap: { scale: 0.98 } })}
                aria-label={`${project.title} source code`}
              >
                <Github className="w-5 h-5" aria-hidden="true" />
                <span>Source Code</span>
              </motion.a>
            </motion.div>
          </div>
        </div>
      </div>

    </section>
  );
}
