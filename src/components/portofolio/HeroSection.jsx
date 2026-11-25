import { useState, Suspense, lazy } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight, Download, Briefcase, Code2, CheckCircle2, FileText } from 'lucide-react';
import { profile } from '@/lib/data';
import { useAnimatedCounter } from '@/hooks/useAnimatedCounter';

const PortfolioMascot = lazy(() => import('@/components/mascot/PortfolioMascot'));
import { useLanguage } from '@/lib/LanguageContext';

function AnimatedStat({ value, suffix = '', label, icon: Icon, delay = 0 }) {
  const { displayValue, ref } = useAnimatedCounter(value, {
    duration: 1800,
    delay: delay * 100,
    once: true,
  });

  return (
    <div ref={ref} className="text-center lg:text-left group" aria-label={`${value}${suffix} ${label}`}>
      <div
        className="flex items-center justify-center lg:justify-start gap-1.5 text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 group-hover:-translate-y-0.5 transition-transform duration-300 font-mono tracking-tight"
        aria-hidden="true"
      >
        {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent-web" aria-hidden="true" />}
        <span>
          {displayValue}
          {suffix}
        </span>
      </div>
      <div className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

function StaticStat({ display, label, icon: Icon }) {
  return (
    <div className="text-center lg:text-left group" aria-label={`${display} ${label}`}>
      <div
        className="flex items-center justify-center lg:justify-start gap-1.5 text-2xl sm:text-3xl lg:text-4xl font-black text-white mb-1 group-hover:-translate-y-0.5 transition-transform duration-300 font-mono tracking-tight"
        aria-hidden="true"
      >
        {Icon && <Icon className="w-4 h-4 sm:w-5 sm:h-5 text-accent-web" aria-hidden="true" />}
        <span>{display}</span>
      </div>
      <div className="text-[11px] sm:text-xs font-semibold text-zinc-400 uppercase tracking-wider">
        {label}
      </div>
    </div>
  );
}

export default function HeroSection() {
  const shouldReduceMotion = useReducedMotion();
  const { lang } = useLanguage();
  const [mascotMood, setMascotMood] = useState(null);

  const t = {
    en: {
      status: profile.status,
      greeting: "Hi, I'm",
      role: profile.role,
      tagline: profile.tagline,
      location: `Based in ${profile.location}. Available for remote & hybrid roles.`,
      explore: 'Explore My Work',
      viewCv: 'View CV',
      downloadCv: 'Download CV',
      capabilities: [
        'Full-Stack Web Apps',
        'Backend & REST APIs',
        'Database Architecture',
        'Applied AI Integration',
      ],
      stats: {
        experience: { display: '4+ Yrs', label: 'Engineering Experience' },
        projects: { value: 8, suffix: '+', label: 'Showcased Projects' },
        tests: { value: 260, suffix: '+', label: 'Automated Tests' },
      },
    },
    id: {
      status: 'Terbuka untuk Pekerjaan Full-Time & Kontrak',
      greeting: 'Halo, Saya',
      role: 'Full-Stack Developer',
      tagline: 'Membangun aplikasi web end-to-end, arsitektur backend yang tangguh, dan pengalaman digital cerdas.',
      location: `Berbasis di ${profile.location}. Terbuka untuk posisi remote & hybrid.`,
      explore: 'Jelajahi Proyek',
      viewCv: 'Lihat CV',
      downloadCv: 'Unduh CV',
      capabilities: [
        'Aplikasi Web Full-Stack',
        'Backend & REST API',
        'Arsitektur Database',
        'Integrasi AI Terapan',
      ],
      stats: {
        experience: { display: '4+ Yrs', label: 'Engineering Experience' },
        projects: { value: 8, suffix: '+', label: 'Proyek Portofolio' },
        tests: { value: 260, suffix: '+', label: 'Automated Tests' },
      },
    },
  }[lang] || t.en;

  const scrollToProjects = () => {
    const element = document.getElementById('projects');
    if (element) {
      const offset = element.offsetTop - 80;
      window.scrollTo({ top: offset, behavior: shouldReduceMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <section
      id="hero"
      className="min-h-screen flex flex-col justify-center relative overflow-x-clip pt-24 pb-16 lg:py-28"
      aria-label="Hero"
    >
      {/* Background — Atmospheric glow & subtle grid */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 -left-32 w-[520px] h-[520px] bg-accent-web/8 rounded-full blur-[140px]" />
        <div className="absolute bottom-1/4 -right-32 w-[520px] h-[520px] bg-accent-ai/8 rounded-full blur-[140px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_45%,#000_65%,transparent_100%)]" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 w-full">
        {/* Asymmetric Split Layout: Left Content, Right Mascot */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column: Identity, Editorial Copy & Actions */}
          <div className="lg:col-span-7 flex flex-col items-center lg:items-start text-center lg:text-left order-2 lg:order-1">
            {/* Status Pill Badge */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
              onMouseEnter={() => setMascotMood('greeting')}
              onMouseLeave={() => setMascotMood(null)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 text-accent-web text-xs font-medium mb-6 backdrop-blur-sm cursor-default hover:border-accent-web/30 transition-colors"
            >
              <span className="relative flex h-2 w-2">
                {!shouldReduceMotion && (
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                )}
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400" />
              </span>
              <span>{t.status}</span>
            </motion.div>

            {/* Primary Heading with FLIP Anchor */}
            <motion.h1
              initial={shouldReduceMotion ? false : { opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="text-4xl sm:text-5xl lg:text-7xl font-black leading-[1.08] tracking-tight mb-4"
            >
              <span className="text-zinc-400 text-2xl sm:text-3xl lg:text-4xl font-bold block mb-1">
                {t.greeting}
              </span>
              {/* #hero-name — FLIP anchor for the intro's shared-element exit */}
              <span id="hero-name" className="text-gradient">
                {profile.name}
              </span>
            </motion.h1>

            {/* Role Eyebrow / Subtitle */}
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: 'easeOut' }}
              className="text-xl sm:text-2xl lg:text-3xl font-semibold text-white mb-4"
            >
              {t.role}
            </motion.p>

            {/* Tagline & Evidence Statement */}
            <motion.p
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: 'easeOut' }}
              className="text-sm sm:text-base text-zinc-300 max-w-xl mb-6 leading-relaxed"
            >
              {t.tagline}{' '}
              <span className="text-zinc-500 block sm:inline mt-1 sm:mt-0 font-medium">
                {t.location}
              </span>
            </motion.p>

            {/* Engineering Capability Tags */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.35, ease: 'easeOut' }}
              className="flex flex-wrap items-center justify-center lg:justify-start gap-2 mb-8 max-w-lg"
            >
              {t.capabilities.map((cap) => (
                <span
                  key={cap}
                  className="px-2.5 py-1 rounded-md text-[11px] font-medium text-zinc-300 bg-white/[0.03] border border-white/[0.07]"
                >
                  {cap}
                </span>
              ))}
            </motion.div>

            {/* Primary & Secondary CTAs */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: 'easeOut' }}
              className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto mb-10"
            >
              {/* Primary: Explore My Work */}
              <motion.button
                onClick={scrollToProjects}
                onMouseEnter={() => setMascotMood('curious')}
                onMouseLeave={() => setMascotMood(null)}
                className="group relative w-full sm:w-auto px-7 py-3.5 bg-accent-web text-accent-web-foreground shadow-lg shadow-accent-web/20 rounded-xl font-bold flex items-center justify-center gap-2 hover:brightness-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950"
                whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
              >
                <span>{t.explore}</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" aria-hidden="true" />
              </motion.button>

              {/* Secondary: View CV & Direct Download */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <motion.a
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onMouseEnter={() => setMascotMood('happy')}
                  onMouseLeave={() => setMascotMood(null)}
                  className="group flex-1 sm:flex-initial px-5 py-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-zinc-200 font-semibold flex items-center justify-center gap-2 hover:bg-white/[0.08] hover:text-white hover:border-white/20 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  aria-label="Preview CV in new tab"
                >
                  <FileText className="w-4 h-4 text-accent-web" aria-hidden="true" />
                  <span>{t.viewCv}</span>
                </motion.a>

                <motion.a
                  href={profile.resumeUrl}
                  download
                  onMouseEnter={() => setMascotMood('happy')}
                  onMouseLeave={() => setMascotMood(null)}
                  className="p-3.5 bg-white/[0.04] border border-white/10 rounded-xl text-zinc-300 hover:text-white hover:bg-white/[0.08] hover:border-accent-web/30 transition-all duration-200 flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-web"
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                  aria-label="Download CV directly"
                  title="Download CV (PDF)"
                >
                  <Download className="w-4 h-4 text-accent-web" aria-hidden="true" />
                </motion.a>
              </div>
            </motion.div>

            {/* Credibility Stats: Verifiable metrics */}
            <motion.div
              initial={shouldReduceMotion ? false : { opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.55, ease: 'easeOut' }}
              className="grid grid-cols-3 gap-4 sm:gap-8 pt-6 border-t border-white/10 w-full max-w-lg"
            >
              <StaticStat
                display={t.stats.experience.display}
                label={t.stats.experience.label}
                icon={Code2}
              />
              <AnimatedStat
                value={t.stats.projects.value}
                suffix={t.stats.projects.suffix}
                label={t.stats.projects.label}
                icon={Briefcase}
                delay={0}
              />
              <AnimatedStat
                value={t.stats.tests.value}
                suffix={t.stats.tests.suffix}
                label={t.stats.tests.label}
                icon={CheckCircle2}
                delay={1}
              />
            </motion.div>
          </div>

          {/* Right Column: Signature Animated Mascot */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center order-1 lg:order-2">
            <div className="relative">
              {/* Decorative aura behind mascot */}
              <div
                className="absolute inset-0 -m-8 rounded-full bg-gradient-to-tr from-accent-web/15 to-accent-ai/10 blur-3xl pointer-events-none"
                aria-hidden="true"
              />

              {/* The Mascot — code-split to keep index chunk strictly within performance budget */}
              <Suspense fallback={<div className="w-[240px] h-[240px]" aria-hidden="true" />}>
                <PortfolioMascot
                  externalExpression={mascotMood}
                  onAskNara={() => window.dispatchEvent(new CustomEvent('nara:open'))}
                  size={240}
                  className="relative z-10"
                />
              </Suspense>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
